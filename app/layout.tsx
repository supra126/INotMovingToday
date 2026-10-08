import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_TC } from "next/font/google";
import { LocaleProvider } from "@/contexts/LocaleContext";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

// Chinese glyphs fall back to Noto Sans TC
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-tc",
  preload: false,
});

export const metadata: Metadata = {
  title: "Jola Omni",
  description: "AI 短影片生成：上傳主圖、描述想法，由 Gemini Omni 生成 Reels / Shorts / TikTok 影片",
  keywords: ["AI", "video", "generator", "Gemini Omni", "reels", "shorts", "tiktok"],
  openGraph: {
    title: "Jola Omni",
    description: "AI 短影片生成：上傳主圖、描述想法，由 Gemini Omni 生成 Reels / Shorts / TikTok 影片",
    type: "website",
  },
};

// Paint the background before CSS loads to avoid a white flash
const criticalCSS = `html,body{margin:0;background-color:#17171a;color:#ededef}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${notoSansTC.variable}`}
    >
      <head>
        {/* DNS prefetch for API endpoints */}
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
