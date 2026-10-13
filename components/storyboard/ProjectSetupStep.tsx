"use client";

import { Button } from "@/components/ui/Button";
import { RatioSelector } from "@/components/upload/RatioSelector";
import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep, isRatioLocked, setProductImages } from "@/lib/storyboard/shots";
import { ImagePicker } from "./ImagePicker";
import type { StepProps } from "./types";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none";

export function ProjectSetupStep({ project, update, goTo }: StepProps) {
  const { t } = useLocale();
  const ratioLocked = isRatioLocked(project);

  return (
    <div className="flex flex-1 justify-center overflow-y-auto bg-canvas p-6">
      <div className="flex h-fit w-full max-w-[560px] flex-col gap-5 rounded-[var(--radius-panel)] border border-line bg-panel p-6">
      <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
        {t("storyboard.setup.name")}
        <input
          value={project.name}
          onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-fg-muted">{t("storyboard.setup.products")}</span>
        <ImagePicker
          images={project.productImages}
          max={2}
          onChange={(images) => update((p) => setProductImages(p, images))}
        />
        <p className="text-xs text-muted">{t("storyboard.setup.productsHint")}</p>
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
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
        {ratioLocked && <p className="text-xs text-fg-subtle">{t("storyboard.setup.ratioLocked")}</p>}
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-fg-muted">
        {t("storyboard.setup.tone")}
        <input
          value={project.tone}
          placeholder={t("storyboard.setup.tonePlaceholder")}
          onChange={(e) => update((p) => ({ ...p, tone: e.target.value }))}
          className={inputClass}
        />
      </label>

      <Button variant="primary" size="lg" disabled={!canEnterStep(project, 2)} onClick={() => goTo(2)}>
        {t("storyboard.next")}
      </Button>
      </div>
    </div>
  );
}
