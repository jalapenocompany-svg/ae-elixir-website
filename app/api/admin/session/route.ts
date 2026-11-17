import { adminConfigured, adminSessionCookie, hasAdminSession, sameAdminOrigin, validAdminPassword } from "@/lib/admin-session";

function reply(body: object, status = 200, cookie?: string) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store",
    ...(cookie ? { "Set-Cookie": cookie } : {}),
  } });
}
export async function GET(request: Request) {
  return reply({ authenticated: hasAdminSession(request), configured: adminConfigured() });
}
export async function POST(request: Request) {
  if (!sameAdminOrigin(request)) return reply({ error: "Use the same site to sign in." }, 403);
  if (!adminConfigured()) return reply({ error: "Set MASTER_ADMIN_PASSWORD in the server environment (at least 9 characters)." }, 503);
  const body = await request.json().catch(() => null);
  if (!validAdminPassword(body?.password)) return reply({ error: "Invalid password." }, 401);
  return reply({ authenticated: true }, 200, adminSessionCookie(request));
}
export async function DELETE(request: Request) {
  if (!sameAdminOrigin(request)) return reply({ error: "Use the same site to sign out." }, 403);
  return reply({ authenticated: false }, 200, adminSessionCookie(request, true));
}
