import { getDb } from '@/db';

export type AccountRole = 'customer' | 'owner';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
};

const SESSION_COOKIE = 'tg_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function randomHex(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string, salt = randomHex(16)) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: 210_000 },
    material,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const result = await hashPassword(password, salt);
  if (result.hash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < result.hash.length; index += 1) {
    mismatch |= result.hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return mismatch === 0;
}

function getCookie(request: Request, name: string) {
  if (name === SESSION_COOKIE) {
    const authorization = request.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  }
  const cookies = request.headers.get('cookie') ?? '';
  for (const entry of cookies.split(';')) {
    const [key, ...parts] = entry.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return null;
}

export async function createSession(userId: string, request: Request) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  await getDb().prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(tokenHash, userId, now + SESSION_SECONDS, now).run();

  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return {
    token,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`,
  };
}

export async function endSession(request: Request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await getDb().prepare(`
    SELECT users.id, users.email, users.display_name AS displayName, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(await sha256(token), now).first<SessionUser>();
  return row ?? null;
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function normaliseEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

export function safeText(value: unknown, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}
