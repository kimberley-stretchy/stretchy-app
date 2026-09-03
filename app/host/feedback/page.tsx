"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

const AREAS = ["The app", "A session", "Something else"];
const CATEGORIES = ["Bug", "What worked", "Could be better", "Idea for later"];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill px-[14px] py-[9px] text-xs font-semibold border-2 border-ink"
      style={selected ? { background: "#14110F", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
    >
      {children}
    </button>
  );
}

export default function HostFeedbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>}>
      <HostFeedbackForm />
    </Suspense>
  );
}

function HostFeedbackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [area, setArea] = useState("The app");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sessionContext, setSessionContext] = useState(searchParams.get("session") ?? "");
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { router.push("/host/login?next=/host/feedback"); return; }
      setAccessToken(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => [...prev, ...files].slice(0, 4));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !message.trim()) return;
    setError(null);
    setSaving(true);

    const supabase = createClient();
    let imageUrls: string[] = [];

    if (images.length > 0) {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uploaded = await Promise.all(
        images.map(async (file, i) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${user!.id}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from("feedback-photos").upload(path, file, { contentType: file.type });
          if (upErr) return null;
          return supabase.storage.from("feedback-photos").getPublicUrl(path).data.publicUrl;
        })
      );
      imageUrls = uploaded.filter((u): u is string => !!u);
      setUploading(false);
    }

    const res = await fetch("/api/host/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ area, category, message, sessionContext, imageUrls }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not send — try again.");
      setSaving(false);
      return;
    }
    setSent(true);
    setSaving(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">🙏</p>
        <h1 className="font-display text-[28px] leading-none">Got it, thank you.</h1>
        <p className="text-sm text-ink/65">Kimberley reads every one of these.</p>
        <Link href="/host/home" className="underline text-sm font-semibold mt-3">Back to your dashboard →</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-purple"><SMark size={32} /></div>
          <Link href="/host/home" className="text-xs underline text-ink/55">Back</Link>
        </div>

        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] text-ink/45">FEEDBACK TO STRETCHY</div>
        <h1 className="font-display text-[30px] leading-none -mt-3">Tell us what happened.</h1>
        <p className="text-sm text-ink/65 -mt-2">Bugs, what worked, what didn&rsquo;t, ideas for later — all of it helps.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">WHERE</div>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map((a) => <Chip key={a} selected={area === a} onClick={() => setArea(a)}>{a}</Chip>)}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">WHAT KIND</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => <Chip key={c} selected={category === c} onClick={() => setCategory(c === category ? "" : c)}>{c}</Chip>)}
            </div>
          </div>

          {area === "A session" && (
            <div>
              <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">WHICH SESSION</div>
              <input
                value={sessionContext}
                onChange={(e) => setSessionContext(e.target.value)}
                placeholder="e.g. Herne Bay | Morning, Sun 14 Sep"
                className="w-full h-[50px] border-2 border-ink rounded-pill px-[18px] text-sm bg-white outline-none"
              />
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">TELL US MORE</div>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="As much detail as helps — what happened, what you'd change, what you loved."
              className="w-full min-h-[130px] border-2 border-ink rounded-2xl px-[17px] py-3.5 text-sm bg-white outline-none resize-none"
            />
          </div>

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">PHOTOS (OPTIONAL, UP TO 4)</div>
            <div className="flex flex-wrap gap-2">
              {images.map((f, i) => (
                <div key={i} className="w-16 h-16 rounded-xl border-2 border-ink overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length < 4 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-ink/40 flex items-center justify-center cursor-pointer text-ink/40 text-xl">
                  +
                  <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving || !message.trim()}
            className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
            style={{ background: "#14110F", color: "#F7F0E8" }}
          >
            {uploading ? "Uploading photos…" : saving ? "Sending…" : "Send to Stretchy"}
          </button>
        </form>
      </div>
    </main>
  );
}
