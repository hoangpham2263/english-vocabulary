// Signed session token for the single account. The browser sends it as a
// Bearer token, because the app and the API live on different domains.

export const SESSION_DAYS = 30;

export type SessionEnv = { ENGLISH_VOCABULARY_USERNAME?: string; ENGLISH_VOCABULARY_SESSION_SECRET?: string };

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Null when the secret is missing or too short: sessions then never validate. */
function sessionSecret(env: SessionEnv) {
  const secret = env.ENGLISH_VOCABULARY_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The username is part of the signed payload, so changing the account signs
// every existing session out.
function payloadFor(username: string, expires: number) {
  return `english-vocabulary:${username}:${expires}`;
}

export async function createSessionToken(env: SessionEnv, now = Date.now()) {
  const secret = sessionSecret(env);
  const username = env.ENGLISH_VOCABULARY_USERNAME;
  if (!secret || !username) return null;
  const expires = Math.floor(now / 1000) + SESSION_DAYS * 24 * 60 * 60;
  return `${expires}.${await sign(payloadFor(username, expires), secret)}`;
}

export async function isValidSessionToken(env: SessionEnv, token: string | undefined, now = Date.now()) {
  const secret = sessionSecret(env);
  const username = env.ENGLISH_VOCABULARY_USERNAME;
  if (!token || !secret || !username) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || !signature || expires <= Math.floor(now / 1000)) return false;
  return safeEqual(signature, await sign(payloadFor(username, expires), secret));
}
