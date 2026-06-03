export const SESSION_COOKIE = "nlf_session";
const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function getAuthConfig() {
  return {
    secret: process.env.AUTH_SECRET || "",
    passwordHash: process.env.ADMIN_PASSWORD_HASH || "",
    isConfigured: Boolean(process.env.AUTH_SECRET && process.env.ADMIN_PASSWORD_HASH)
  };
}

export async function createSessionToken(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${SESSION_VERSION}.${expiresAt}`;
  const signature = await hmacSha256(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(secret: string, token?: string) {
  if (!secret || !token) return false;
  const [version, expiresAtRaw, signature] = token.split(".");
  if (version !== SESSION_VERSION || !expiresAtRaw || !signature) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacSha256(secret, `${version}.${expiresAtRaw}`);
  return expected === signature;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, digest, iterationsRaw, saltHex, hashHex] = storedHash.split(":");
  const iterations = Number(iterationsRaw);

  if (algorithm !== "pbkdf2" || digest !== "sha256" || !Number.isFinite(iterations) || iterations < 100000) {
    return false;
  }

  const salt = hexToBytes(saltHex || "");
  const expected = hexToBytes(hashHex || "");
  if (!salt.length || !expected.length) return false;

  const key = await crypto.subtle.importKey("raw", textBytes(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    key,
    expected.length * 8
  );

  return timingSafeEqual(new Uint8Array(derived), expected);
}

