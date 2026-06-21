export const REPORT_SIZE = 32;
export const MAGIC = [0xb0, 0x47] as const;
export const PROTOCOL_VERSION = 1;

export enum Opcode {
  Hello = 0x01,
  Capabilities = 0x02,
  SetState = 0x03,
  KeyEvents = 0x04,
  Heartbeat = 0x05,
  Restore = 0x06,
  Ack = 0x7f,
}

export enum AgentState {
  Idle = 0,
  Thinking = 1,
  Tool = 2,
  Streaming = 3,
  Complete = 4,
  Error = 5,
}

export interface Packet {
  opcode: Opcode;
  sequence: number;
  payload: Uint8Array;
}

export interface KeyLightEvent {
  led: number;
  intensity?: number;
}

export function encodePacket(opcode: Opcode, payload: Uint8Array<ArrayBufferLike> = new Uint8Array(), sequence = 0): Uint8Array {
  if (payload.length > REPORT_SIZE - 6) throw new Error("AgentGlow payload exceeds 26 bytes");
  const packet = new Uint8Array(REPORT_SIZE);
  packet[0] = MAGIC[0];
  packet[1] = MAGIC[1];
  packet[2] = PROTOCOL_VERSION;
  packet[3] = opcode;
  packet[4] = payload.length;
  packet[5] = sequence & 0xff;
  packet.set(payload, 6);
  return packet;
}

export function decodePacket(data: ArrayLike<number>): Packet {
  const bytes = Uint8Array.from(data);
  if (bytes.length < 6 || bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1]) throw new Error("Not an AgentGlow packet");
  if (bytes[2] !== PROTOCOL_VERSION) throw new Error(`Unsupported AgentGlow protocol ${bytes[2]}`);
  const length = bytes[4];
  if (length > REPORT_SIZE - 6 || bytes.length < length + 6) throw new Error("Invalid AgentGlow payload length");
  return { opcode: bytes[3] as Opcode, sequence: bytes[5], payload: bytes.slice(6, 6 + length) };
}

export function encodeState(state: AgentState, hue = 145, saturation = 255, intensity = 180): Uint8Array {
  return Uint8Array.of(state, hue, saturation, intensity);
}

export function encodeKeyEvents(events: KeyLightEvent[]): Uint8Array {
  const selected = events.slice(0, 12);
  const payload = new Uint8Array(1 + selected.length * 2);
  payload[0] = selected.length;
  selected.forEach((event, index) => {
    payload[1 + index * 2] = event.led & 0xff;
    payload[2 + index * 2] = event.intensity ?? 255;
  });
  return payload;
}
