"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { requestPushPermission } from "@/lib/push";

const SETTINGS = [
  { label: "Notifications", icon: "🔔", href: "/profile/notifications" },
  { label: "Payment method", icon: "💳", href: "/profile/payment" },
  { label: "Invite a mate", icon: "👥", href: "/profile/invite" },
  { label: "Suggest a session", icon: "💡", href: "/suggest" },
  { label: "Become a host", icon: "🎙️", href: "/host/apply" },
  { label: "Help & contact", icon: "💬", href: "/profile/help" },
];

const TYPE_COLORS: Record<string, string> = {
  yoga: "#902F8A", pilates: "#0000FF", breath: "#716F39",
  sound: "#29ABE2", flow: "#E96709", run: "#C6362E", hiit: "#0000FF",
};

type Hold = {
  id: string;
  state: string;
  sessions: {
    id: string;
    title: string;
    starts_at: string;
    movement_type: string;
    state: string;
  } | null;
};

type Attendee = {
  name: string;
  email: string;
  neighbourhood: string | null;
  sessions_attended: number;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; initial: string } | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [upcomingHolds, setUpcomingHolds] = useState<Hold[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { router.push("/login"); return; }
      setAccessToken(session.access_token);

      const u = session.user;
      const name = u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "Member";
      setUser({ name, email: u.email ?? "", initial: name.charAt(0).toUpperCase() });

      // Fetch attendee record
      const res = await fetch("/api/admin/sessions"); // reuse same auth
      // Get attendee + holds via Supabase
      const { data: att } = await supabase
        .from("attendees")
        .select("name, email, neighbourhood, sessions_attended, created_at")
        .eq("auth_user_id", u.id)
        .single();
      if (att) setAttendee(att);

      // Fetch upcoming active holds
      const { data: holds } = await supabase
        .from("holds")
        .select("id, state, sessions(id, title, starts_at, movement_type, state)")
        .eq("user_id", u.id)
        .in("state", ["active", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (holds) {
        const upcoming = (holds as unknown as Hold[]).filter(h => {
          const s = h.sessions;
          if (!s) return false;
          return new Date(s.starts_at) > new Date();
        });
        setUpcomingHolds(upcoming);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const joinedDate = attendee?.created_at
    ? new Date(attendee.created_at).toLocaleDateString("en-NZ", { month: "short", year: "2-digit" })
    : "";

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Profile</p>
        <Link href="/sessions" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 pt-2 pb-2">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl flex-shrink-0" style={{ backgroundColor: "#716F39" }}>
            {user?.initial ?? "?"}
          </div>
          <div>
            <h1 className="font-display font-bold text-ink" style={{ fontSize: "26px", letterSpacing: "-0.02em" }}>
              {user?.name ?? "Loading…"}
            </h1>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mt-0.5">
              {attendee?.neighbourhood ?? ""}{attendee?.neighbourhood && joinedDate ? " · " : ""}{joinedDate ? `Joined ${joinedDate}` : ""}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-card border-2 border-ink p-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="font-display font-bold text-ink" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
              {attendee?.sessions_attended ?? 0}
            </p>
            <p className="font-mono text-xs text-muted uppercase tracking-widest">Sessions</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-ink" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
              {upcomingHolds.length}
            </p>
            <p className="font-mono text-xs text-muted uppercase tracking-widest">Coming up</p>
          </div>
        </div>

        {/* Upcoming holds */}
        {upcomingHolds.length > 0 && (
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">Coming up</p>
            <div className="space-y-2">
              {upcomingHolds.map(h => {
                const s = h.sessions;
                if (!s) return null;
                const typeColor = TYPE_COLORS[s.movement_type] ?? "#888";
                const startDate = new Date(s.starts_at);
                const dayStr = startDate.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
                const timeStr = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
                const isConfirmed = s.state === "confirmed" || h.state === "confirmed";
                return (
                  <Link key={h.id} href={`/hold/${s.id}`} className="block bg-white rounded-card border-2 border-ink p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: typeColor }}>
                        {s.movement_type.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink text-sm truncate">{s.title}</p>
                        <p className="font-mono text-xs text-muted mt-0.5">{dayStr} · {timeStr}</p>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded-pill flex-shrink-0"
                        style={{ background: isConfirmed ? "rgba(76,175,130,0.12)" : "rgba(255,209,102,0.2)", color: isConfirmed ? "#716F39" : "#14110F" }}>
                        {isConfirmed ? "GOING AHEAD" : "HOLDING"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {upcomingHolds.length === 0 && !attendee && (
          <div className="bg-white rounded-card border-2 border-ink p-6 text-center">
            <p className="text-2xl mb-2">🧘</p>
            <p className="font-bold text-ink mb-1">No upcoming sessions</p>
            <p className="text-sm text-muted mb-4">Browse what's on and hold your first spot.</p>
            <Link href="/sessions" className="font-semibold text-sm px-6 py-3 rounded-pill transition-all" style={{ backgroundColor: "#14110F", color: "#F7F0E8" }}>
              Browse sessions →
            </Link>
          </div>
        )}

        {/* Settings */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">Settings</p>
          <div className="bg-white rounded-card border-2 border-ink overflow-hidden">
            {SETTINGS.map((s, i) => (
              <Link key={s.href} href={s.href}
                className="flex items-center justify-between px-5 py-4 hover:bg-sand-dark transition-colors"
                style={{ borderTop: i === 0 ? "none" : "1px solid #E1D5C6" }}>
                <div className="flex items-center gap-3">
                  <span className="text-base">{s.icon}</span>
                  <span className="font-semibold text-sm text-ink">{s.label}</span>
                </div>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Push notifications */}
        <PushButton accessToken={accessToken} />

        {/* Email */}
        {user?.email && (
          <p className="text-center font-mono text-xs text-muted">{user.email}</p>
        )}
      </div>
    </main>
  );
}

function PushButton({ accessToken }: { accessToken: string | null }) {
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
