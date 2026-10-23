"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DISMISS_KEY = "install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

type Platform = { ios: boolean; mobile: boolean; standalone: boolean };
const SERVER_PLATFORM: Platform = { ios: false, mobile: false, standalone: true };
let cached: Platform | null = null;

function readPlatform(): Platform {
  if (!cached) {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac with touch support.
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    cached = {
      ios,
      mobile: ios || /Android|Mobi/i.test(ua),
      standalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    };
  }
  return cached;
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

// Install guide, mobile only: iOS gets manual steps (Safari has no install prompt), others a button.
export function InstallPrompt({ dismissible = false }: { dismissible?: boolean }) {
  const platform = useSyncExternalStore(noopSubscribe, readPlatform, () => SERVER_PLATFORM);
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (platform.standalone || !platform.mobile) return null;
  if (dismissible && (storedDismissed || dismissed)) return null;
  if (!platform.ios && !deferred) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">Installe RoadMates sur ton téléphone</p>
        {dismissible && (
          <button type="button" onClick={dismiss} aria-label="Fermer" className="text-muted">
            ✕
          </button>
        )}
      </div>
      {platform.ios ? (
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Ouvre cette page dans Safari.</li>
          <li>
            Touche le bouton <strong className="text-foreground">Partager</strong> (carré avec une
            flèche vers le haut).
          </li>
          <li>
            Choisis <strong className="text-foreground">Sur l&apos;écran d&apos;accueil</strong>,
            puis <strong className="text-foreground">Ajouter</strong>.
          </li>
          <li>Ouvre RoadMates depuis son icône pour recevoir les notifications.</li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => deferred?.prompt().then(() => setDeferred(null))}
          className="self-start rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Installer l&apos;application
        </button>
      )}
    </aside>
  );
}
