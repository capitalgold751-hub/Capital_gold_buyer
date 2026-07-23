import { getDashboardIdentity } from "../../../lib/dashboard-auth";

export async function GET() {
  const identity = await getDashboardIdentity().catch(() => null);
  if (!identity) return Response.json({ authenticated: false }, { status: 401, headers: { "cache-control": "no-store" } });
  return Response.json({ authenticated: true, user: { name: identity.user.displayName, email: identity.user.email, role: identity.role } }, { headers: { "cache-control": "no-store" } });
}
