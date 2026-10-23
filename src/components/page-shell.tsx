import type { ReactNode } from "react";

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
        <h1 className="text-2xl font-bold">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}
