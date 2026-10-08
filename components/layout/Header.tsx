"use client";

import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/contexts/LocaleContext";

interface HeaderProps {
  hasApiKey: boolean;
  serverHasKey: boolean;
  onGuideClick: () => void;
  onApiSettingsClick: () => void;
}

export function Header({ hasApiKey, serverHasKey, onGuideClick, onApiSettingsClick }: HeaderProps) {
  const { t } = useLocale();

  const getApiSettingsLabel = () => {
    if (serverHasKey) {
      return hasApiKey ? t("header.apiSettingsCustom") : t("header.apiSettingsFree");
    }
    return hasApiKey ? t("header.apiSettingsConnected") : t("header.apiSettings");
  };

  return (
    <header className="w-full h-14 border-b border-line bg-background/90 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto h-full px-4 lg:px-6 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          {t("common.appName")}
        </span>

        <nav className="flex items-center gap-1 text-sm">
          <LanguageToggle />

          <button
            onClick={onGuideClick}
            className="h-9 px-3 rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {t("header.guide")}
          </button>

          <button
            onClick={onApiSettingsClick}
            className="h-9 px-3 rounded-md text-foreground border border-line hover:bg-white/5 transition-colors"
          >
            {getApiSettingsLabel()}
          </button>

          <a
            href="https://github.com/supra126/INotMovingToday"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label={t("header.github")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
