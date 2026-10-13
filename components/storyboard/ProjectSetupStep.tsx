"use client";

import { RatioSelector } from "@/components/upload/RatioSelector";
import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import { ImagePicker } from "./ImagePicker";
import type { StepProps } from "./types";

const inputClass =
  "w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder-gray-500 focus:border-accent focus:outline-none transition-colors";

export function ProjectSetupStep({ project, update, goTo }: StepProps) {
  const { t } = useLocale();
  const ratioLocked = project.script.confirmed;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.name")}
        <input
          value={project.name}
          onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t("storyboard.setup.products")}</span>
        <ImagePicker
          images={project.productImages}
          max={2}
          onChange={(images) => update((p) => ({ ...p, productImages: images }))}
        />
        <p className="text-xs text-muted">{t("storyboard.setup.productsHint")}</p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.packagingText")}
        <input
          value={project.packagingText}
          placeholder={t("storyboard.setup.packagingTextPlaceholder")}
          onChange={(e) => update((p) => ({ ...p, packagingText: e.target.value }))}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <RatioSelector
          value={project.ratio}
          onChange={(ratio) => update((p) => ({ ...p, ratio }))}
          disabled={ratioLocked}
        />
        {ratioLocked && <p className="text-xs text-muted">{t("storyboard.setup.ratioLocked")}</p>}
      </div>

      <label className="flex flex-col gap-2 text-sm text-muted">
        {t("storyboard.setup.tone")}
        <input
          value={project.tone}
          placeholder={t("storyboard.setup.tonePlaceholder")}
          onChange={(e) => update((p) => ({ ...p, tone: e.target.value }))}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        disabled={!canEnterStep(project, 2)}
        onClick={() => goTo(2)}
        className="h-11 rounded-lg bg-accent text-accent-fg text-[15px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
      >
        {t("storyboard.next")}
      </button>
    </div>
  );
}
