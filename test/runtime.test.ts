import assert from "node:assert/strict";
import test from "node:test";
import { AgentState, Opcode } from "../src/protocol.js";
import { q6ProAnsi } from "../src/profile.js";
import { AgentGlowDaemon, mergeStates } from "../src/runtime.js";

test("active agents outrank completion while errors remain visible", () => {
  assert.equal(mergeStates([AgentState.Complete, AgentState.Thinking]), AgentState.Thinking);
  assert.equal(mergeStates([AgentState.Streaming, AgentState.Tool]), AgentState.Tool);
  assert.equal(mergeStates([AgentState.Thinking, AgentState.Error]), AgentState.Error);
});

test("empty state set is idle", () => assert.equal(mergeStates([]), AgentState.Idle));

test("test mode starts a sustained thinking animation", () => {
  const sent: Opcode[] = [];
  const transport = {
    connection: { profile: q6ProAnsi, support: "agentglow", product: "Q6 Pro" },
    send(opcode: Opcode) { sent.push(opcode); return true; },
  };
  const daemon = new AgentGlowDaemon(transport as never);
  daemon.handle({ type: "test" });
  assert.equal(sent[0], Opcode.SetState);
  assert.ok(sent.includes(Opcode.KeyEvents) === false);
  daemon.handle({ type: "restore" });
});

test("manual preview starts the selected firmware state", () => {
  const sent: Opcode[] = [];
  const transport = {
    connection: { profile: q6ProAnsi, support: "agentglow", product: "Q6 Pro" },
    send(opcode: Opcode) { sent.push(opcode); return true; },
  };
  const daemon = new AgentGlowDaemon(transport as never);
  daemon.handle({ type: "preview", state: AgentState.Error, durationMs: 250 });
  assert.equal(sent[0], Opcode.SetState);
  daemon.handle({ type: "restore" });
});

test("status retries HID connection after startup races USB enumeration", () => {
  let attempts = 0;
  const transport = {
    connection: undefined as undefined | { profile: typeof q6ProAnsi; support: "agentglow"; product: string },
    connect() {
      attempts += 1;
      this.connection = { profile: q6ProAnsi, support: "agentglow", product: "Q6 Pro" };
      return this.connection;
    },
    send() { return true; },
  };
  const writes: string[] = [];
  const socket = { write(value: string) { writes.push(value); } };
  const daemon = new AgentGlowDaemon(transport as never);
  daemon.handle({ type: "status" }, socket as never);
  assert.equal(attempts, 1);
  assert.match(writes[0], /"support":"agentglow"/);
});
