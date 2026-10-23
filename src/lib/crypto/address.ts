import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. Format: "v1:" + base64url(iv | tag | ciphertext).
// The version prefix allows a future key rotation (v2 with a new key).
const VERSION = "v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  const raw = process.env.ADDRESS_ENCRYPTION_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (buf.length !== 32) throw new Error("ADDRESS_ENCRYPTION_KEY must be 32 bytes (base64)");
  return buf;
}

export function encrypt<T>(value: T): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url")}`;
}

export function decrypt<T>(payload: string): T {
  const [version, body] = payload.split(":", 2);
  if (version !== VERSION || !body) throw new Error("Unsupported payload version");
  const buf = Buffer.from(body, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, IV_LENGTH));
  decipher.setAuthTag(buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
  const data = Buffer.concat([
    decipher.update(buf.subarray(IV_LENGTH + TAG_LENGTH)),
    decipher.final(),
  ]);
  return JSON.parse(data.toString("utf8")) as T;
}
