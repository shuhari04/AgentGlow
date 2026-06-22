# Q6 Pro pre-flash audit

This audit applies only to the Keychron Q6 Pro ANSI Knob with USB ID `3434:0660` and the tested Keychron source commit `618127a725a1773e85f13455602cf6f72ab4de17`.

## Preserved functions

Clean baseline and AgentGlow builds contain the same Q6 Pro Bluetooth task, VIA command handler, dynamic keymap, encoder map, RGB Matrix task and STM32 DFU bootloader entry points. AgentGlow is added to the existing VIA keymap build; it does not remove those subsystems or write Bluetooth module firmware.

- VIA keymap, macros and encoder storage keep the stock layout and layer count.
- Mac/Windows mode switching remains the stock Keychron implementation.
- Bluetooth, battery reporting, sleep, RGB Matrix, knob and wired USB remain compiled in.
- AgentGlow RGB changes use no-EEPROM APIs. The prior enable state, effect, hue, saturation and brightness are restored after a lost heartbeat or a finite completion/error animation.
- AgentGlow Raw HID packets require the two-byte magic value `B0 47`; unrelated VIA and Keychron commands continue to their original handlers.

## Binary comparison

The clean local builds produced these allocated sections:

| Section | Stock VIA build | VIA + AgentGlow | Delta |
| --- | ---: | ---: | ---: |
| `.text` | 57,290 | 58,298 | +1,008 |
| `.data` | 1,080 | 1,084 | +4 |
| `.bss` | 22,832 | 22,968 | +136 |
| reserved heap | 38,552 | 38,408 | -144 |
| main/process stack | 1,024 / 2,048 | 1,024 / 2,048 | 0 |

The linker completed without overflow. The build script refuses a different source commit or target identity by default and validates the DFU suffix when the utility is available.

## Residual risk

Compilation and symbol comparison cannot prove physical behavior. This exact custom binary must still be tested on the real keyboard for Bluetooth pairing/reconnect, sleep/wake, battery indication, knob direction, Mac/Windows switching, VIA remapping and every RGB mode. A power loss or cable disconnect during flashing can leave the application unusable, but the STM32 ROM DFU recovery path should remain available because application flashing does not replace the ROM bootloader.

Keep the matching official recovery binary and VIA backup available on another input device before flashing. Stop the AgentGlow daemon during DFU and perform the first validation over USB before testing Bluetooth.
