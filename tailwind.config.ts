import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds & text ──────────────────────────────
        cream:  "#F7F0E8",
        ink:    "#14110F",
        muted:  "#6B6862",
        border: "#E1D5C6",
        blush:  "#EFDEDB",

        sand: {
          light:   "#FBF6EF",
          DEFAULT: "#F7F0E8",
          dark:    "#E1D5C6",
        },

        // ── Brand greens ────────────────────────────────────
        olive:       "#716F39",
        "olive-dark": "#54522A",
        "olive-light": "#8B8950",

        // ── Design-system UI colours ────────────────────────
        "hot-blue": "#0000FF",  // primary CTAs
        yellow:  "#FCBB16",   // prices / money — sacred, never change
        orange:  "#E96709",   // scarcity / footer / below-minimum warnings
        red:     "#C6362E",   // destructive / error only — not in the design system's own palette
        purple:  "#902F8A",   // yoga sessions, hero, partnership cards
        royal:   "#0000FF",   // pilates sessions — same as hot-blue in the new system
        sky:     "#29ABE2",   // sound bath / breathwork accent — "light blue"
        green:   "#716F39",   // confirmed state — same slot as olive in the new system
        hold:    "#BFE3F0",   // holding state pill

        // ── Retain hot-pink slot for HIIT & any leftover pink uses — remapped to purple ─────
        pink: {
          stretchy: "#902F8A",
          soft:     "#D9A9D4",
          light:    "#F3E4F2",
        },
      },

      fontFamily: {
        sans:    ["Space Grotesk", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["BN Chubb", "Space Grotesk", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },

      fontSize: {
        "display-xl": ["4rem",   { lineHeight: "1",    letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-lg": ["3rem",   { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-md": ["2rem",   { lineHeight: "1.1",  letterSpacing: "-0.02em", fontWeight: "700" }],
        "hero":       ["3.75rem",{ lineHeight: "0.92", letterSpacing: "-0.03em", fontWeight: "700" }],
      },

      borderRadius: {
        stretchy: "20px",
        pill:     "999px",
        card:     "20px",
      },

      // No boxShadow tokens — the design system is flat with 2px keylines, no shadows anywhere.

      animation: {
        "price-drop": "priceDrop 0.4s ease-out",
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
      },

      keyframes: {
        priceDrop: {
          "0%":   { transform: "scale(1.05)", color: "#FCBB16" },
          "100%": { transform: "scale(1)",    color: "inherit" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
