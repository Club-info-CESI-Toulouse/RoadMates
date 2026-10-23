"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Auto" },
];

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyPreference(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function ThemeSwitcher() {
  // Server snapshot "system" keeps hydration consistent; the stored value applies right after.
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  function select(value: ThemePreference) {
    try {
      if (value === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
    applyPreference(value);
    listeners.forEach((listener) => listener());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex rounded-full border border-border bg-surface p-1"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => select(option.value)}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-muted transition-colors aria-checked:bg-primary aria-checked:text-primary-foreground"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
