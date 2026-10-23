"use client";

import { useState, useTransition } from "react";
import { openConversation } from "@/app/(app)/messagerie/actions";

export function MessageButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        aria-label={`Écrire à ${name}`}
        onClick={() =>
          startTransition(async () => {
            const result = await openConversation(userId);
            if (result?.error) setError(result.error);
          })
        }
        className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        Message
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
