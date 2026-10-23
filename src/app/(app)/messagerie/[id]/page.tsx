import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/user";
import { getConversation } from "@/lib/messaging/server";
import { ChatThread } from "./chat-thread";

export const metadata: Metadata = { title: "Conversation · RoadMates" };

export default function ConversationPage({ params }: PageProps<"/messagerie/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 md:px-8">
      <Suspense fallback={<p className="py-6 text-muted">Chargement…</p>}>
        <Conversation params={params} />
      </Suspense>
    </main>
  );
}

async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  const conversation = await getConversation(profile.id, id);
  if (!conversation) notFound();

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background py-4">
        <Link href="/messagerie" aria-label="Retour aux conversations" className="text-xl">
          ←
        </Link>
        <h1 className="text-lg font-bold">{conversation.otherName}</h1>
      </header>
      <ChatThread conversationId={id} myId={profile.id} initial={conversation.messages} />
    </>
  );
}
