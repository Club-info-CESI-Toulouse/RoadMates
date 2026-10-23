"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ITEMS = [
  {
    href: "/",
    label: "Accueil",
    icon: icon(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>,
    ),
  },
  {
    href: "/messagerie",
    label: "Messagerie",
    icon: icon(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />),
  },
  {
    href: "/trajets",
    label: "Mes trajets",
    icon: icon(
      <>
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5" />
      </>,
    ),
  },
  {
    href: "/compte",
    label: "Compte",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>,
    ),
  },
] as const;

// Bottom tab bar on mobile, sidebar from md up. The static fallback (no active tab)
// keeps the shell prerenderable on dynamic routes.
export function AppNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <ActiveNavBar />
    </Suspense>
  );
}

function ActiveNavBar() {
  return <NavBar pathname={usePathname()} />;
}

function NavBar({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    !!pathname &&
    (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-t-0 md:border-r md:pb-0"
    >
      <p className="hidden px-6 py-6 text-2xl font-bold tracking-tight md:block">
        RoadMates<span className="text-primary">_</span>
      </p>
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:px-3">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm ${
                  active
                    ? "text-foreground md:bg-primary md:text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`rounded-full px-4 py-0.5 md:p-0 ${active ? "bg-primary text-primary-foreground md:bg-transparent" : ""}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
