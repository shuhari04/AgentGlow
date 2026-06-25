# AgentGlow project handoff for future agents

Last updated: 2026-06-25 13:50 Asia/Shanghai.

This document is intentionally operational and context-heavy. It records project state, hardware state, flashing history, recovery assets, and debugging lessons that are not obvious from the source code alone. Future agents should read this before changing firmware, host runtime, or the macOS app.

## Executive summary

AgentGlow is an open-source QMK keyboard lighting system for making a keyboard visually react while local agents such as Codex or Claude Code work. The MVP has three parts:

1. A Node.js + TypeScript `agentglow` CLI/background daemon.
2. A QMK Raw HID firmware module for per-key RGB events.
3. A SwiftUI macOS app named `AgentGlow Lab` for testing and managing effects.

The real test device is a Keychron Q6 Pro ANSI Knob. It has already been flashed once with AgentGlow-capable firmware and was physically validated by the user: normal typing and the rotary knob worked after flashing, and the user saw the random test animation.

The current implementation should be treated as an MVP, not a polished end-user installer. The most important safety boundary remains: do not flash new firmware unless the user explicitly confirms after a fresh preflight.

## Repository and GitHub

- Local repository: `/Users/leitong/Downloads/AgentGlow`
- GitHub repository: `https://github.com/shuhari04/AgentGlow`
- Visibility: public
- License: MIT
- Main branch: `main`
- npm package/CLI name: `agentglow`
- User-facing project name: `AgentGlow`

Recent important commits:

- `a3c2034` - `Run CLI with explicit Node path from macOS app`
- `dc55c33` - `Retry HID connection after macOS startup`
- `ca4ebb0` - `Add AgentGlow macOS control app`
- `e045072` - `Make test animation visibly sustained`
- `0a58357` - `Harden Q6 Pro pre-flash safety`
- `ca24617` - `feat: launch AgentGlow MVP`

Latest checked CI state at this handoff:

- Run `28149584028`, commit `a3c2034`, title `Run CLI with explicit Node path from macOS app`: success.
- Run `28149330304`, commit `dc55c33`, title `Retry HID connection after macOS startup`: success.

Useful command:

```bash
gh run list --repo shuhari04/AgentGlow --limit 5
```

## Hardware and firmware facts

Verified target keyboard:

- Keyboard: Keychron Q6 Pro ANSI Knob
- USB VID/PID: `3434:0660`
- Raw HID interface observed through `node-hid`:
  - vendor ID `0x3434`
  - product ID `0x0660`
  - usage page `0xff60` / decimal `65376`
  - usage `0x61` / decimal `97`
  - product string `Keychron Q6 Pro`
- AgentGlow v1 control path: USB wired Raw HID only.
- Bluetooth typing can remain available from the keyboard firmware, but AgentGlow lighting control over Bluetooth is not supported in this MVP.

QMK source used for the real build:

- Local QMK tree: `/Users/leitong/Documents/Codex/2026-06-20/wo/work/qmk_firmware`
- Upstream/fork family: Keychron `bluetooth_playground`
- Required source commit: `618127a725a1773e85f13455602cf6f72ab4de17`
- QMK version observed earlier: `0.14.29`
- MCU/bootloader family: STM32L432, `stm32-dfu`

Custom flashed firmware:

- Local binary: `/Users/leitong/Downloads/AgentGlow/build/agentglow-q6-pro-ansi-v0.1.0.bin`
- SHA256: `01046096ee76c6648bb8b33c3b445b4b5a5c592a9eb74b5b52ec6566f22538e6`
- DFU suffix: `0483:DF11`
- Flash command that was actually used successfully:

```bash
dfu-util -a 0 -d 0483:df11 -s 0x08000000:leave -D /Users/leitong/Downloads/AgentGlow/build/agentglow-q6-pro-ansi-v0.1.0.bin
```

The user explicitly confirmed flashing AgentGlow firmware after entering DFU. Flash output indicated erase/download success and a leave request. After flashing, the keyboard re-enumerated as the Keychron Q6 Pro.

