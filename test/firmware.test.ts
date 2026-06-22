import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const firmware = readFileSync(new URL("../../firmware/qmk/agentglow.c", import.meta.url), "utf8");

test("firmware includes heartbeat watchdog and restore path", () => {
  assert.match(firmware, /AG_WATCHDOG_MS 3000/);
  assert.match(firmware, /timer_elapsed32\(last_heartbeat\).*AG_WATCHDOG_MS/);
  assert.match(firmware, /agentglow_restore\(\)/);
  assert.match(firmware, /AG_COMPLETE_DURATION_MS 1600/);
  assert.match(firmware, /AG_ERROR_DURATION_MS 2200/);
});

test("firmware never writes RGB state to EEPROM", () => {
  assert.doesNotMatch(firmware, /eeconfig_update|rgb_matrix_(?:mode|sethsv|enable|disable)\(/);
  assert.match(firmware, /rgb_matrix_mode_noeeprom/);
});
