"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPushAction,
  setNotificationPreference,
} from "./notifications-actions";

type DeviceState = "unsupported" | "denied" | "off" | "on" | "loading";

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function NotificationSettings({ pushEnabled, emailEnabled }: { pushEnabled: boolean; emailEnabled: boolean }) {
  const [device, setDevice] = useState<DeviceState>("loading");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    (supported ? navigator.serviceWorker.ready : Promise.reject())
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setDevice(sub ? "on" : Notification.permission === "denied" ? "denied" : "off"))
      .catch(() => setDevice("unsupported"));
  }, []);

  async function runTest(endpoint: string) {
    setTestSent(false);
    setError(undefined);
    if (await sendTestPushAction(endpoint)) setTestSent(true);
    else setError("La notification de test n'a pas pu être envoyée");
  }

  function sendTest() {
    startTransition(async () => {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) await runTest(sub.endpoint);
    });
  }

  function enableDevice() {
    setError(undefined);
    startTransition(async () => {
      try {
        if ((await Notification.requestPermission()) !== "granted") {
          setDevice("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });
        if (!(await savePushSubscription(sub.toJSON()))) {
          setError("Activation impossible, réessaie");
          return;
        }
        setDevice("on");
        await runTest(sub.endpoint);
      } catch {
        setError("Activation impossible sur cet appareil");
      }
    });
  }

  function disableDevice() {
    startTransition(async () => {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setDevice("off");
    });
  }

  const toggle = (channel: "push" | "email", value: boolean) =>
    startTransition(() => setNotificationPreference(channel, value));

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-center justify-between gap-3">
        Notifications push
        <input type="checkbox" className="size-5 accent-primary" checked={pushEnabled} disabled={pending} onChange={(e) => toggle("push", e.target.checked)} />
      </label>
      <label className="flex items-center justify-between gap-3">
        Emails (si le push n&apos;est pas reçu)
        <input type="checkbox" className="size-5 accent-primary" checked={emailEnabled} disabled={pending} onChange={(e) => toggle("email", e.target.checked)} />
      </label>
      {pushEnabled && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
          {device === "on" && (
            <div className="flex items-center justify-between gap-3">
              <span>Push activé sur cet appareil</span>
              <button type="button" disabled={pending} onClick={disableDevice} className="text-muted underline">
                Désactiver
              </button>
            </div>
          )}
          {device === "on" && (
            <button type="button" disabled={pending} onClick={sendTest} className="self-start underline disabled:opacity-60">
              Envoyer une notification de test
            </button>
          )}
          {device === "on" && testSent && (
            <span role="status" className="text-muted">
              Test envoyé. Si rien n&apos;arrive d&apos;ici quelques secondes, vérifie les réglages de notifications de ton téléphone.
            </span>
          )}
          {device === "off" && (
            <button type="button" disabled={pending} onClick={enableDevice} className="self-start rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-60">
              Activer le push sur cet appareil
            </button>
          )}
          {device === "denied" && <span className="text-muted">Notifications bloquées dans les réglages du navigateur. Tu recevras des emails.</span>}
          {device === "unsupported" && (
            <span className="text-muted">
              Push indisponible ici. Sur iPhone, installe d&apos;abord l&apos;app sur l&apos;écran d&apos;accueil. Tu recevras des emails en attendant.
            </span>
          )}
          {error && <span role="alert" className="text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}
    </div>
  );
}
