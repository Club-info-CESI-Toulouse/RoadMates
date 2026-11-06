"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock, formatDayLabel, localDate } from "@/lib/dates";
import type { ChatMessage } from "@/lib/messaging/server";
import { authorizeRealtime, createClient } from "@/lib/supabase/client";

const MAX_LENGTH = 2000;
const MESSAGES_LOADED = 100;

type Row = { id: string; sender_id: string; body: string; created_at: string };
const toMessage = (r: Row): ChatMessage => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at });

export function ChatThread({
  conversationId,
  myId,
  initial,
}: {
  conversationId: string;
  myId: string;
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [supabase] = useState(createClient);
  const end = useRef<HTMLDivElement>(null);

  // Live updates (RLS limits the stream to this user's conversations).
  useEffect(() => {
    let active = true;
    // The page stays alive between visits and the socket can miss messages: reload from the database.
    const reload = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_LOADED);
      if (!active || !data) return;
      setMessages((list) => {
        const byId = new Map(list.map((m) => [m.id, m]));
        for (const row of data) byId.set(row.id, toMessage(row));
        return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      supabase.rpc("mark_conversation_read", { p_id: conversationId });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    reload();
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const message = toMessage(payload.new as Row);
          setMessages((list) => (list.some((x) => x.id === message.id) ? list : [...list, message]));
          if (message.senderId !== myId) supabase.rpc("mark_conversation_read", { p_id: conversationId });
        },
      );
    authorizeRealtime(supabase).then(() => {
      if (active)
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") reload();
        });
    });
    return () => {
      active = false;
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, myId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(undefined);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setError("Message non envoyé, réessaie");
      return;
    }
    const message = toMessage(data);
    setMessages((list) => (list.some((x) => x.id === message.id) ? list : [...list, message]));
    setDraft("");
  }

  const today = localDate();
  return (
    <div className="flex flex-1 flex-col">
      <ol className="flex flex-1 flex-col gap-1.5 py-4" aria-live="polite">
        {messages.length === 0 && (
          <li className="text-center text-sm text-muted">
            Aucun message. Confirmez ici l&apos;horaire et le point de rendez-vous.
          </li>
        )}
        {messages.map((m, i) => {
          const day = localDate(new Date(m.createdAt));
          const showDay = i === 0 || day !== localDate(new Date(messages[i - 1].createdAt));
          const mine = m.senderId === myId;
          return (
            <li key={m.id} className="flex flex-col">
              {showDay && (
                <span className="my-2 self-center text-xs text-muted">
                  {day === today ? "Aujourd'hui" : formatDayLabel(day)}
                </span>
              )}
              <span
                className={`max-w-[80%] rounded-3xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                  mine ? "self-end bg-primary text-primary-foreground" : "self-start bg-surface"
                }`}
              >
                {m.body}
                <span className={`ml-2 text-[10px] ${mine ? "opacity-70" : "text-muted"}`}>
                  {formatClock(m.createdAt)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div ref={end} />
      <form onSubmit={send} className="sticky bottom-24 flex gap-2 border-t border-border bg-background py-3 md:bottom-0">
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          rows={1}
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Écris un message…"
          className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
        >
          Envoyer
        </button>
      </form>
      {error && (
        <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
