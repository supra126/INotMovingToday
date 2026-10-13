"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} title={t("language.switchTo")}>
      <Languages size={14} aria-hidden="true" />
      {t(`language.${locale}`)}
    </Button>
  );
}
