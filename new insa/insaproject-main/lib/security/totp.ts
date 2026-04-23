import crypto from "crypto";

// Standard RFC 6238 TOTP implementation using Node.js built-in crypto
// Compatible with Google Authenticator and Authy

function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const c of cleaned) {
    const val = alphabet.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    result += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return result;
}

function computeHotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // Write counter as 64-bit big-endian
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  buf.writeUInt32BE(high, 0);
  buf.writeUInt32BE(low, 4);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function getOtpauthUrl(options: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${options.issuer}:${options.accountName}`);
  const issuer = encodeURIComponent(options.issuer);
  return `otpauth://totp/${label}?secret=${options.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotpCode(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  return computeHotp(secret, counter);
}

export function verifyTotpCode(secret: string, token: string, window = 2): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (computeHotp(secret, counter + i) === token) return true;
  }
  return false;
}
