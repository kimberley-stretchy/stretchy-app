"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { MultiChipGroup } from "@/components/forms/FormPrimitives";

const ROLES = [
  { value: "teacher", label: "Teacher", desc: "I lead the movement." },
  { value: "gem", label: "Good Energy Manager", desc: "I run the room — check-ins, comfort, community." },
];
const MOVEMENT_TYPES = ["yoga", "pilates", "breath", "sound", "flow", "run", "hiit"];
const NEIGHBOURHOODS = ["Herne Bay", "Grey Lynn", "Pt Chev", "Westhaven", "Takapuna", "Mt Eden", "Newmarket", "Other"];

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

export default function HostCreateProfilePage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [practiceTypes, setPracticeTypes] = useState<string[]>([]);
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [neighbourhoodOther, setNeighbourhoodOther] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        router.push("/host/login");
        return;
      }

      if (session.user?.user_metadata?.role === "admin") {
        router.push("/admin");
        return;
      }

      setAccessToken(session.access_token);
      setName(session.user.user_metadata?.full_name ?? "");

      fetch("/api/host/onboarding", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.host) router.push("/host/home");
          else setChecking(false);
        })
        .catch(() => setChecking(false));
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setAvatarError(null);
    setUploadingAvatar(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setAvatarError("Could not upload — try a smaller photo.");
      setUploadingAvatar(false);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${pub.publicUrl}?t=${Date.now()}`);
    setUploadingAvatar(false);
  }

  function toggleRole(v: string) {
    setRoles((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function toggleType(v: string) {
    setPracticeTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    if (roles.length === 0) {
      setError("Pick at least one — teacher, GEM, or both.");
      return;
    }
    setSaving(true);
    setError(null);
    const resolvedNeighbourhoods = neighbourhoods.includes("Other")
      ? [...neighbourhoods.filter((n) => n !== "Other"), neighbourhoodOther].filter(Boolean)
      : neighbourhoods;

    const res = await fetch("/api/host/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name, roles, practiceTypes, neighbourhoods: resolvedNeighbourhoods, bio, avatarUrl }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save your profile.");
      setSaving(false);
      return;
    }
    router.push("/host/home");
  }

  if (checking) {
    return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back to Stretchy" className="text-purple"><SMark size={32} /></Link>
          <Link href="/" aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-pill border-2 border-ink text-lg leading-none">×</Link>
        </div>

        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] text-ink/45">SET UP YOUR PROFILE</div>
        <h1 className="font-display text-[30px] leading-none -mt-3">How will you show up?</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">YOUR PHOTO</div>
            <div className="flex items-center gap-4">
              <label
                htmlFor="avatar-input"
                className="w-16 h-16 rounded-full border-2 border-ink flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden bg-white"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Your photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-ink/30">+</span>
                )}
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div className="text-xs text-ink/55">
                {uploadingAvatar ? "Uploading…" : avatarUrl ? "Looking good. Tap to change." : "Tap to take or choose a photo."}
              </div>
            </div>
            {avatarError && <p className="text-xs font-semibold mt-2" style={{ color: "#C6362E" }}>{avatarError}</p>}
          </div>

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">YOUR NAME</div>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last"
              className="w-full h-[50px] border-2 border-ink rounded-pill px-[18px] text-sm bg-white outline-none"
            />
          </div>

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">YOU ARE A</div>
            <div className="flex flex-col gap-2">
              {ROLES.map((r) => {
                const selected = roles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className="text-left rounded-2xl p-4 border-2 border-ink"
                    style={selected ? { background: "#902F8A", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
                  >
                    <div className="font-display text-lg leading-none">{r.label}</div>
                    <div className="text-xs mt-1.5 opacity-80">{r.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-2 text-ink/55">Not exclusive — you can be both.</p>
          </div>

          {roles.includes("teacher") && (
            <div>
              <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">WHAT YOU TEACH</div>
              <div className="flex flex-wrap gap-1.5">
                {MOVEMENT_TYPES.map((t) => (
                  <Chip key={t} selected={practiceTypes.includes(t)} onClick={() => toggleType(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">WHERE YOU CAN GO</div>
            <MultiChipGroup
              options={NEIGHBOURHOODS}
              values={neighbourhoods}
              onChange={setNeighbourhoods}
              otherValue={neighbourhoodOther}
              onOtherChange={setNeighbourhoodOther}
            />
            <p className="text-xs mt-2 text-ink/55">Pick as many as suit you.</p>
          </div>

          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">A LITTLE ABOUT YOU (OPTIONAL)</div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Style, experience, what people should know before your session"
              className="w-full min-h-[90px] border-2 border-ink rounded-2xl px-[17px] py-3.5 text-sm bg-white outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
            style={{ background: "#14110F", color: "#F7F0E8" }}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
