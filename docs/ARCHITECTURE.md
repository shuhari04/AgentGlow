# Architecture

## Data flow

`Codex / Claude Code -> hooks or stream wrapper -> local Unix socket -> AgentGlow daemon -> 32-byte Raw HID packets -> QMK RGB Matrix effect`

The daemon owns the HID handle and merges events from multiple clients. Hooks send lifecycle state only and exit immediately. Wrappers parse structured streams and forward text deltas while presenting normal text on stdout.

## Protocol v1

Every report is 32 bytes: magic `B0 47`, version, opcode, payload length, sequence, then up to 26 payload bytes.

| Opcode | Purpose |
|---|---|
| `01` | Hello |
| `02` | Capabilities reply |
| `03` | Agent state and HSV color |
| `04` | Up to 12 LED/intensity pairs |
| `05` | Heartbeat |
| `06` | Restore previous RGB state |
| `7F` | Acknowledgement |

The host sends semantic events, not full RGB frames. Animation and decay run on the keyboard, keeping USB traffic low.

## Privacy and failure behavior

Text is mapped directly to LED indices and discarded. No prompt, response, tool input, or environment content is logged. The firmware uses no-EEPROM RGB APIs. A missing heartbeat for three seconds restores the prior enable state, effect, HSV and brightness. Completion and error animations are time-bounded and restore the previous RGB mode after 1.6 and 2.2 seconds respectively.

## Extending

Add keyboards through the profile schema and a small QMK integration that delegates a reserved Raw HID command to `agentglow_command`. Non-Keychron firmware should call `agentglow_task()` from an existing housekeeping hook and include the custom RGB Matrix effect.
