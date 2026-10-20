"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";

interface HeaderProps {
  hasApiKey: boolean;
  serverHasKey: boolean;
  onApiSettingsClick: () => void;
  onGuideClick?: () => void;
  active?: "single" | "storyboard" | "edit";
  /** Mode-specific controls in the middle (project picker, steps) */
  children?: ReactNode;
}

const MODES = [
  { mode: "single", href: "/", label: "header.modeSingle" },
  { mode: "storyboard", href: "/storyboard", label: "header.modeStoryboard" },
  { mode: "edit", href: "/edit", label: "header.modeEdit" },
] as const;

export function Header({ hasApiKey, serverHasKey, onApiSettingsClick, onGuideClick, active = "single", children }: HeaderProps) {
  const { t } = useLocale();

  const apiLabel = serverHasKey
    ? t(hasApiKey ? "header.apiSettingsCustom" : "header.apiSettingsFree")
    : t(hasApiKey ? "header.apiSettingsConnected" : "header.apiSettings");

  return (
    <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-panel px-3 py-1.5 lg:h-12 lg:flex-nowrap lg:py-0">
      <span className="shrink-0 text-[13px] font-semibold tracking-tight">{t("common.appName")}</span>

      <nav aria-label={t("header.modeSingle")} className="flex shrink-0 rounded-[var(--radius-control)] border border-line bg-sunken p-0.5">
        {MODES.map(({ mode, href, label }) => (
          <Link
            key={mode}
            href={href}
            aria-current={active === mode ? "page" : undefined}
            className={`inline-flex h-7 items-center rounded-[5px] px-2.5 text-xs font-medium transition-colors ${
              active === mode ? "bg-panel text-fg shadow-sm" : "text-fg-muted hover:text-fg"
            }`}
          >
            {t(label)}
          </Link>
        ))}
      </nav>

      {/* Below 1024px the mode controls take their own row */}
      <div className="order-last flex w-full min-w-0 items-center gap-3 lg:order-none lg:w-auto lg:flex-1">{children}</div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <LanguageToggle />
        {onGuideClick && (
          <Button variant="ghost" size="sm" onClick={onGuideClick}>
            {t("header.guide")}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onApiSettingsClick}>
          {apiLabel}
        </Button>
      </div>
    </header>
  );
}
