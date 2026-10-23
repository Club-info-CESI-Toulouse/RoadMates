import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Messagerie · RoadMates" };

export default function MessagesPage() {
  return (
    <PageShell title="Messagerie">
      <p className="text-muted">Aucune conversation pour l&apos;instant.</p>
    </PageShell>
  );
}
