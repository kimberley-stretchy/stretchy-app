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
        cream:  "#F5EDE3",
        ink:    "#1A1A1A",
        muted:  "#6B6B6B",
        border: "#DDD0C0",

        sand: {
          light:   "#FBF5EE",
          DEFAULT: "#F5EDE3",
          dark:    "#E8D9C8",
        },

        // ── Brand greens ────────────────────────────────────
        olive:       "#7A8330",
        "olive-dark": "#5E6626",
        "olive-light": "#9AA33D",

        // ── Design-system UI colours ────────────────────────
        "hot-blue": "#2C8FE0",  // primary CTAs — was wrongly pink
        yellow:  "#FFD166",   // prices / money — sacred, never change
        orange:  "#FF6B35",   // scarcity / dance
        red:     "#E63946",   // alerts / filling fast / run_club
        purple:  "#A535C7",   // yoga sessions
        royal:   "#2A3FE0",   // pilates sessions
        sky:     "#4FB8E0",   // sound bath / breathwork accent
        green:   "#4CAF82",   // confirmed state
        hold:    "#A8D5E2",   // holding state pill

        // ── Retain hot-pink for HIIT & actual-pink uses ─────
        pink: {
          stretchy: "#FF3CAC",
          soft:     "#FFB3E0",
          light:    "#FFF0F9",
        },
      },

      fontFamily: {
        sans:    ["Space Grotesk", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
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
        card:     "16px",
      },

      boxShadow: {
        card:       "0 2px 12px rgba(0,0,0,0.08)",
        "card-hover": "0 6px 24px rgba(0,0,0,0.12)",
      },

      animation: {
        "price-drop": "priceDrop 0.4s ease-out",
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
      },

      keyframes: {
        priceDrop: {
          "0%":   { transform: "scale(1.05)", color: "#FFD166" },
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
