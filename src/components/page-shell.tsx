import type { ReactNode } from "react";
import { LogoMark } from "./logo";

// Common page frame: title row (optional action on the right) + centered content.
export function PageShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LogoMark className="size-9 md:hidden" />
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
