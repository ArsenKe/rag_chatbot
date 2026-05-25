import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  }).toString('hex');

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  try {
    const [algo, nStr, rStr, pStr, salt, hashHex] = encoded.split('$');
    if (algo !== 'scrypt' || !salt || !hashHex) {
      return false;
    }

    const n = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);

    const derived = scryptSync(password, salt, KEY_LEN, {
      N: Number.isFinite(n) ? n : SCRYPT_N,
      r: Number.isFinite(r) ? r : SCRYPT_R,
      p: Number.isFinite(p) ? p : SCRYPT_P
    });

    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== derived.length) {
      return false;
    }

    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
