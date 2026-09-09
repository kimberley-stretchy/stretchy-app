import type { Metadata, Viewport } from "next";
import "./globals.css";

// Without this, some Android browsers (Chrome/Samsung Internet's "force dark
// theme" setting) auto-invert the whole page to a dark palette on devices
// set to dark mode — the app has no dark theme, so testers on those devices
// were seeing a broken, algorithmically-inverted version of the light one.
export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Stretchy — A Social Movement",
  description:
    "Community movement classes where the price drops as more people join. Yoga, pilates, breathwork and more across Auckland.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz"),
  openGraph: {
    title: "Stretchy — A Social Movement",
    description: "Move together. Pay less together.",
    siteName: "Stretchy",
  },
  twitter: {
    card: "summary_large_image",
    site: "@stretchysocial",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stretchy",
  },
  // icon / apple-icon are auto-detected from app/icon.svg + app/apple-icon.svg — no manual entry needed.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-cream antialiased flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="py-4 text-center text-xs text-gray-400">
          Made with love{" "}
          <a
            href="https://www.studiodawn.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 transition-colors"
          >
            Studio Dawn
          </a>
        </footer>
      </body>
    </html>
  );
}
