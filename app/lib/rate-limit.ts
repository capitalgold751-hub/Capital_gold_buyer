import { createHash } from "node:crypto";

export class RateLimitError extends Error {}

type Bucket = { count: number; expiresAt: number };
const buckets = new Map<string, Bucket>();

function bucketKey(namespace: string, value: string, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs);
  return createHash("sha256").update(`${namespace}:${value}:${bucket}`).digest("hex");
}

async function consume(namespace: string, value: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = bucketKey(namespace, value, windowMs);
  const existing = buckets.get(key);
  const next = existing && existing.expiresAt > now ? existing.count + 1 : 1;
  buckets.set(key, { count: next, expiresAt: now + windowMs * 2 });

  // Opportunistic cleanup. This uses server memory only and causes zero Firestore reads/writes.
  if (buckets.size > 1000) {
    for (const [bucket, value] of buckets) {
      if (value.expiresAt <= now) buckets.delete(bucket);
    }
  }

  if (next > limit) throw new RateLimitError("Too many requests. Please wait and try again.");
}

export function requestIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim().slice(0, 80);
}

export async function limitLogin(request: Request, email: string) {
  await consume("login-ip", requestIp(request), 20, 15 * 60_000);
  await consume("login-email", email.toLowerCase(), 8, 15 * 60_000);
}

export async function limitSubmission(request: Request, phone: string, type: string) {
  await consume(`${type}-ip`, requestIp(request), 12, 10 * 60_000);
  await consume(`${type}-phone`, phone, 3, 10 * 60_000);
}
