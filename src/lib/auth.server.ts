import bcrypt from "bcryptjs";
import { pool } from "@/lib/lovable/database";
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";

const COOKIE_NAME = "ktm_session";
const SESSION_DAYS = 30;

function randomToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expires],
  );
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${SESSION_DAYS * 86400}`,
  );
  return token;
}

export async function clearSession() {
  const token = readCookieToken();
  if (token) {
    await pool.query("DELETE FROM sessions WHERE token=$1", [token]);
  }
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`,
  );
}

function readCookieToken(): string | null {
  const cookie = getRequestHeader("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE_NAME) return v ?? null;
  }
  return null;
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = readCookieToken();
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token=$1 AND s.expires_at > now() LIMIT 1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}
