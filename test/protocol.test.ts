import assert from "node:assert/strict";
import test from "node:test";
import { AgentState, decodePacket, encodeKeyEvents, encodePacket, encodeState, Opcode } from "../src/protocol.js";

test("packet round trip preserves opcode, sequence and payload", () => {
  const encoded = encodePacket(Opcode.SetState, encodeState(AgentState.Tool, 20, 30, 40), 9);
  assert.equal(encoded.length, 32);
  const decoded = decodePacket(encoded);
  assert.equal(decoded.opcode, Opcode.SetState);
  assert.equal(decoded.sequence, 9);
  assert.deepEqual([...decoded.payload], [AgentState.Tool, 20, 30, 40]);
});

test("key event packets are bounded to twelve events", () => {
  const payload = encodeKeyEvents(Array.from({ length: 20 }, (_, led) => ({ led })));
  assert.equal(payload[0], 12);
  assert.equal(payload.length, 25);
});

test("oversized payloads are rejected", () => assert.throws(() => encodePacket(Opcode.KeyEvents, new Uint8Array(27))));
