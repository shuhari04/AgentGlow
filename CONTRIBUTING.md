# Contributing

1. Open an issue describing the keyboard or agent integration.
2. Run `npm ci && npm run check` before submitting a pull request.
3. For a keyboard profile, include VID/PID, Raw HID usage page/usage, LED count, character map, and evidence from the keyboard's QMK source.
4. Firmware changes must use `*_noeeprom` APIs, implement the three-second watchdog, and restore the previous RGB state.
5. Never log prompts, generated text, tool arguments, environment variables, or HID event content.

QMK-derived integration patches remain subject to the upstream QMK/keyboard source license. AgentGlow's original host and module code is MIT licensed.
