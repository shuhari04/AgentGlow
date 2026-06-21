# Compatibility

| Target | Status | Notes |
|---|---|---|
| macOS 27 / Apple Silicon | Verified | Node host, launchd, Raw HID |
| Keychron Q6 Pro ANSI Knob | Host and firmware build verified | VID `3434`, PID `0660`, 108 LEDs |
| Codex CLI | Verified interface | Hooks for lifecycle; `codex exec --json` wrapper for output |
| Claude Code | Verified interface | Hooks for lifecycle; partial `stream-json` wrapper for output |
| Windows / Linux | Architecture-ready | No v0.1 support claim or service installer |
| Stock VIA firmware | Detection only | Global VIA RGB controls do not provide arbitrary per-key streaming |

A compatible keyboard needs QMK RGB Matrix, a Raw HID interface, an LED-index profile, and the AgentGlow firmware module. Underglow-only boards can implement states but cannot reproduce per-key typing.
