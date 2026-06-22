import SwiftUI

struct ContentView: View {
    @StateObject private var controller = AgentGlowController()

    private let columns = [GridItem(.adaptive(minimum: 180), spacing: 12)]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.07, blue: 0.11), Color(red: 0.09, green: 0.12, blue: 0.18)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ).ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    statusCard
                    effectSection
                    textSection
                    footer
                }
                .padding(28)
            }
        }
        .task { await controller.refresh() }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text("AgentGlow Lab")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                Text("QMK 键盘灯效测试与管理")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if controller.isBusy { ProgressView().controlSize(.small) }
            Button { Task { await controller.refresh() } } label: {
                Label("刷新", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Circle()
                    .fill(controller.isReady ? Color.green : Color.orange)
                    .frame(width: 10, height: 10)
                Text(controller.isReady ? "AgentGlow 已就绪" : "需要检查连接")
                    .font(.headline)
                Spacer()
                Text(controller.status?.device ?? "未检测到设备")
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 10) {
                Button("启动服务") { Task { await controller.start() } }
                    .buttonStyle(.borderedProminent)
                Button("停止服务") { Task { await controller.stop() } }
                    .buttonStyle(.bordered)
                Button("恢复原灯效") { Task { await controller.restore() } }
                    .buttonStyle(.bordered)
                Button("随机测试") { Task { await controller.testRandom() } }
                    .buttonStyle(.bordered)
                    .disabled(!controller.isReady)
            }
        }
        .panelStyle()
    }

    private var effectSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("状态灯效")
                    .font(.title3.bold())
                Spacer()
                Text("持续 \(Int(controller.previewDuration)) 秒")
                    .foregroundStyle(.secondary)
                Slider(value: $controller.previewDuration, in: 1...15, step: 1)
                    .frame(width: 150)
            }
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(EffectPreview.allCases) { effect in
                    Button { Task { await controller.preview(effect) } } label: {
                        HStack(spacing: 12) {
                            Image(systemName: effect.symbol)
                                .font(.title2)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(effect.title).font(.headline)
                                Text(effect.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.08)))
                    .disabled(!controller.isReady)
                }
            }
        }
    }

    private var textSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("逐字符测试")
                .font(.title3.bold())
            HStack {
                TextField("输入要映射到键盘的文字或代码", text: $controller.sampleText)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { Task { await controller.playText() } }
                Button("播放") { Task { await controller.playText() } }
                    .buttonStyle(.borderedProminent)
                    .disabled(!controller.isReady || controller.sampleText.isEmpty)
            }
            Text("内容只在内存中转换成按键事件，不写入 AgentGlow 日志。")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .panelStyle()
    }

    private var footer: some View {
        HStack {
            Image(systemName: "info.circle")
            Text(controller.message)
            Spacer()
            Text("USB Raw HID")
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(.secondary)
    }
}

private extension View {
    func panelStyle() -> some View {
        padding(18)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
    }
}
