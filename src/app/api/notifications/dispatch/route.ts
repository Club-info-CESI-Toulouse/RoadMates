import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { deliverNotification } from "@/lib/notifications/deliver";

// Called by the database (pg_net trigger) for each new notification.
function authorized(header: string | null) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("x-notify-secret"))) return new Response(null, { status: 401 });
  const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  await deliverNotification(parsed.data.id);
  return new Response(null, { status: 204 });
}
