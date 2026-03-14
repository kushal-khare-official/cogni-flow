import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

/** Derive a 32-byte key: use raw hex if 64-char valid hex, otherwise SHA-256(env). */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length === 0) {
    throw new Error(
      "ENCRYPTION_KEY must be set (64-character hex string or any string; non-hex is hashed to 32 bytes)",
    );
  }
  const isStrictHex = raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw);
  const key = isStrictHex
    ? Buffer.from(raw, "hex")
    : createHash("sha256").update(raw, "utf8").digest();
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must yield 32 bytes (use 64 hex chars or any string); got ${key.length}`,
    );
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    tag: tag.toString("hex"),
  });
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  const { iv, ciphertext, tag } = JSON.parse(encrypted) as {
    iv: string;
    ciphertext: string;
    tag: string;
  };

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
