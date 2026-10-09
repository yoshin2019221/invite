import "server-only";
import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function makeSlug(length = 8) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function makeEditToken() {
  return randomBytes(24).toString("base64url");
}

// Short unguessable id for a personal household link (72 bits).
export function makeLinkToken() {
  return randomBytes(9).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
