export interface KeyboardProfile {
  id: string;
  name: string;
  vendorId: number;
  productIds: number[];
  usagePage: number;
  usage: number;
  ledCount: number;
  characterMap: Record<string, number>;
  randomKeys: number[];
}

const q6Characters: Record<string, number> = {
  "`": 20, "1": 21, "2": 22, "3": 23, "4": 24, "5": 25, "6": 26, "7": 27, "8": 28, "9": 29, "0": 30, "-": 31, "=": 32,
  q: 42, w: 43, e: 44, r: 45, t: 46, y: 47, u: 48, i: 49, o: 50, p: 51, "[": 52, "]": 53, "\\": 54,
  a: 63, s: 64, d: 65, f: 66, g: 67, h: 68, j: 69, k: 70, l: 71, ";": 72, "'": 73, "\n": 74,
  z: 79, x: 80, c: 81, v: 82, b: 83, n: 84, m: 85, ",": 86, ".": 87, "/": 88, " ": 98,
};

const shifted: Record<string, string> = {
  "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
  _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/", "\t": " ",
};
for (const [character, base] of Object.entries(shifted)) q6Characters[character] = q6Characters[base];
for (const letter of "abcdefghijklmnopqrstuvwxyz") q6Characters[letter.toUpperCase()] = q6Characters[letter];

export const q6ProAnsi: KeyboardProfile = {
  id: "keychron-q6-pro-ansi-knob",
  name: "Keychron Q6 Pro ANSI Knob",
  vendorId: 0x3434,
  productIds: [0x0660],
  usagePage: 0xff60,
  usage: 0x61,
  ledCount: 108,
  characterMap: q6Characters,
  randomKeys: [...new Set(Object.values(q6Characters))],
};

export const profiles = [q6ProAnsi];

export function mapText(profile: KeyboardProfile, text: string): number[] {
  const fallback = profile.characterMap[" "];
  return [...text].map((character) => profile.characterMap[character] ?? (character.trim() ? fallback : profile.characterMap[" "]));
}
