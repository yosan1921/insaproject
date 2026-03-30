import crypto from "crypto";

// Minimal TOTP implementation compatible with Google Authenticator/Authy.

function base32ToBuffer(base32: string): Buffer {
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

export function generateTotpSecret(length = 20): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function getOtpauthUrl(options: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${options.issuer}:${options.accountName}`);
  const issuer = encodeURIComponent(options.issuer);
  const secret = options.secret;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotpCode(secret: string, timeStep = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(counter, 4);

  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();

  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (code % 10 ** digits).toString().padStart(digits, "0");
  return otp;
}

export function verifyTotpCode(secret: string, token: string, window = 2): boolean {
  const timeStep = 30;
  const digits = 6;
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);
  for (let offset = -window; offset <= window; offset++) {
    const counter = currentCounter + offset;
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(counter, 4);

    const key = base32ToBuffer(secret);
    const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
    const pos = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[pos] & 0x7f) << 24) |
      ((hmac[pos + 1] & 0xff) << 16) |
      ((hmac[pos + 2] & 0xff) << 8) |
      (hmac[pos + 3] & 0xff);
    const otp = (code % 10 ** digits).toString().padStart(digits, "0");
    if (otp === token) return true;
  }
  return false;
}
