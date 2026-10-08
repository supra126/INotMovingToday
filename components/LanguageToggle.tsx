"use client";

import { useLocale } from "@/contexts/LocaleContext";

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      onClick={toggleLocale}
      className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md text-muted hover:text-foreground hover:bg-white/5 transition-colors"
      title={t("language.switchTo")}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      <span className="text-sm">
        {t(`language.${locale}`)}
      </span>
    </button>
  );
}
