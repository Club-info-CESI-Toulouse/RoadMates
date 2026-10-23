import Link from "next/link";
import { Suspense } from "react";
import { getUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const bell = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function NotificationBell() {
  return (
    <Suspense fallback={<BellLink unread={0} />}>
      <UnreadBell />
    </Suspense>
  );
}

async function UnreadBell() {
  const userId = await getUserId();
  if (!userId) return <BellLink unread={0} />;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return <BellLink unread={count ?? 0} />;
}

function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
      className="relative flex size-9 items-center justify-center rounded-full border border-border"
    >
      {bell}
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1 text-center text-xs font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
