"use client";

import { useEffect, useState } from "react";

// Shared push-enable control — handles the real permission/subscription flow,
// including the iOS constraint that Safari only supports web push for a site
// installed via Add to Home Screen. Used on /profile and /profile/notifications
// so both show the same real status instead of one page faking it.
export default function PushButton({ accessToken }: { accessToken: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    setSupported("Notification" in window);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setPermission("Notification" in window ? Notification.permission : null);
    setReady(true);
  }, []);

  async function enable() {
    if (!accessToken) { setStatus("error"); setMsg("Not logged in — please log in first"); return; }
    setStatus("loading");
    setMsg("Registering…");
    try {
      const { registerServiceWorker } = await import("@/lib/push");
      const reg = await registerServiceWorker();
      if (!reg) { setStatus("error"); setMsg("Service worker not supported on this browser"); return; }

      setMsg("Requesting permission…");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setStatus("error"); setMsg(`Permission ${perm} — check your phone Settings`); return; }

      setMsg("Subscribing…");
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const b64 = (s: string) => { const p = "=".repeat((4 - s.length % 4) % 4); return atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); };
      const key = Uint8Array.from(Array.from(b64(vapidKey)).map(c => c.charCodeAt(0)));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

      setMsg("Saving…");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) { const d = await res.json(); setStatus("error"); setMsg(`Save failed: ${d.error}`); return; }

      setStatus("done");
      setMsg("Notifications enabled ✓ You're all set!");
    } catch (err: unknown) {
      setStatus("error");
      setMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!ready || !supported) return null;

  if (isIOS && !isStandalone) {
    return (
      <div className="bg-white rounded-card border-2 border-ink p-4 text-center">
        <p className="font-bold text-ink text-sm mb-2">📲 Add to Home Screen for notifications</p>
        <p className="text-xs text-muted leading-relaxed">
          On iPhone, push notifications require the app to be installed. Tap <strong>Share → Add to Home Screen</strong> in Safari, then open Stretchy from your home screen and enable notifications.
        </p>
      </div>
    );
  }

  if (status === "done" || permission === "granted") {
    return (
      <div className="bg-white rounded-card border-2 border-ink p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-ink">Push notifications</p>
          <p className="text-xs text-muted mt-0.5">{msg || "You'll get alerts at 36h and 2h before sessions"}</p>
        </div>
        {status !== "done" && permission === "granted" && (
          <button onClick={enable} disabled={status === "loading"} className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ background: "rgba(26,26,26,0.06)", color: "#14110F" }}>
            {status === "loading" ? "…" : "RE-ENABLE"}
          </button>
        )}
        {status === "done" && <span style={{ color: "#716F39" }}>✓</span>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={enable} disabled={status === "loading" || !accessToken}
        className="w-full font-semibold rounded-pill py-4 transition-all hover:brightness-110 disabled:opacity-50"
        style={{ backgroundColor: "#716F39", color: "#F7F0E8", fontSize: "15px" }}>
        {status === "loading" ? `⏳ ${msg || "Enabling…"}` : "🔔 Enable push notifications"}
      </button>
      {status === "error" && (
        <p className="text-center text-xs mt-2 font-semibold" style={{ color: "#C6362E" }}>{msg}</p>
      )}
    </div>
  );
}
