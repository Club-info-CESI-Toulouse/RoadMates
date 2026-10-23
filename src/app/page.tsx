import { ThemeSwitcher } from "@/components/theme-switcher";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-4xl font-bold tracking-tight">
        RoadMates<span className="text-primary">_</span>
      </h1>
      <p className="text-center text-muted">
        Covoiturage régulier entre camarades de classe.
      </p>
      <ThemeSwitcher />
    </main>
  );
}
