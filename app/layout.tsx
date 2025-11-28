import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INotMovingToday - AI Video Generator",
  description:
    "Generate viral Reels, Shorts, and TikTok videos through AI-guided conversation",
  keywords: ["AI", "video", "generator", "reels", "shorts", "tiktok", "marketing"],
  openGraph: {
    title: "INotMovingToday - AI Video Generator",
    description:
      "Generate viral Reels, Shorts, and TikTok videos through AI-guided conversation",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-white min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
