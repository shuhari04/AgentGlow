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
