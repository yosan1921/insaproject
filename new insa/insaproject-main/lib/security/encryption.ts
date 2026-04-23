import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
	const secret = process.env.ENCRYPTION_KEY;
	if (!secret) {
		throw new Error("ENCRYPTION_KEY env var is not set");
	}

	// Accept a 32-byte raw key (base64 or hex) or derive from passphrase.
	if (secret.length === 32) {
		return Buffer.from(secret, "utf8");
	}

	if (/^[0-9a-fA-F]{64}$/.test(secret)) {
		return Buffer.from(secret, "hex");
	}

	if (/^[A-Za-z0-9+/=]+$/.test(secret)) {
		try {
			const buf = Buffer.from(secret, "base64");
			if (buf.length === 32) return buf;
		} catch {
			// fall through to pbkdf2
		}
	}

	// Fallback: derive a key from passphrase with PBKDF2.
	return crypto.pbkdf2Sync(secret, "insa-project-salt", 100000, 32, "sha256");
}

export function encrypt(value: string): string {
	const key = getKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});

	const ciphertext = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
	const key = getKey();
	const buffer = Buffer.from(payload, "base64");

	const iv = buffer.subarray(0, IV_LENGTH);
	const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
}

