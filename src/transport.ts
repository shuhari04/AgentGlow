import { HID, devices, type Device } from "node-hid";
import { decodePacket, encodePacket, Opcode, REPORT_SIZE } from "./protocol.js";
import { profiles, type KeyboardProfile } from "./profile.js";

export interface HidHandle {
  write(data: number[]): number;
  readTimeout(timeout: number): number[];
  close(): void;
}

export type DeviceSupport = "agentglow" | "via-only" | "unavailable";

export interface ConnectedKeyboard {
  profile: KeyboardProfile;
  support: DeviceSupport;
  product: string;
}

export class KeyboardTransport {
  private handle?: HidHandle;
  private sequence = 0;
  connection?: ConnectedKeyboard;

  constructor(private readonly listDevices: () => Device[] = devices, private readonly open: (path: string) => HidHandle = (path) => new HID(path)) {}

  connect(): ConnectedKeyboard | undefined {
    this.close();
    for (const profile of profiles) {
      const match = this.listDevices().find((device) => device.path && device.vendorId === profile.vendorId && profile.productIds.includes(device.productId) && device.usagePage === profile.usagePage && device.usage === profile.usage);
      if (!match?.path) continue;
      this.handle = this.open(match.path);
      const support = this.detectSupport();
      this.connection = { profile, support, product: match.product ?? profile.name };
      return this.connection;
    }
    return undefined;
  }

  send(opcode: Opcode, payload: Uint8Array<ArrayBufferLike> = new Uint8Array()): boolean {
    if (!this.handle || this.connection?.support !== "agentglow") return false;
    this.write(encodePacket(opcode, payload, this.sequence++));
    return true;
  }

  private detectSupport(): DeviceSupport {
    if (!this.handle) return "unavailable";
    try {
      this.write(encodePacket(Opcode.Hello));
      const response = this.handle.readTimeout(250);
      if (response.length) {
        const offset = response.length === REPORT_SIZE + 1 ? 1 : 0;
        const packet = decodePacket(response.slice(offset));
        if (packet.opcode === Opcode.Capabilities || packet.opcode === Opcode.Ack) return "agentglow";
      }
    } catch { /* Stock VIA firmware will not understand AgentGlow. */ }

    try {
      const via = new Uint8Array(REPORT_SIZE);
      via[0] = 0x01;
      this.write(via);
      const response = this.handle.readTimeout(250);
      if (response[0] === 0x01 || response[1] === 0x01) return "via-only";
    } catch { /* Device is present but did not answer either protocol. */ }
    return "unavailable";
  }

  private write(packet: Uint8Array): void {
    if (!this.handle) throw new Error("Keyboard is not connected");
    this.handle.write([0, ...packet]);
  }

  close(): void {
    this.handle?.close();
    this.handle = undefined;
    this.connection = undefined;
  }
}
