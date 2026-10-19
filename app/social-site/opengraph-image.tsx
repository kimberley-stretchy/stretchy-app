import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

// The 1200 × 630 card shown when stretchy.social is shared.
export const runtime = "nodejs";
export const alt = "Stretchy Social — People-powered pricing for communities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [chubb, mark] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/BN-Chubb.otf")),
    readFile(path.join(process.cwd(), "public/social/stretchy-s-ink.png")),
  ]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F7F1EA", color: "#16110F", padding: 64, border: "12px solid #16110F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markSrc} alt="" width={72} height={84} />
          <span style={{ fontFamily: "Chubb", fontSize: 44 }}>STRETCHY SOCIAL</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontFamily: "Chubb", fontSize: 104, lineHeight: 0.92 }}>PEOPLE-POWERED PRICING.</span>
          <span style={{ fontSize: 36, fontWeight: 600 }}>The more who move together, the better for all.</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["#8E2F8C", "#FDB913", "#29A9E1", "#0000F5", "#E8650A"].map((c) => (
            <div key={c} style={{ width: 40, height: 40, borderRadius: 999, background: c }} />
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Chubb", data: chubb, style: "normal", weight: 400 }] }
  );
}
