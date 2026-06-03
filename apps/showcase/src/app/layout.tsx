import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaletteKit — the command palette that doesn't suck",
  description:
    "A best-in-class, copy-paste command palette for React. Async, nested, accessible. Free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
