import { InstallPrompt } from "@/components/install-prompt";
import { PageShell } from "@/components/page-shell";

export default function HomePage() {
  return (
    <PageShell title="Accueil">
      <InstallPrompt dismissible />
      <p className="text-muted">Les propositions de covoiturage apparaîtront ici.</p>
    </PageShell>
  );
}
