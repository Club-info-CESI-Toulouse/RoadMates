import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { formatClock, formatDayLabel, localDate } from "@/lib/dates";
import { listConversations } from "@/lib/messaging/server";

export const metadata: Metadata = { title: "Messagerie · RoadMates" };

export default function MessagesPage() {
  return (
    <PageShell title="Messagerie">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Conversations />
      </Suspense>
    </PageShell>
  );
}

function when(iso: string) {
  const day = localDate(new Date(iso));
  return day === localDate() ? formatClock(iso) : formatDayLabel(day);
}

async function Conversations() {
  const profile = await getCurrentProfile();
  const conversations = await listConversations(profile.id);
  if (conversations.length === 0)
    return (
      <p className="text-muted">
        Aucune conversation pour l&apos;instant. Écris à un camarade depuis une proposition de
        covoiturage sur l&apos;accueil.
      </p>
    );

  return (
    <ul className="flex flex-col divide-y divide-border">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link href={`/messagerie/${c.id}`} className="flex items-center gap-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface font-bold">
              {c.otherName.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline justify-between gap-2">
                <span className={c.unread ? "font-bold" : "font-medium"}>{c.otherName}</span>
                {c.lastAt && <span className="shrink-0 text-xs text-muted">{when(c.lastAt)}</span>}
              </span>
              <span className={`truncate text-sm ${c.unread ? "font-semibold" : "text-muted"}`}>
                {c.lastFromMe && "Toi : "}
                {c.lastMessage}
              </span>
            </span>
            {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
