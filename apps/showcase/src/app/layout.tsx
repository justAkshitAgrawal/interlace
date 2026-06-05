import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const TITLE =
  "Interlace: watch what a great command palette does that a bad one doesn't";
const DESCRIPTION =
  "Drop-in interactions for real software. The first is a best-in-class, copy-paste command palette for React — async with race cancellation, nested pages, accessible. See the dropped requests and frozen states most palettes hide. Free.";

export const metadata: Metadata = {
  metadataBase: new URL("https://interlace.akshitagrawal.dev"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Interlace",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Interlace",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
