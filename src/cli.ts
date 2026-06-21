#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { AgentGlowDaemon, sendMessage } from "./runtime.js";
import { AgentState } from "./protocol.js";
import { installHooks, installLaunchAgent, stopLaunchAgent } from "./install.js";
import { runClaude, runCodex } from "./wrappers.js";
import { stateForHook } from "./events.js";
import { KeyboardTransport } from "./transport.js";

const [command = "help", ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  switch (command) {
    case "daemon": {
      const daemon = new AgentGlowDaemon(); await daemon.start();
      const stop = async () => { await daemon.stop(); process.exit(0); };
      process.on("SIGTERM", stop); process.on("SIGINT", stop); return;
    }
    case "start": installLaunchAgent(process.argv[1]); await sleep(400); console.log("AgentGlow background service started."); return;
    case "stop": await sendMessage({ type: "restore" }).catch(() => undefined); stopLaunchAgent(); console.log("AgentGlow stopped and requested lighting restore."); return;
    case "status": {
      try {
        const status = await sendMessage({ type: "status" }, true);
        console.log(JSON.stringify(status, null, 2));
      } catch {
        const transport = new KeyboardTransport(); const connection = transport.connect(); transport.close();
        console.log(connection ? `${connection.product}: ${supportMessage(connection.support)}` : "AgentGlow daemon is stopped; no supported USB keyboard found.");
      } return;
    }
    case "test": {
      const status = await sendMessage({ type: "status" }, true).catch(() => undefined);
      if (!status) throw new Error("AgentGlow daemon is not running. Run: agentglow start");
      if (status.support !== "agentglow") throw new Error(status.support === "via-only" ? "Keyboard supports VIA but does not have the AgentGlow firmware protocol." : "AgentGlow firmware protocol is unavailable.");
      await sendMessage({ type: "test" }); console.log("Test animation sent."); return;
    }
    case "install-hooks": {
      const paths = installHooks(process.argv[1]); console.log(`Hooks installed without replacing existing entries:\n${paths.join("\n")}`); return;
    }
    case "event": {
      const [source, event] = args as ["codex" | "claude", string];
      const input = readFileSync(0, "utf8"); let payload: unknown = {};
      try { payload = input ? JSON.parse(input) : {}; } catch { /* Never persist or echo hook payloads. */ }
      await sendMessage({ type: "event", source, state: stateForHook(event ?? "start", payload) }).catch(() => undefined); return;
    }
    case "codex": process.exitCode = await runCodex(args); return;
    case "claude": process.exitCode = await runClaude(args); return;
    case "restore": await sendMessage({ type: "restore" }); console.log("Restore requested."); return;
    default: console.log(help()); return;
  }
}

function supportMessage(support: string): string {
  if (support === "agentglow") return "AgentGlow protocol ready";
  if (support === "via-only") return "VIA detected, AgentGlow firmware not installed";
  return "Raw HID found, AgentGlow protocol unavailable";
}
function sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
function help(): string { return `AgentGlow 0.1.0\n\nCommands:\n  start | stop | status | test | restore\n  install-hooks\n  codex -- <codex exec arguments>\n  claude -- <claude print arguments>`; }

main().catch((error) => { console.error(`agentglow: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
