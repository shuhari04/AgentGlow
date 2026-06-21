# Firmware build, flashing, and recovery

AgentGlow does not flash devices. The build script only creates a binary.

For the Q6 Pro, use the Keychron `bluetooth_playground` branch and confirm the physical model is ANSI Knob with USB PID `0660`. Do not use this binary for ISO, non-knob, Q6, Q6 Max, or other revisions.

Before any manual flash:

1. Export the current VIA layout and obtain the matching official Keychron recovery firmware.
2. Confirm the keyboard works over USB and record VID/PID.
3. Keep another keyboard available.
4. Enter DFU using Keychron's documented procedure and verify the detected MCU before writing.
5. After flashing, run `agentglow status`, then `agentglow test`.

Recovery uses the matching official Keychron firmware and DFU procedure. AgentGlow's watchdog restores RGB configuration during runtime; it cannot recover an interrupted or incorrect firmware flash.
