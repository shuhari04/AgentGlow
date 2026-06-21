import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { AgentState, encodeKeyEvents, encodeState, Opcode } from "./protocol.js";
import { mapText } from "./profile.js";
import { KeyboardTransport } from "./transport.js";

export const runtimeDir = join(homedir(), ".agentglow");
export const socketPath = join(runtimeDir, "agentglow.sock");
export const pidPath = join(runtimeDir, "agentglow.pid");

export type RuntimeMessage =
  | { type: "event"; source: "codex" | "claude" | "manual"; state: AgentState }
  | { type: "text"; source: "codex" | "claude"; text: string }
  | { type: "test" }
  | { type: "restore" }
  | { type: "status" };

export interface RuntimeStatus {
  running: boolean;
  device?: string;
  support?: string;
  state: AgentState;
}

export class AgentGlowDaemon {
  private server?: Server;
  private heartbeat?: NodeJS.Timeout;
  private randomTyping?: NodeJS.Timeout;
  private textTimer?: NodeJS.Timeout;
  private textQueue: number[] = [];
  private state = AgentState.Idle;
  private sourceStates = new Map<string, AgentState>();
  private transport: KeyboardTransport;

  constructor(transport = new KeyboardTransport()) { this.transport = transport; }

  start(): Promise<void> {
    mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
    rmSync(socketPath, { force: true });
    writeFileSync(pidPath, String(process.pid), { mode: 0o600 });
    const connection = this.transport.connect();
    if (connection?.support === "agentglow") this.heartbeat = setInterval(() => this.transport.send(Opcode.Heartbeat), 1000);
    this.server = createServer((socket) => this.accept(socket));
    return new Promise((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(socketPath, () => { this.server!.off("error", reject); resolve(); });
    });
  }

  private accept(socket: Socket): void {
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        try { this.handle(JSON.parse(line) as RuntimeMessage, socket); }
        catch (error) { socket.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`); }
      }
    });
  }

  handle(message: RuntimeMessage, socket?: Socket): void {
    const profile = this.transport.connection?.profile;
    if (message.type === "status") {
      const status: RuntimeStatus = { running: true, device: this.transport.connection?.product, support: this.transport.connection?.support, state: this.state };
      socket?.write(`${JSON.stringify(status)}\n`); return;
    }
    if (message.type === "restore") {
      this.sourceStates.clear(); this.textQueue.length = 0; this.setState(AgentState.Idle); this.transport.send(Opcode.Restore); return;
    }
    if (message.type === "event") {
      this.sourceStates.set(message.source, message.state);
      this.setState(mergeStates([...this.sourceStates.values()])); return;
    }
    if (!profile) return;
    if (message.type === "text") {
      this.setState(AgentState.Streaming);
      this.textQueue.push(...mapText(profile, message.text));
      this.startTextPlayback();
      return;
    }
    if (message.type === "test") {
      this.setState(AgentState.Streaming);
      const keys = profile.randomKeys.slice(0, 12).map((led) => ({ led }));
      this.transport.send(Opcode.KeyEvents, encodeKeyEvents(keys));
    }
  }

  private startTextPlayback(): void {
    if (this.textTimer) return;
    this.textTimer = setInterval(() => {
      const led = this.textQueue.shift();
      if (led !== undefined) this.transport.send(Opcode.KeyEvents, encodeKeyEvents([{ led }]));
      if (!this.textQueue.length && this.textTimer) { clearInterval(this.textTimer); this.textTimer = undefined; }
    }, 35);
  }

  private setState(state: AgentState): void {
    this.state = state;
    const colors: Record<number, [number, number, number]> = {
      [AgentState.Idle]: [0, 0, 0], [AgentState.Thinking]: [170, 230, 130], [AgentState.Tool]: [30, 255, 210],
      [AgentState.Streaming]: [115, 255, 220], [AgentState.Complete]: [85, 255, 220], [AgentState.Error]: [0, 255, 255],
    };
    this.transport.send(Opcode.SetState, encodeState(state, ...colors[state]));
    if (this.randomTyping) clearInterval(this.randomTyping);
    this.randomTyping = undefined;
    const profile = this.transport.connection?.profile;
    if (profile && (state === AgentState.Thinking || state === AgentState.Tool)) {
      this.randomTyping = setInterval(() => {
        const led = profile.randomKeys[Math.floor(Math.random() * profile.randomKeys.length)];
        this.transport.send(Opcode.KeyEvents, encodeKeyEvents([{ led }]));
      }, state === AgentState.Tool ? 90 : 180);
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.randomTyping) clearInterval(this.randomTyping);
    if (this.textTimer) clearInterval(this.textTimer);
    this.transport.send(Opcode.Restore);
    this.transport.close();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
    rmSync(socketPath, { force: true }); rmSync(pidPath, { force: true });
  }
}

export function sendMessage(message: RuntimeMessage, waitForReply = false): Promise<RuntimeStatus | undefined> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(`${JSON.stringify(message)}\n`);
      if (!waitForReply) { socket.end(); resolve(undefined); }
    });
    if (waitForReply) {
      let buffer = ""; socket.setEncoding("utf8");
      socket.on("data", (chunk) => { buffer += chunk; if (buffer.includes("\n")) { socket.end(); resolve(JSON.parse(buffer.slice(0, buffer.indexOf("\n"))) as RuntimeStatus); } });
    }
  });
}

export function readDaemonPid(): number | undefined {
  try { return Number(readFileSync(pidPath, "utf8")); } catch { return undefined; }
}

export function mergeStates(states: AgentState[]): AgentState {
  const priority: Record<number, number> = {
    [AgentState.Idle]: 0, [AgentState.Complete]: 1, [AgentState.Thinking]: 2,
    [AgentState.Streaming]: 3, [AgentState.Tool]: 4, [AgentState.Error]: 5,
  };
  return states.reduce((selected, candidate) => priority[candidate] > priority[selected] ? candidate : selected, AgentState.Idle);
}
