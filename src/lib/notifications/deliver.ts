import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationText, notificationTitle, notificationUrl, type NotificationPayload } from "./labels";

const APP_URL = "https://roadmates.vercel.app";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "RoadMates <onboarding@resend.dev>";

let vapidReady = false;
function setupVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!vapidReady) webpush.setVapidDetails(APP_URL, publicKey, privateKey);
  vapidReady = true;
  return true;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendEmail(to: string, subject: string, text: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject: `RoadMates · ${subject}`,
      text: `${text}\n\n${url}\n\nGère tes notifications dans Compte.`,
      html: `<p>${escapeHtml(text)}</p><p><a href="${url}">Ouvrir RoadMates</a></p><p style="color:#57534e;font-size:12px">Gère tes notifications dans Compte.</p>`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

/** Delivers one notification: push to every device, email if no push got through. Idempotent. */
export async function deliverNotification(id: string) {
  const db = createAdminClient();
  const { data: n } = await db
    .from("notifications")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", id)
    .is("delivered_at", null)
    .select("id, user_id, kind, payload, conversation_id")
    .maybeSingle();
  if (!n) return;

  const { data: profile } = await db.from("profiles").select("push_enabled, email_enabled").eq("id", n.user_id).single();
  if (!profile) return;
  const text = notificationText(n.kind, n.payload as NotificationPayload);
  const title = notificationTitle(n.kind);
  const path = notificationUrl(n.kind, n.conversation_id);

  let pushed = false;
  if (profile.push_enabled && setupVapid()) {
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id);
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title, body: text, url: path, tag: n.conversation_id ?? n.kind }),
            { TTL: 6 * 3600 },
          );
          pushed = true;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
        }
      }),
    );
  }

  if (!pushed && profile.email_enabled) {
    const { data: user } = await db.auth.admin.getUserById(n.user_id);
    if (user.user?.email) await sendEmail(user.user.email, title, text, `${APP_URL}${path}`).catch(() => false);
  }
}

/** Sends a test push to one of the user's own devices. False if it could not be sent. */
export async function sendTestPush(userId: string, endpoint: string) {
  if (!setupVapid()) return false;
  const db = createAdminClient();
  const { data: sub } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (!sub) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: "RoadMates",
        body: "Notification de test : le push fonctionne sur cet appareil.",
        url: "/compte",
        tag: "push-test",
      }),
      { TTL: 60, urgency: "high" },
    );
    return true;
  } catch {
    return false;
  }
}
