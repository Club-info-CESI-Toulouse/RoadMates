import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
      <p className="text-center text-3xl font-bold tracking-tight">
        RoadMates<span className="text-primary">_</span>
      </p>
      {children}
      <Link href="/mentions-legales" className="text-center text-xs text-muted underline">
        Mentions légales et données personnelles
      </Link>
    </main>
  );
}
