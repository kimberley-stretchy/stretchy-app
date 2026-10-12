"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { takeNext } from "@/lib/authReturn";

// Safety net for sign-in links that come back to the wrong page.
//
// Normally a sign-in link returns to /auth/callback, which finishes signing in
// and sends the person on. If the sign-in service instead drops them on some
// other page with the sign-in code still in the address (it falls back to the
// site's home page when it doesn't recognise the return address), nothing there
// would finish the sign-in — they'd be left on the homepage, signed out, with
// their booking forgotten. This finishes it and takes them where they were going.
export default function AuthReturn() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/auth/callback") return; // that page handles itself
    const params = new URLSearchParams(window.location.search);
    if (!params.get("code")) return; // not a sign-in landing

    const supabase = createClient(); // picks the code up from the address and signs in
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(takeNext() ?? "/sessions");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) go(); });

    return () => subscription.unsubscribe();
  }, [pathname]);

  return null;
}
