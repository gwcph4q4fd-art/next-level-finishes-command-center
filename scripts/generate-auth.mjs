import { webcrypto } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-auth.mjs "your admin password"');
  process.exit(1);
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

const iterations = 210000;
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"]
);
const bits = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations },
  key,
  256
);
const secret = webcrypto.getRandomValues(new Uint8Array(32));

console.log("AUTH_SECRET=" + toBase64Url(secret));
console.log("ADMIN_PASSWORD_HASH=pbkdf2:sha256:" + iterations + ":" + toHex(salt) + ":" + toHex(new Uint8Array(bits)));

