import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// One family across the site. Older --font-serif / --font-script / --font-mono
// references resolve to this through the aliases in globals.css.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Platform-level metadata. Event-specific pages can override this
// via their own `export const metadata` — but by policy these sites
// shouldn't be indexed, so the noindex defaults stay.
export const metadata: Metadata = {
  title: "Event microsite",
  description: "Invite-only event microsite.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
