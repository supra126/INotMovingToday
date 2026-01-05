"use client";

import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";

interface PacManLoaderProps {
  title: string;
  description: string;
}

export function PacManLoader({ title, description }: PacManLoaderProps) {
  const { t } = useLocale();
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500">
      {/* Pac-Man Track */}
      <div className="relative w-64 h-16 overflow-hidden">
        {/* Dots Track */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-blue-400/60 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        {/* Moving Logo (Pac-Man) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-12 h-12"
          style={{
            animation: "pacman-move 3s ease-in-out infinite",
          }}
        >
          <Image
            src="/images/logo.svg"
            alt={t("common.loading")}
            width={48}
            height={48}
            className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            style={{
              animation: "pacman-chomp 0.3s ease-in-out infinite",
            }}
          />
        </div>
        {/* Eaten dots effect - fading trail */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500/50 to-transparent rounded-full"
          style={{
            animation: "pacman-trail 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* Custom Keyframes */}
      <style jsx>{`
        @keyframes pacman-move {
          0% { left: -48px; }
          100% { left: calc(100% + 48px); }
        }
        @keyframes pacman-chomp {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.9) scaleX(1.1); }
        }
        @keyframes pacman-trail {
          0% { left: 0; width: 0; opacity: 0; }
          10% { opacity: 0.5; }
          100% { left: 0; width: 100%; opacity: 0; }
        }
      `}</style>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

// Pre-configured loaders for different states
export function AnalyzingLoader() {
  const { t } = useLocale();
  return (
    <PacManLoader
      title={t("loader.analyzing.title")}
      description={t("loader.analyzing.description")}
    />
  );
}

export function RefiningLoader() {
  const { t } = useLocale();
  return (
    <PacManLoader
      title={t("loader.refining.title")}
      description={t("loader.refining.description")}
    />
  );
}

export function GeneratingScriptLoader() {
  const { t } = useLocale();
  return (
    <PacManLoader
      title={t("loader.generatingScript.title")}
      description={t("loader.generatingScript.description")}
    />
  );
}
