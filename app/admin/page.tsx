"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

const ADMIN_SCREENS = [
  { href: "/admin/sessions",    label: "Sessions",                    icon: "🧘", desc: "Create & manage sessions" },
  { href: "/admin/vetting",     label: "ADM-01 · Vetting queue",     icon: "👥", desc: "6 in queue" },
  { href: "/admin/live",        label: "ADM-02 · Live Platform",      icon: "🔴", desc: "47 live · 2 need help" },
  { href: "/admin/suggestions", label: "ADM-03 · Suggestions",        icon: "💡", desc: "5 live · 140 votes" },
  { href: "/admin/finance",     label: "ADM-04 · Finance",            icon: "💰", desc: "$4,310 fees · May" },
  { href: "/admin/attendees",   label: "ADM-05 · Attendee CRM",       icon: "🧑‍🤝‍🧑", desc: "1,847 active" },
  { href: "/admin/hosts",       label: "ADM-06 · Host CRM",           icon: "🎙️", desc: "42 active · 2 at risk" },
  { href: "/admin/waitlist",    label: "ADM-07 · Host Waitlist",      icon: "⏳", desc: "2 NEW · 6 total" },
  { href: "/admin/moderation",  label: "ADM-08 · Moderation",         icon: "🎬", desc: "12 in queue" },
  { href: "/admin/analytics",   label: "ADM-09 · Analytics",          icon: "📊", desc: "187 sessions · +31% MoM" },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user?.user_metadata?.role;
      if (!session) { router.replace("/login?next=/admin"); return; }
      if (role !== "admin") { router.replace("/home?error=not_authorised"); return; }
      setChecked(true);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (!checked) return null;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ</p>
        </div>
        <Link href="/home" className="font-mono text-xs font-bold text-muted hover:text-ink transition-colors">← App</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">Internal · Admin only</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The<br />platform.
          </h1>
        </div>

        <div className="space-y-2">
          {ADMIN_SCREENS.map((s) => (
            <Link key={s.href} href={s.href} className="block group">
              <div className="bg-white rounded-card shadow-card p-4 flex items-center gap-3 group-hover:shadow-card-hover transition-shadow">
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm">{s.label}</p>
                  <p className="font-mono text-xs text-muted mt-0.5">{s.desc}</p>
                </div>
                <span className="text-muted text-lg">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
