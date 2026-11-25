"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import ShareRow from "@/components/ShareRow";
import { createClient } from "@/lib/supabase/client";
import { generalShareMessage } from "@/lib/shareMessage";

// Invite a mate: each person's own link, stretchyyoga.co.nz/i/{code}.
// We only count how many people join through it, never who.
// SOCIAL_BOOKING_BRIEF.md 0d.

const SITE = "https://www.stretchyyoga.co.nz";
const SHARE_LINE = "The more who join, the better it gets — the price, the vibes, the community.";

type State =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "error"; message: string }
  | { kind: "ready"; code: string; joined: number };

export default function InvitePage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let done = false;
    const load = (token: string | null) => {
      if (done) return;
      if (!token) { setState({ kind: "signedOut" }); return; }
      done = true;
      fetch("/api/profile/invite", { headers: { Authorization: `Bearer ${token}` } })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (r.ok && data.code) setState({ kind: "ready", code: data.code, joined: data.joined ?? 0 });
          else setState({ kind: "error", message: data.error ?? "Your invite link isn’t ready yet. Try again soon." });
        })
        .catch(() => setState({ kind: "error", message: "Your invite link isn’t ready yet. Try again soon." }));
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.access_token ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) load(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  const url = state.kind === "ready" ? `${SITE}/i/${state.code}` : "";
  const share = generalShareMessage(url);

  return (
    <main className="min-h-screen bg-cream pb-20">
      {/* NAV */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/profile" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Invite
        </span>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        <h1
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
        >
          Invite your<br />mates.
        </h1>

        {/* Mechanic card */}
        <div
          className="rounded-card px-5 py-5"
          style={{ backgroundColor: "#FCBB16", border: "2px solid #14110F" }}
        >
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(26,26,26,0.55)" }}>
            How it works
          </p>
          <div className="space-y-3">
            {[
              { icon: "🔗", text: "Share your personal link below." },
              { icon: "🧘", text: "Your mate joins and holds their first place." },
              { icon: "🙌", text: SHARE_LINE },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-sm font-semibold text-ink leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Link card */}
        <div className="bg-white rounded-card border-2 border-ink p-4 space-y-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Your link</p>

          {state.kind === "loading" && <p className="text-sm text-muted">Getting your link…</p>}

          {state.kind === "signedOut" && (
            <p className="text-sm text-ink">
              <Link href="/login?next=/profile/invite" className="font-bold underline">Log in</Link> to get your invite link.
            </p>
          )}

          {state.kind === "error" && <p className="text-sm text-ink">{state.message}</p>}

          {state.kind === "ready" && (
            <>
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-pill" style={{ backgroundColor: "#F7F0E8" }}>
                <p className="flex-1 font-mono text-xs text-ink truncate min-w-0 select-all">{url.replace("https://www.", "")}</p>
              </div>
              <ShareRow message={share.body} url={url} emailSubject={share.subject} />
            </>
          )}
        </div>

        {state.kind === "ready" && state.joined > 0 && (
          <p className="text-center font-bold text-ink" style={{ textWrap: "balance" } as React.CSSProperties}>
            {state.joined === 1 ? "1 person has" : `${state.joined} people have`} come to Stretchy through you 💛
          </p>
        )}

        <p className="text-xs text-muted text-center">We only count how many join through your link.</p>
      </div>
    </main>
  );
}
