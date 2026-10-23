export const THEME_STORAGE_KEY = "theme";
export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

// Runs before first paint: resolves the stored preference (default "system")
// into data-theme on <html> and follows OS changes while in "system" mode.
export const themeInitScript = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark")p=m.matches?"dark":"light";d.setAttribute("data-theme",p)}a();m.addEventListener("change",a)}catch(e){}})()`;
