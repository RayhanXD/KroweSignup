import crypto from "crypto";

const ENCRYPTION_KEY = process.env.GRANOLA_ENCRYPTION_KEY?.trim() ?? "";

function getKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error("Missing GRANOLA_ENCRYPTION_KEY");
  }
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

export function encryptGranolaApiKey(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptGranolaApiKey(encryptedValue: string): string {
  const [ivPart, tagPart, payloadPart] = encryptedValue.split(":");
  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error("Invalid encrypted key format");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function granolaKeyHint(apiKey: string): string {
  if (apiKey.length < 6) return "******";
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-2)}`;
}
