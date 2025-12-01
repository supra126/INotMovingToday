import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import { LocaleProvider } from "@/contexts/LocaleContext";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-tc",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "不想動了 I'm Not Moving Today",
  description:
    "AI 驅動的短影片生成工具 - Generate viral Reels, Shorts, and TikTok videos",
  keywords: ["AI", "video", "generator", "reels", "shorts", "tiktok", "marketing"],
  openGraph: {
    title: "不想動了 I'm Not Moving Today",
    description:
      "AI 驅動的短影片生成工具 - Generate viral Reels, Shorts, and TikTok videos",
    type: "website",
  },
};

// Critical CSS for LCP element (h2 hero title) and above-the-fold content
const criticalCSS = `
  *,*::before,*::after{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background-color:#000;color:#e2e8f0;font-family:'Noto Sans TC',system-ui,sans-serif;overflow-x:hidden}
  .min-h-screen{min-height:100vh}
  .flex{display:flex}
  .flex-1{flex:1 1 0%}
  .flex-col{flex-direction:column}
  .items-center{align-items:center}
  .justify-center{justify-content:center}
  .justify-between{justify-between}
  .text-center{text-align:center}
  .text-white{color:#fff}
  .text-gray-400{color:#9ca3af}
  .font-bold{font-weight:700}
  .text-4xl{font-size:2.25rem;line-height:2.5rem}
  .text-lg{font-size:1.125rem;line-height:1.75rem}
  .mb-4{margin-bottom:1rem}
  .mb-8{margin-bottom:2rem}
  .mt-2{margin-top:0.5rem}
  .mt-8{margin-top:2rem}
  .mx-auto{margin-left:auto;margin-right:auto}
  .px-4{padding-left:1rem;padding-right:1rem}
  .px-6{padding-left:1.5rem;padding-right:1.5rem}
  .py-6{padding-top:1.5rem;padding-bottom:1.5rem}
  .py-8{padding-top:2rem;padding-bottom:2rem}
  .max-w-xl{max-width:36rem}
  .max-w-6xl{max-width:72rem}
  .w-full{width:100%}
  .leading-tight{line-height:1.25}
  .border-b{border-bottom-width:1px}
  .sticky{position:sticky}
  .top-0{top:0}
  .z-50{z-index:50}
  .container{width:100%;margin-left:auto;margin-right:auto}
  .gap-3{gap:0.75rem}
  .hidden{display:none}
  @media(min-width:768px){
    .md\\:text-6xl{font-size:3.75rem;line-height:1}
    .md\\:block{display:block}
  }
  .bg-dynamic{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;background-color:#000;overflow:hidden}
  header{background-color:rgba(0,0,0,0.2);backdrop-filter:blur(12px);border-color:rgba(255,255,255,0.05)}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className={notoSansTC.variable}>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for API endpoints */}
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        {/* Critical CSS inline */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body className={notoSansTC.className} style={{ backgroundColor: '#000' }}>
        <div className="bg-dynamic">
          <div className="bg-grid"></div>
          <div className="bg-glow"></div>
        </div>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
