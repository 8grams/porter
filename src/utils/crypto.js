import crypto from "crypto";
import { env } from "./env.js";

// Encryption setup
const encryptionSecret = env.ENCRYPTION_SECRET.padEnd(32, "0"); // Must be 32 bytes
const IV = crypto.randomBytes(16);
const encryptionAlgorithm = "aes-256-cbc";

export function encrypt(text) {
  const cipher = crypto.createCipheriv(encryptionAlgorithm, Buffer.from(encryptionSecret), IV);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return IV.toString("hex") + ":" + encrypted;
}

export function decrypt(text) {
  if (!text) {
    return null;
  }

  const [ivHex, encrypted] = text.split(":");
  const decipher = crypto.createDecipheriv(
    encryptionAlgorithm,
    Buffer.from(encryptionSecret),
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}
