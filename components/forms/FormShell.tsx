"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

export default function FormShell({
  bg,
  dark,
  markColor,
  closeHref = "/",
  children,
}: {
  bg: string;
  dark?: boolean;
  markColor?: string;
  closeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen" style={{ backgroundColor: bg }}>
      <div className="max-w-[480px] mx-auto min-h-screen border-x-0 lg:border-x-2 border-ink" style={{ backgroundColor: bg }}>
        <div
          className="flex items-center justify-between px-[18px] py-3.5 border-b-2"
          style={{ borderColor: dark ? "#F7F0E8" : "#14110F" }}
        >
          <div style={{ color: markColor ?? (dark ? "#F7F0E8" : "#14110F") }}>
            <SMark size={32} />
          </div>
          <Link
            href={closeHref}
            aria-label="Close"
            className="w-11 h-11 flex-shrink-0 rounded-pill flex items-center justify-center text-base font-extrabold"
            style={
              dark
                ? { border: "2px solid #F7F0E8", color: "#F7F0E8" }
                : { border: "2px solid #14110F", color: "#14110F" }
            }
          >
            ×
          </Link>
        </div>
        <div className="px-[18px] py-6 flex flex-col gap-4" style={{ color: dark ? "#F7F0E8" : "#14110F" }}>
          {children}
        </div>
      </div>
    </main>
  );
}