Post-flash physical validation already done by user:

- Typing worked.
- Rotary knob worked.
- Random AgentGlow animation was eventually visible after a sustained test was sent.

Do not infer from this that all Bluetooth behavior, all RGB modes, sleep/wake, or every VIA feature has been exhaustively retested. The preflight audit describes preserved compiled subsystems, but physical behavior still needs explicit validation if firmware changes again.

## Recovery assets

Recovery bundle:

- Directory: `/Users/leitong/Downloads/AgentGlow-Recovery-Q6-Pro-20260622`

Files currently present:

- `README.md`
- `SHA256SUMS`
- `q6_pro_ansi_encoder_official_v1.0.2.bin`
- `q6_pro_ansi_knob_via_json.zip`
- `via-config-backup-20260622.json`
- `via-definition/q6_pro_ansi_encoder.json`
- `via_backup_tool.py`

Important hashes:

```text
3e011999059e71758e3f7a304e1d9d3bcce796eb41ec37263f59550c93ed9cc4  q6_pro_ansi_encoder_official_v1.0.2.bin
0c6ba5111e45a1928e1bc0c32916620620b8722bafce7db8cbd555516e055b64  q6_pro_ansi_knob_via_json.zip
e2d5aeef24217b3514f477964d45fffdde89c2d1638a6301f1d55ea495eda253  via-config-backup-20260622.json
61e062dd26249f21097beb7d50ccc7f19a697dbfa154646fc725713eb4c09310  via-definition/q6_pro_ansi_encoder.json
de000f67fbda043594492e61862465d7731ea121faf9003f8153aef1f0b5e20e  via_backup_tool.py
```

If a future agent needs to recover the keyboard, do not improvise. Read the recovery bundle README first, verify hashes, use the official binary, and keep a second input device available. The STM32 ROM DFU path should remain available when only the application firmware is flashed, but physical flashing is still risky.

Known restore tool note:

- The VIA backup/restore workflow previously required Python from:
  `/Users/leitong/Documents/Codex/2026-06-20/wo/work/via-hid/.venv/bin/python`

VIA post-flash readback history:

- Keymap, macros, encoder, and layout matched the pre-flash backup.
- RGB settings initially changed to defaults after flashing, then were restored from backup.
- One brightness readback differed by `159 -> 158`, likely VIA/QMK quantization; effect/color/speed matched.

## Current local runtime state snapshot

This is a snapshot from 2026-06-25 around 13:50 Asia/Shanghai. Re-check before acting.

At the time this document was written:

```bash
agentglow status
```

returned:

```text
AgentGlow daemon is stopped; no supported USB keyboard found.
```

This does not necessarily mean the firmware or keyboard is broken. It means the daemon was not running or reachable at that moment. Earlier in the same session, after restarting the daemon, status returned:

```json
{
  "running": true,
  "device": "Keychron Q6 Pro",
  "support": "agentglow",
  "state": 0
}
```

If the user wants to resume testing, the safe first commands are:

```bash
cd /Users/leitong/Downloads/AgentGlow
agentglow start
sleep 2
agentglow status
agentglow test
```

Do not flash anything to fix an App/daemon detection issue unless there is direct evidence the firmware is gone or corrupted.

Current launchd plist, when installed:

- Path: `/Users/leitong/Library/LaunchAgents/io.agentglow.daemon.plist`
- Label: `io.agentglow.daemon`
- Program arguments at last inspection:

```text
/opt/homebrew/Cellar/node@22/22.23.0/bin/node
/Users/leitong/.agentglow/app/dist/src/cli.js
daemon
```

Daemon logs:

- stdout: `/Users/leitong/.agentglow/daemon.log`
- stderr: `/Users/leitong/.agentglow/daemon-error.log`

The installed runtime copy used by launchd is not the repo source directly. The install/start path deploys a copy to:

- `/Users/leitong/.agentglow/app`

