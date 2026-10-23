import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="flex justify-center">
        <Logo className="h-12" />
      </div>
      {children}
      <Link href="/mentions-legales" className="text-center text-xs text-muted underline">
        Mentions légales et données personnelles
      </Link>
    </main>
  );
}
