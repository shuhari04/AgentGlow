# AgentGlow

Agent-aware RGB animations for QMK keyboards. AgentGlow makes a keyboard appear to type while Codex or Claude Code is working, and can replay streamed output as per-key light events.

> Status: v0.1 MVP. macOS and Keychron Q6 Pro ANSI Knob are the verified targets. The generated firmware is **not flashed automatically**.

## What it does

- Random key sparks during thinking and tool execution.
- Character-to-key lighting for streamed agent output.
- Green completion wave and red error signal.
- Local-only processing: prompts and output are never persisted.
- Restores the previous RGB mode after stop or a three-second heartbeat timeout.
- Detects stock VIA firmware and clearly reports that AgentGlow firmware is missing.

## Install the host

Requirements: macOS, Node.js 20+, a wired QMK keyboard, Codex and/or Claude Code.

```bash
git clone https://github.com/shuhari04/AgentGlow.git
cd AgentGlow
npm ci
npm run check
npm link
agentglow install-hooks
agentglow start
agentglow status
```

Codex requires review of newly installed command hooks. Open `/hooks` in Codex and trust the AgentGlow entries. Existing hook/settings entries are preserved.

Normal interactive sessions use hooks for state animations. Exact output replay uses wrappers:

```bash
agentglow codex -- "Implement the requested feature"
agentglow claude -- "Explain this repository"
```

Useful commands:

```bash
agentglow test       # only succeeds with AgentGlow firmware
agentglow restore    # restore the pre-AgentGlow RGB state
agentglow stop
```

## Build Q6 Pro firmware

Set up the Keychron `bluetooth_playground` QMK fork first, then run:

```bash
./scripts/build-q6-pro.sh
```

Output: `build/agentglow-q6-pro-ansi-v0.1.0.bin`. The script checks that target QMK files are clean, applies the overlay, builds, copies the binary, and restores the QMK checkout. It never invokes a flasher.

Read [firmware and recovery guidance](docs/FIRMWARE.md) before flashing anything.
Also review the [Q6 Pro pre-flash audit](docs/PREFLIGHT-AUDIT.md) for the verified scope and remaining runtime risks.

## Architecture and compatibility

- [Architecture](docs/ARCHITECTURE.md)
- [Compatibility](docs/COMPATIBILITY.md)
- [Firmware and recovery](docs/FIRMWARE.md)
- [Q6 Pro pre-flash audit](docs/PREFLIGHT-AUDIT.md)
- [Contributing](CONTRIBUTING.md)

## 中文说明

AgentGlow 是一个面向 QMK RGB 键盘的开源 Agent 灯效系统。Codex 或 Claude Code 工作时，键盘会随机亮起按键；通过包装命令运行时，还会按照 Agent 流式输出的字符点亮对应按键。

首版真机目标为 macOS 和 Keychron Q6 Pro ANSI Knob。电脑端可直接安装，但逐键灯效需要编译并刷入 AgentGlow 固件。本仓库只自动编译，**绝不会自动刷写键盘**。

普通 Codex/Claude 会话通过 Hooks 显示工作状态；逐字模式使用：

```bash
agentglow codex -- "你的任务"
agentglow claude -- "你的任务"
```

所有输出只在内存中转换为灯光事件，不写入日志或磁盘。固件失去心跳三秒后会恢复原灯效。

## License

AgentGlow original code is available under the [MIT License](LICENSE). QMK and vendor firmware sources retain their upstream licenses.
