import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  otherName: string;
  lastMessage: string | null;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: boolean;
};

export type ChatMessage = { id: string; senderId: string; body: string; createdAt: string };

const MESSAGES_LOADED = 100;

async function names(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.display_name]));
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, a_read_at, b_read_at, last_message_at, last_sender_id, last_message")
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false });
  const rows = data ?? [];
  const other = (c: (typeof rows)[number]) => (c.user_a === userId ? c.user_b : c.user_a);
  const byId = await names([...new Set(rows.map(other))]);

  return rows.map((c) => {
    const readAt = c.user_a === userId ? c.a_read_at : c.b_read_at;
    return {
      id: c.id,
      otherName: byId.get(other(c)) ?? "Ancien membre",
      lastMessage: c.last_message,
      lastAt: c.last_message_at,
      lastFromMe: c.last_sender_id === userId,
      unread: c.last_sender_id !== userId && (!readAt || readAt < c.last_message_at!),
    };
  });
}

export async function getConversation(userId: string, id: string) {
  const supabase = await createClient();
  const { data: conv } = await supabase.from("conversations").select("id, user_a, user_b").eq("id", id).maybeSingle();
  if (!conv) return null;
  const otherId = conv.user_a === userId ? conv.user_b : conv.user_a;
  const [byId, { data: messages }] = await Promise.all([
    names([otherId]),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_LOADED),
    supabase.rpc("mark_conversation_read", { p_id: id }),
  ]);
  return {
    id,
    otherName: byId.get(otherId) ?? "Ancien membre",
    messages: (messages ?? [])
      .reverse()
      .map((m): ChatMessage => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at })),
  };
}