If you change CLI/daemon code and need the running service to use it, rebuild/install and restart:

```bash
cd /Users/leitong/Downloads/AgentGlow
npm run check
npm install -g .
agentglow stop || true
sleep 1
agentglow start
sleep 2
agentglow status
```

## macOS App state and lessons

Local App bundle:

- `/Users/leitong/Downloads/AgentGlow/build/AgentGlow Lab.app`

Build command:

```bash
cd /Users/leitong/Downloads/AgentGlow
./scripts/build-macos-app.sh
open "/Users/leitong/Downloads/AgentGlow/build/AgentGlow Lab.app"
```

The app is a SwiftPM SwiftUI app under:

- `apps/AgentGlowMac/Package.swift`
- `apps/AgentGlowMac/Sources/AgentGlowMac/AgentGlowMacApp.swift`
- `apps/AgentGlowMac/Sources/AgentGlowMac/AgentGlowController.swift`
- `apps/AgentGlowMac/Sources/AgentGlowMac/ContentView.swift`
- `apps/AgentGlowMac/Resources/Info.plist`

It does not talk to HID directly. It invokes the `agentglow` CLI/daemon. This was intentional to avoid HID ownership conflicts and to reuse daemon protocol behavior.

Important app bug already fixed:

- Screenshot showed the bottom status line: `env: node: No such file or directory`.
- Root cause: the App executed `/opt/homebrew/bin/agentglow`, whose shebang uses `/usr/bin/env node`. GUI macOS apps have a short PATH and may not see Homebrew Node.
- Fix in commit `a3c2034`: App now resolves Node explicitly and runs the CLI JS file directly when possible.
- Preferred Node paths used by the app:
  - `/opt/homebrew/opt/node@22/bin/node`
  - `/opt/homebrew/bin/node`
  - `/usr/local/bin/node`
- Preferred CLI JS paths used by the app:
  - `~/.agentglow/app/dist/src/cli.js`
  - `/opt/homebrew/lib/node_modules/agentglow/dist/src/cli.js`
  - `/usr/local/lib/node_modules/agentglow/dist/src/cli.js`
- The app still has a shim fallback to `/opt/homebrew/bin/agentglow` or `/usr/local/bin/agentglow`.

If the app says "未检测到设备", inspect the bottom message first. The message is often more diagnostic than the large status title:

- `env: node: No such file or directory`: App PATH / Node resolution bug or stale app bundle.
- `AgentGlow daemon is stopped; no supported USB keyboard found.`: daemon not running or no matching HID found.
- `Keyboard supports VIA but does not have the AgentGlow firmware protocol.`: stock VIA firmware or wrong firmware.
- `AgentGlow firmware protocol is unavailable.`: Raw HID is visible but AgentGlow handshake failed.

If the UI still looks stale after rebuilding, close all `AgentGlowMac` processes and open the rebuilt bundle:

```bash
pkill -x AgentGlowMac || true
open "/Users/leitong/Downloads/AgentGlow/build/AgentGlow Lab.app"
```

## Daemon reconnect lesson

Important daemon bug already fixed:

- After a Mac reboot, the App showed no device even while the keyboard was wired.
- `node-hid` could see the Q6 Pro Raw HID interface, but the daemon had started earlier and did not reconnect.
- Root cause: launchd can start `agentglow daemon` before USB HID enumeration is stable; the old daemon only attempted connection at startup.
- Fix in commit `dc55c33`: daemon now retries HID connection when:
  - handling `status`, `test`, `preview`, or `text`
  - heartbeat send fails
- A regression test was added: `status retries HID connection after startup races USB enumeration`.

If this class of issue appears again, first run:

