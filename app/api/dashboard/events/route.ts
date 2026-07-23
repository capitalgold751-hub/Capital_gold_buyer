// Realtime dashboard polling is disabled to avoid repeated Firestore reads.
export const runtime = "nodejs";
export async function GET() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
