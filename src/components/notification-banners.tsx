"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  notificationText,
  notificationTitle,
  notificationUrl,
  type NotificationPayload,
} from "@/lib/notifications/labels";
import { authorizeRealtime, createClient } from "@/lib/supabase/client";

const BANNER_MS = 5000;

type Banner = { id: string; title: string; text: string; href: string };

// While the app is open, new notifications also show as a banner:
// top of the screen on mobile, top right on PC.
export function NotificationBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [supabase] = useState(createClient);
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = useRef(pathname);

  useEffect(() => {
    currentPath.current = pathname;
  }, [pathname]);

  const dismiss = useCallback((id: string) => setBanners((list) => list.filter((b) => b.id !== id)), []);

  const show = useCallback(
    (banner: Banner) => {
      setBanners((list) => (list.some((b) => b.id === banner.id) ? list : [...list, banner]));
      setTimeout(() => dismiss(banner.id), BANNER_MS);
    },
    [dismiss],
  );

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!active || !userId) return;
      await authorizeRealtime(supabase);
      if (!active) return;

      channel = supabase
        .channel("notification-banners")
        // Message notifications are throttled for push and email: banners follow every message.
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async ({ new: message }) => {
            const { id, sender_id: senderId, conversation_id: conversationId, body } = message as {
              id: string;
              sender_id: string;
              conversation_id: string;
              body: string;
            };
            const href = notificationUrl("new_message", conversationId);
            if (senderId === userId || currentPath.current === href) return;
            const { data: sender } = await supabase.from("profiles").select("display_name").eq("id", senderId).maybeSingle();
            show({
              id,
              title: notificationTitle("new_message"),
              text: notificationText("new_message", { other_name: sender?.display_name, preview: body.slice(0, 100) }),
              href,
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          ({ new: notification }) => {
            const { id, kind, payload, conversation_id: conversationId } = notification as {
              id: string;
              kind: string;
              payload: NotificationPayload;
              conversation_id: string | null;
            };
            if (kind === "new_message") return;
            show({
              id,
              title: notificationTitle(kind),
              text: notificationText(kind, payload),
              href: notificationUrl(kind, conversationId),
            });
            router.refresh();
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, router, show]);

  if (banners.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex flex-col gap-2 md:top-6 md:right-6 md:left-auto md:w-96"
    >
      {banners.map((banner) => (
        <div
          key={banner.id}
          role="status"
          data-notification-banner
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-lg"
        >
          <Link href={banner.href} onClick={() => dismiss(banner.id)} className="min-w-0 flex-1">
            <span className="block font-semibold">{banner.title}</span>
            <span className="block break-words text-muted">{banner.text}</span>
          </Link>
          <button type="button" onClick={() => dismiss(banner.id)} aria-label="Fermer" className="text-muted">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
