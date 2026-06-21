import assert from "node:assert/strict";
import test from "node:test";
import { KeyboardTransport, type HidHandle } from "../src/transport.js";
import { encodePacket, Opcode } from "../src/protocol.js";

class FakeHid implements HidHandle {
  writes: number[][] = [];
  constructor(private readonly replies: number[][]) {}
  write(data: number[]): number { this.writes.push(data); return data.length; }
  readTimeout(): number[] { return this.replies.shift() ?? []; }
  close(): void {}
}

const device = { vendorId: 0x3434, productId: 0x0660, path: "fake", usagePage: 0xff60, usage: 0x61, product: "Q6 Pro", release: 1, interface: 1 };

test("detects AgentGlow-capable firmware", () => {
  const fake = new FakeHid([[...encodePacket(Opcode.Capabilities, Uint8Array.of(108))]]);
  const transport = new KeyboardTransport(() => [device], () => fake);
  assert.equal(transport.connect()?.support, "agentglow");
});

test("distinguishes stock VIA firmware from AgentGlow", () => {
  const viaReply = Array(32).fill(0); viaReply[0] = 1; viaReply[2] = 12;
  const fake = new FakeHid([[], viaReply]);
  const transport = new KeyboardTransport(() => [device], () => fake);
  assert.equal(transport.connect()?.support, "via-only");
});
