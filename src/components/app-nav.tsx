"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { authorizeRealtime, createClient } from "@/lib/supabase/client";

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
  const pathname = usePathname();
  return <NavBar pathname={pathname} unread={useUnreadCount(pathname)} />;
}

// Conversations with unread messages, live (RLS scopes the stream to the user).
function useUnreadCount(pathname: string | null) {
  const [count, setCount] = useState(0);
  const [supabase] = useState(createClient);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      supabase.rpc("unread_conversations_count").then(({ data }) => {
        if (active) setCount(data ?? 0);
      });
    refresh();
    const channel = supabase
      .channel("unread-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh);
    authorizeRealtime(supabase).then(() => {
      if (active) channel.subscribe();
    });
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, pathname]);

  return count;
}

function NavBar({ pathname, unread = 0 }: { pathname: string | null; unread?: number }) {
  const isActive = (href: string) =>
    !!pathname &&
    (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-full border border-border bg-card/85 shadow-lg backdrop-blur-xl md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:h-dvh md:w-64 md:shrink-0 md:rounded-none md:border-y-0 md:border-l-0 md:bg-card md:shadow-none md:backdrop-blur-none"
    >
      <div className="hidden px-6 py-7 md:block">
        <Logo className="h-9" />
      </div>
      <ul className="grid grid-cols-4 px-1 py-1 md:flex md:flex-col md:gap-1 md:px-3 md:py-0">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium md:flex-row md:gap-3 md:rounded-full md:px-4 md:py-2.5 md:text-sm ${
                  active
                    ? "text-foreground md:bg-primary md:text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`relative rounded-full px-4 py-0.5 md:p-0 ${active ? "bg-primary text-primary-foreground md:bg-transparent" : ""}`}
                >
                  {item.icon}
                  {item.href === "/messagerie" && unread > 0 && (
                    <span className="absolute top-0 right-2 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-bold text-white md:-top-1.5 md:-right-2">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {item.label}
                {item.href === "/messagerie" && unread > 0 && (
                  <span className="sr-only">, {unread} conversation{unread > 1 ? "s" : ""} non lue{unread > 1 ? "s" : ""}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
