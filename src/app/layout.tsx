import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/session";
import { getCouple } from "@/lib/data";
import { Ambient } from "@/components/ambient";
import { Chrome } from "@/components/chrome";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ours · just us two",
  description: "A small universe built for exactly two people.",
};

export const viewport: Viewport = {
  themeColor: "#0c0810",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getSession();
  let himName = "Him";
  let herName = "Her";
  if (profile) {
    try {
      const c = await getCouple();
      himName = c.himName;
      herName = c.herName;
    } catch {
      // keep defaults when db not yet migrated
    }
  }

  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Ambient />
        <Chrome profile={profile} himName={himName} herName={herName}>
          {children}
        </Chrome>
      </body>
    </html>
  );
}
