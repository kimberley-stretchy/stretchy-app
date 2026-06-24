"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

const VIBE_TAGS = ["Strong flow", "Welcoming", "Good cues", "Punctual", "Felt the connection", "Loved the Social Stretch", "Other"];

type Session = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string;
};

export default function RateItPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sessions?id=${params.id}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        const found = Array.isArray(data) ? data.find(s => s.id === params.id) : null;
        setSession(found ?? null);
      });
  }, [params.id]);

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession) {
        await fetch("/api/ratings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            session_id: params.id,
            rating,
            tags,
            note,
          }),
        }).catch(console.error);
      }
    } catch { /* non-blocking */ }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => router.push("/sessions"), 2000);
  }

  const title = session?.title ?? "Your session";
  const displayRating = hovered || rating;

  if (submitted) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <SMark size={64} className="text-olive mb-6" />
        <h1 className="font-display font-bold text-ink mb-3" style={{ fontSize: "40px", letterSpacing: "-0.03em" }}>Thanks! 🙌</h1>
        <p className="text-muted text-sm">Your feedback helps Stretchy get better.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Rate this</p>
        <Link href="/sessions" className="font-mono text-xs font-bold text-muted hover:text-ink transition-colors">SKIP</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            {session ? new Date(session.starts_at).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + " · " + session.location_name : ""}
          </p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(36px, 10vw, 48px)", letterSpacing: "-0.03em", lineHeight: "1.0" }}>
            How was<br />{title}?
          </h1>
        </div>

        {/* Star rating */}
        <div className="bg-white rounded-card shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">Tap to rate</p>
            {displayRating > 0 && (
              <p className="font-mono text-xs font-bold" style={{ color: "#2C8FE0" }}>
                {["", "Could be better", "It was ok", "Pretty good", "Loved it", "SSSS — best ever"][displayRating]}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className="flex-1 flex items-center justify-center transition-all"
                style={{ height: 48 }}
              >
                <SMark size={36} className={n <= displayRating ? "text-blue-500" : "text-gray-200"} />
              </button>
            ))}
          </div>
        </div>

        {/* Vibe tags */}
        {rating > 0 && (
          <>
            <div className="bg-white rounded-card shadow-card p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-3">What was the vibe?</p>
              <div className="flex flex-wrap gap-2">
                {VIBE_TAGS.map(tag => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => setTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className="px-4 py-2 rounded-pill text-sm font-semibold transition-all"
                      style={{ background: selected ? "#2C8FE0" : "rgba(26,26,26,0.06)", color: selected ? "#fff" : "#1A1A1A" }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-card shadow-card p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-3">A note for the host (optional)</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Loved the music. Felt safe trying the headstand for the first time."
                rows={3}
                className="w-full text-sm text-ink placeholder-muted resize-none outline-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full font-semibold rounded-pill py-4 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", fontSize: "16px" }}
            >
              {submitting ? "Sending…" : "Submit rating →"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
