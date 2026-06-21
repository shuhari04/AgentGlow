import assert from "node:assert/strict";
import test from "node:test";
import { mapText, q6ProAnsi } from "../src/profile.js";

test("maps lower, upper and shifted characters to the same physical keys", () => {
  assert.deepEqual(mapText(q6ProAnsi, "aA!"), [63, 63, 21]);
});

test("maps code punctuation and whitespace", () => {
  assert.deepEqual(mapText(q6ProAnsi, "{}\n "), [52, 53, 74, 98]);
});

test("unknown unicode uses a visible fallback without retaining text", () => {
  assert.deepEqual(mapText(q6ProAnsi, "中"), [98]);
});
