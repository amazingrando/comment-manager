import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "v1:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function parseTokenEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // fall through
  }
  throw new Error(
    "TOKEN_ENCRYPTION_KEY must be 32 bytes as 64 hex chars or base64",
  );
}

export function sealSecret(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("Token encryption key must be 32 bytes");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unsealSecret(stored: string, key: Buffer): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  if (key.length !== 32) {
    throw new Error("Token encryption key must be 32 bytes");
  }
  const payload = Buffer.from(stored.slice(PREFIX.length), "base64url");
  if (payload.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Sealed token is truncated");
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function isSealedSecret(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
