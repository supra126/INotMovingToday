"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/PanelSection";
import { Segmented } from "@/components/ui/Segmented";
import { useLocale } from "@/contexts/LocaleContext";
import { formatUsd, imageCost } from "@/lib/pricing";
import type { Shot } from "@/lib/storyboard/types";

interface ShotImageControlsProps {
  shot: Shot;
  onRegenerate: (change: { prompt?: string; note?: string; count: number }) => void;
}

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-line bg-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-line-strong focus:outline-none disabled:opacity-50";

/** Regenerate controls for one shot; remount (key) when its prompt changes */
export function ShotImageControls({ shot, onRegenerate }: ShotImageControlsProps) {
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [count, setCount] = useState<"1" | "2">("2");
  const [prompt, setPrompt] = useState(shot.imagePrompt);
  const busy = shot.imageStatus === "generating";

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("storyboard.images.notePlaceholder")}>
        <input
          value={note}
          disabled={busy}
          aria-label={t("storyboard.images.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label={t("storyboard.images.count")}>
        <Segmented
          label={t("storyboard.images.count")}
          value={count}
          onChange={setCount}
          options={(["1", "2"] as const).map((n) => ({ value: n, label: t("storyboard.images.countOption", { count: n }) }))}
        />
      </Field>
      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer select-none">{t("storyboard.images.editPrompt")}</summary>
        <textarea
          rows={5}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          className={`${inputClass} mt-2 font-mono text-xs`}
        />
      </details>
      <Button
        disabled={busy}
        onClick={() => {
          onRegenerate({ note, prompt: prompt !== shot.imagePrompt ? prompt : undefined, count: Number(count) });
          setNote("");
        }}
      >
        {t("storyboard.images.regenerate")}（{formatUsd(imageCost("1K", Number(count)).amount)}）
      </Button>
    </div>
  );
}
