import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const cookieName = "ae_elixir_admin_session";
const lifetime = 8 * 60 * 60;

function secret() {
  const value = process.env.MASTER_ADMIN_PASSWORD;
  return value && value.length >= 9 ? value : null;
}
export function adminConfigured() { return secret() !== null; }
export function validAdminPassword(password: unknown) {
  const configured = secret();
  if (!configured || typeof password !== "string" || password.length > 1024) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(password), digest(configured));
}
function signature(value: string) {
  const configured = secret();
  if (!configured) throw new Error("Configure MASTER_ADMIN_PASSWORD with at least 9 characters.");
  return createHmac("sha256", configured).update("ae-admin-session:" + value).digest("base64url");
}
export function sameAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("host") ?? new URL(request.url).host).toLowerCase();
  } catch { return false; }
}
export function hasAdminSession(request: Request) {
  if (!secret()) return false;
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  if (!cookie || !/^\d{10}\.[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(cookie)) return false;
  const [expires, nonce, supplied] = cookie.split(".");
  const remaining = Number(expires) - Math.floor(Date.now() / 1000);
  if (remaining <= 0 || remaining > lifetime) return false;
  return timingSafeEqual(Buffer.from(signature(expires + "." + nonce)), Buffer.from(supplied));
}
export function adminSessionCookie(request: Request, clear = false) {
  const value = Math.floor(Date.now() / 1000) + lifetime + "." + randomBytes(24).toString("base64url");
  const secure = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
  return cookieName + "=" + (clear ? "" : value + "." + signature(value)) +
    "; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=" + (clear ? 0 : lifetime) + (secure ? "; Secure" : "");
}
