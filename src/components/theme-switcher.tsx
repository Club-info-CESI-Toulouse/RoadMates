"use client";

import { useState } from "react";
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

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
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
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  function select(value: ThemePreference) {
    setPreference(value);
    try {
      if (value === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {}
    applyPreference(value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex rounded-full border border-border bg-surface p-1"
      suppressHydrationWarning
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => select(option.value)}
          suppressHydrationWarning
          className="rounded-full px-4 py-1.5 text-sm font-medium text-muted transition-colors aria-checked:bg-primary aria-checked:text-primary-foreground"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
