"use client";

import Image from "next/image";
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
    <header className="w-full py-6 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain animate-float"
            />
          </div>
          <h1 className="text-lg font-bold text-white hidden md:block">
            {t("common.appName")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />

          <button
            onClick={onGuideClick}
            className="text-gray-400 hover:text-white text-sm font-bold transition-colors"
          >
            {t("header.guide")}
          </button>

          <button
            onClick={onApiSettingsClick}
            className="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors"
          >
            {getApiSettingsLabel()}
          </button>
        </div>
      </div>
    </header>
  );
}