```bash
cd /Users/leitong/Downloads/AgentGlow
node - <<'NODE'
const hid = require('node-hid');
for (const d of hid.devices()) {
  const text = `${d.vendorId?.toString(16)}:${d.productId?.toString(16)} ${d.manufacturer || ''} ${d.product || ''} usagePage=${d.usagePage} usage=${d.usage} interface=${d.interface} path=${d.path}`;
  if (/keychron|q6|agentglow/i.test(text) || d.vendorId === 0x3434 || d.productId === 0x0660 || d.usagePage === 0xff60 || d.usagePage === 0xff00) console.log(text);
}
NODE
```

Expected AgentGlow Raw HID line includes:

```text
3434:660 Keychron Keychron Q6 Pro usagePage=65376 usage=97 interface=1 ...
```

Then test daemon:

```bash
agentglow stop || true
sleep 1
agentglow start
sleep 2
agentglow status
```

## Host runtime overview

Main TypeScript files:

- `src/cli.ts` - command dispatcher.
- `src/runtime.ts` - daemon, Unix socket protocol, state merge, heartbeat, reconnect, random/text playback scheduling.
- `src/transport.ts` - `node-hid` Raw HID transport and AgentGlow/VIA support detection.
- `src/protocol.ts` - 32-byte HID packet encode/decode and opcodes.
- `src/profile.ts` - profile loading and text-to-key mapping.
- `src/events.ts` - maps Codex/Claude hook events into AgentGlow states.
- `src/install.ts` - deploys runtime copy, launchd plist, Codex/Claude hooks.
- `src/wrappers.ts` - precise text-following wrappers for Codex/Claude JSON streams.

CLI commands expected in the MVP:

```text
agentglow start
agentglow stop
agentglow status
agentglow test
agentglow restore
agentglow preview <thinking|tool|streaming|complete|error> [milliseconds]
agentglow text <characters>
agentglow install-hooks
agentglow codex -- <codex exec arguments>
agentglow claude -- <claude print arguments>
```

Socket/runtime:

- Runtime directory: `~/.agentglow`
- Socket path: `~/.agentglow/agentglow.sock`
- PID path: `~/.agentglow/agentglow.pid`
- Daemon state is in memory only.
- Text sent through `agentglow text`, wrappers, or hooks is transformed in memory into LED events. It should not be logged or persisted.

Privacy expectation:

- Do not add logging of prompts, code, Claude output, Codex output, or hook payloads.
- If debugging payload parsing, log only structural metadata or synthetic fixtures.

## QMK protocol and firmware overview

Protocol intent:

- Fixed-size 32-byte Raw HID packets.
- Magic bytes identify AgentGlow packets so unrelated VIA/Keychron packets remain routed to existing handlers.
- Supports capability/hello, agent state, key events, heartbeat, restore, and acknowledgements.

Firmware behavior intent:

- Random typing sparks during Thinking and Tool states.
- Character-following per-key events from host.
- Key decay.
- Completion wave.
- Error flash.
- Heartbeat timeout restores original RGB behavior.
- No EEPROM writes for AgentGlow runtime lighting.

Important safety point:

- The custom firmware replaces the full application firmware image on the keyboard's main controller. It does not merely install a plugin into the existing firmware.
- This is why recovery binary and VIA backup exist.
- It should not replace STM32 ROM DFU bootloader, but a bad application image can make the normal keyboard app unusable until recovered through DFU.

## Build and verification commands

Host build/test:

```bash
cd /Users/leitong/Downloads/AgentGlow
npm run check
```

macOS app build:

```bash
cd /Users/leitong/Downloads/AgentGlow
./scripts/build-macos-app.sh
codesign --verify --deep --strict --verbose=2 "/Users/leitong/Downloads/AgentGlow/build/AgentGlow Lab.app"
```

Q6 Pro firmware build:

```bash
cd /Users/leitong/Downloads/AgentGlow
QMK_HOME="/Users/leitong/Documents/Codex/2026-06-20/wo/work/qmk_firmware" ./scripts/build-q6-pro.sh
shasum -a 256 build/agentglow-q6-pro-ansi-v0.1.0.bin
```

Do not run `dfu-util` unless the user explicitly asks to flash and confirms after preflight.

## Flashing and recovery procedure notes

