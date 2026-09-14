/** Deterministic hashing. Everything "random" in the renderer derives from (frame, salt) through here. */
export const hashInt = (a: number, b = 0, c = 0): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519 + 3266489917) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
/** 0..1 */
export const hash01 = (a: number, b = 0, c = 0): number => hashInt(a, b, c) / 4294967296;
/** -1..1 */
export const hashSigned = (a: number, b = 0, c = 0): number => hash01(a, b, c) * 2 - 1;
export const strHash = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
};
