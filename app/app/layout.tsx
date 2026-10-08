import type { Metadata } from "next";
import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], weight: ["500"], variable: "--font-schibsted" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "AI Bubble?",
  description: "Today's AI boom measured against the dot-com bubble, and what 150 years of market history says usually comes next.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${schibsted.variable} ${plexMono.variable}`}>
      <body className="grid-paper min-h-screen">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
