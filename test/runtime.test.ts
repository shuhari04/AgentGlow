import assert from "node:assert/strict";
import test from "node:test";
import { AgentState } from "../src/protocol.js";
import { mergeStates } from "../src/runtime.js";

test("active agents outrank completion while errors remain visible", () => {
  assert.equal(mergeStates([AgentState.Complete, AgentState.Thinking]), AgentState.Thinking);
  assert.equal(mergeStates([AgentState.Streaming, AgentState.Tool]), AgentState.Tool);
  assert.equal(mergeStates([AgentState.Thinking, AgentState.Error]), AgentState.Error);
});

test("empty state set is idle", () => assert.equal(mergeStates([]), AgentState.Idle));