The user previously followed a staged process:

1. Prepare recovery firmware and VIA config backup.
2. Perform preflight audit.
3. User enters DFU.
4. User explicitly confirms flashing AgentGlow firmware.
5. Agent runs the `dfu-util` command.
6. User validates typing and knob.
7. Agent validates CLI/daemon handshake.
8. User confirms visible test animation.

Follow the same pattern for any future firmware flash. Do not compress these steps.

Minimum preflight before any future flash:

- Confirm exact keyboard model and VID/PID again.
- Confirm recovery bundle still exists and hashes match.
- Confirm user has another input device available.
- Confirm QMK source commit is still the pinned expected commit unless deliberately updating.
- Confirm build script passes.
- Confirm output binary hash and DFU suffix.
- Stop AgentGlow daemon before DFU.
- Ask the user for explicit confirmation immediately before `dfu-util`.

## Known user expectations and collaboration style

The user prefers direct execution with concrete verification, but for firmware and other risky operations wants staged safety checks and explicit confirmation before irreversible steps.

Do:

- Be explicit about whether a change touches host software only, App only, or keyboard firmware.
- For device issues, prove whether macOS sees USB/HID before blaming firmware.
- Preserve recovery path and current working state.
- If editing code, run relevant tests and report exact result.
- If pushing to GitHub, check CI status.

Do not:

- Flash firmware without fresh confirmation.
- Treat Bluetooth AgentGlow control as supported in v1.
- Claim full hardware validation from compile success alone.
- Overwrite VIA config or recovery files.
- Log user prompts/agent outputs for convenience.

## Current practical troubleshooting tree

When App says no device:

1. Read the App footer message.
2. Run `agentglow status`.
3. If daemon stopped:

   ```bash
   agentglow start
   sleep 2
   agentglow status
   ```

4. If daemon running but no device, list HID devices with the `node-hid` snippet above.
5. If Raw HID line exists but daemon does not connect, restart daemon and check `~/.agentglow/daemon-error.log`.
6. If Raw HID line does not exist:
   - confirm USB cable is data-capable,
   - try another USB port/hub,
   - confirm keyboard is not in Bluetooth-only or weird mode,
   - check macOS USB/HID enumeration.
7. If VIA-only is detected, the keyboard is likely running stock VIA firmware or wrong firmware.
8. Only consider firmware recovery if input/knob/VIA behavior suggests firmware state actually changed or got corrupted.

When random test is not visible:

- Remember early `agentglow test` was too brief; it was later changed to sustained 5-second Thinking animation.
- Use:

  ```bash
  agentglow test
  ```

- Or from App, use "随机测试".
- If base RGB brightness is low or effect is subtle, use preview states or text playback.

When App shows `env: node`:

- User is running an old app bundle or an unpatched build.
- Rebuild:

  ```bash
  cd /Users/leitong/Downloads/AgentGlow
  ./scripts/build-macos-app.sh
  pkill -x AgentGlowMac || true
  open "/Users/leitong/Downloads/AgentGlow/build/AgentGlow Lab.app"
  ```

## Near-term technical debt

Potential improvements not yet done:

- Package a proper signed/notarized macOS app installer.
- Add "install/update runtime" action in the App so users do not need npm commands.
- Display the exact CLI path and Node path in the App diagnostics panel.
- Add App-side diagnostics for daemon stopped vs CLI missing vs Raw HID missing.
- Support direct HID from App only if HID ownership and daemon conflicts are designed carefully.
- Add multiple keyboard profiles and a profile editor.
- Expand protocol to allow per-key color, not only host-selected state color plus key events.
- Add more robust reconnect/backoff and better daemon logging that still preserves privacy.
- Add Windows/Linux host support only after real testing.

## Final warning for future agents

AgentGlow is currently installed on a real keyboard that the user actively uses. A host/App bug can be fixed with code and service restarts. A firmware bug may require DFU recovery. Keep that distinction clear in every response and every action.
