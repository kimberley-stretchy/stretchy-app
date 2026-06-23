"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── MENU ROW (link) ──────────────────────────────────────────────────────────
export function MenuRow({
  href,
  label,
  icon,
  accent,
  accentText,
  destructive,
  onClick,
}: {
  href?: string;
  label: string;
  icon?: string;
  accent?: string;
  accentText?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  const base =
    "flex items-center justify-between w-full px-3 py-3 rounded-stretchy text-sm font-semibold transition-all duration-150 active:scale-[0.98] text-left";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${destructive ? "text-red-500" : "text-ink hover:bg-sand-dark"}`}>
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-base">{icon}</span>}
          <span>{label}</span>
        </div>
        <span className="opacity-50">›</span>
      </button>
    );
  }

  if (accent) {
    return (
      <Link href={href!} className={`${base} text-white`} style={{ backgroundColor: accent, color: accentText ?? "#fff" }}>
        <span>{label}</span>
        <span className="opacity-70">›</span>
      </Link>
    );
  }

  if (destructive) {
    return (
      <Link href={href!} className={`${base} text-red-500`}>
        <span>{label}</span>
        <span className="opacity-50">›</span>
      </Link>
    );
  }

  return (
    <Link href={href!} className={`${base} text-ink hover:bg-sand-dark`}>
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-base">{icon}</span>}
        <span>{label}</span>
      </div>
      <span className="text-muted">›</span>
    </Link>
  );
}

// ─── MENU DRAWER ──────────────────────────────────────────────────────────────
export function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [userName, setUserName] = useState("Stretchy Member");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Member");
        setUserEmail(session.user.email ?? "");
        setIsAdmin(session.user.user_metadata?.role === "admin");
      } else {
        setUserName("Stretchy Member");
        setUserEmail("");
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/account/delete", {
        method: "DELETE",
        headers: session ? { "Authorization": `Bearer ${session.access_token}` } : {},
      });
      await supabase.auth.signOut();
      onClose();
      router.push("/?deleted=1");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const initial = userName.charAt(0).toUpperCase();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      )}

      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-cream shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* User header */}
        <div className="px-5 pt-8 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-olive flex items-center justify-center text-cream font-bold text-lg flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink leading-tight truncate">{userName}</p>
              <p className="text-xs text-muted truncate">{userEmail}</p>
            </div>
            {isAdmin && (
              <span className="font-mono text-xs font-bold px-2 py-1 rounded-pill flex-shrink-0" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">You</p>
            <MenuRow href="/profile" label="Profile & account" icon="👤" />
          </div>

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Sessions</p>
            <MenuRow href="/sessions" label="Pick your stretch" icon="🧘" />
            <MenuRow href="/suggest" label="Suggest a Stretchy" icon="💡" />
          </div>

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Help</p>
            <MenuRow href="/contact" label="Contact Stretchy" icon="✉" />
          </div>

          {isAdmin && (
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Stretchy HQ</p>
              <MenuRow href="/admin" label="Admin dashboard" icon="🏢" />
              <MenuRow href="/admin/sessions" label="Sessions" icon="🧘" />
            </div>
          )}

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Account</p>
            <MenuRow label="Sign out" icon="→" onClick={handleSignOut} />

            {!showDeleteConfirm ? (
              <MenuRow label="Delete my account" icon="✕" onClick={handleDeleteAccount} destructive />
            ) : (
              <div className="px-3 py-3 rounded-stretchy bg-red-50 border border-red-200">
                <p className="text-xs text-red-700 font-semibold mb-2">
                  Are you sure? This permanently deletes your account and all your data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-pill text-xs font-bold border border-border text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-pill text-xs font-bold bg-red-500 text-white"
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            )}
          </div>

        </nav>
      </div>
    </>
  );
}
