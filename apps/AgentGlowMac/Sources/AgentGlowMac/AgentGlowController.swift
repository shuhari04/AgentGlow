import Foundation

struct AgentGlowStatus: Decodable {
    let running: Bool
    let device: String?
    let support: String?
    let state: Int
}

enum EffectPreview: String, CaseIterable, Identifiable {
    case thinking, tool, streaming, complete, error

    var id: String { rawValue }
    var title: String {
        switch self {
        case .thinking: "思考"
        case .tool: "工具调用"
        case .streaming: "流式输出"
        case .complete: "完成"
        case .error: "错误"
        }
    }
    var detail: String {
        switch self {
        case .thinking: "随机按键，较慢"
        case .tool: "随机按键，较快"
        case .streaming: "等待逐键事件"
        case .complete: "绿色完成波纹"
        case .error: "红色错误闪烁"
        }
    }
    var symbol: String {
        switch self {
        case .thinking: "brain.head.profile"
        case .tool: "hammer"
        case .streaming: "text.cursor"
        case .complete: "checkmark.circle"
        case .error: "exclamationmark.triangle"
        }
    }
}

@MainActor
final class AgentGlowController: ObservableObject {
    @Published var status: AgentGlowStatus?
    @Published var isBusy = false
    @Published var message = "正在读取 AgentGlow 状态…"
    @Published var sampleText = "AgentGlow is testing code();"
    @Published var previewDuration = 5.0

    var isReady: Bool { status?.running == true && status?.support == "agentglow" }

    func refresh() async {
        await perform("状态已刷新") {
            let output = try await AgentGlowCommand.run(["status"])
            guard let data = output.data(using: .utf8),
                  let decoded = try? JSONDecoder().decode(AgentGlowStatus.self, from: data) else {
                self.status = nil
                throw AgentGlowCommandError.failed(output.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            self.status = decoded
        }
    }

    func start() async {
        await perform("后台服务已启动") { _ = try await AgentGlowCommand.run(["start"]) }
        await refresh()
    }

    func stop() async {
        await perform("后台服务已停止，原灯效已恢复") { _ = try await AgentGlowCommand.run(["stop"]) }
        status = nil
    }

    func restore() async {
        await perform("已请求恢复原灯效") { _ = try await AgentGlowCommand.run(["restore"]) }
        await refresh()
    }

    func testRandom() async {
        await perform("随机测试运行 5 秒后自动恢复") { _ = try await AgentGlowCommand.run(["test"]) }
    }

    func preview(_ effect: EffectPreview) async {
        let milliseconds = Int(previewDuration * 1000)
        await perform("正在预览「\(effect.title)」") {
            _ = try await AgentGlowCommand.run(["preview", effect.rawValue, String(milliseconds)])
        }
    }

    func playText() async {
        guard !sampleText.isEmpty else { return }
        await perform("正在按字符映射点亮按键") {
            _ = try await AgentGlowCommand.run(["text", sampleText])
        }
    }

    private func perform(_ success: String, operation: () async throws -> Void) async {
        isBusy = true
        defer { isBusy = false }
        do {
            try await operation()
            message = success
        } catch {
            message = error.localizedDescription
        }
    }
}

enum AgentGlowCommandError: LocalizedError {
    case missingCLI
    case failed(String)

    var errorDescription: String? {
        switch self {
        case .missingCLI: "找不到 agentglow CLI 或 Node.js，请先运行 npm install -g ."
        case .failed(let output): output.isEmpty ? "AgentGlow 命令执行失败" : output
        }
    }
}

enum AgentGlowCommand {
    static func run(_ arguments: [String]) async throws -> String {
        try await Task.detached(priority: .userInitiated) {
            let command = try resolveCommand(arguments)
            let process = Process()
            let output = Pipe()
            process.executableURL = URL(fileURLWithPath: command.executable)
            process.arguments = command.arguments
            process.environment = [
                "PATH": "/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
                "HOME": NSHomeDirectory()
            ]
            process.standardOutput = output
            process.standardError = output
            try process.run()
            process.waitUntilExit()
            let data = output.fileHandleForReading.readDataToEndOfFile()
            let text = String(decoding: data, as: UTF8.self)
            guard process.terminationStatus == 0 else {
                throw AgentGlowCommandError.failed(text.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            return text
        }.value
    }

    private static func resolveCommand(_ arguments: [String]) throws -> (executable: String, arguments: [String]) {
        let fileManager = FileManager.default
        let home = NSHomeDirectory()
        let nodeCandidates = [
            "/opt/homebrew/opt/node@22/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node"
        ]
        let cliCandidates = [
            "\(home)/.agentglow/app/dist/src/cli.js",
            "/opt/homebrew/lib/node_modules/agentglow/dist/src/cli.js",
            "/usr/local/lib/node_modules/agentglow/dist/src/cli.js"
        ]
        if let node = nodeCandidates.first(where: { fileManager.isExecutableFile(atPath: $0) }),
           let cli = cliCandidates.first(where: { fileManager.isReadableFile(atPath: $0) }) {
            return (node, [cli] + arguments)
        }

        let shimCandidates = ["/opt/homebrew/bin/agentglow", "/usr/local/bin/agentglow"]
        if let shim = shimCandidates.first(where: { fileManager.isExecutableFile(atPath: $0) }) {
            return (shim, arguments)
        }

        throw AgentGlowCommandError.missingCLI
    }
}
