import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stretchy — Social Movement Club",
  description:
    "A social movement. The more we move together, the better for all. Community-led sessions across Auckland — yoga, pilates, run clubs, breathwork and more. The price drops as the room fills.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://stretchy.social"),
  openGraph: {
    title: "Stretchy — Social Movement Club",
    description: "Move together. Pay less together.",
    images: ["/og-image.png"],
    siteName: "Stretchy",
  },
  twitter: {
    card: "summary_large_image",
    site: "@stretchysocial",
  },
  icons: {
    icon: "/favicon.ico",
  },
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
          href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream antialiased">{children}</body>
    </html>
  );
}
