"use client";

import { DurationSelector } from "@/components/upload/DurationSelector";
import { ResolutionSelector } from "@/components/upload/ResolutionSelector";
import { Field, PanelSection } from "@/components/ui/PanelSection";
import { PromptEditor } from "@/components/workspace/PromptEditor";
import { useLocale } from "@/contexts/LocaleContext";
import type { EndFrame, Shot } from "@/lib/storyboard/types";
import type { VideoResolution } from "@/types";
import { ImagePicker } from "./ImagePicker";
import { MusicSelect } from "./MusicSelect";

interface ShotVideoSettingsProps {
  shot: Shot;
  isLast: boolean;
  resolution: VideoResolution;
  onPatch: (fn: (shot: Shot) => Shot) => void;
}

export function ShotVideoSettings({ shot, isLast, resolution, onPatch }: ShotVideoSettingsProps) {
  const { t } = useLocale();
  const busy = shot.video?.status === "generating";

  return (
    <>
      <PanelSection title={`${t("storyboard.videos.settingsTitle")} · ${shot.id}`}>
        <div className="flex flex-col gap-4">
          <DurationSelector
            value={shot.duration}
            disabled={busy}
            onChange={(duration) => onPatch((s) => ({ ...s, duration }))}
            hint={shot.seconds < shot.duration ? t("storyboard.script.scriptSeconds", { seconds: shot.seconds }) : undefined}
          />
          <MusicSelect value={shot.music} disabled={busy} onChange={(music) => onPatch((s) => ({ ...s, music }))} />
          <ResolutionSelector value={resolution} disabled={busy} onChange={(r) => onPatch((s) => ({ ...s, resolution: r }))} />
          <Field label={t("storyboard.videos.endFrame")}>
            <select
              value={shot.endFrame.kind}
              disabled={busy}
              onChange={(e) => {
                const kind = e.target.value as EndFrame["kind"];
                if (kind !== "upload") onPatch((s) => ({ ...s, endFrame: { kind } }));
              }}
              className="h-8 rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-sm text-fg"
            >
              <option value="none">{t("storyboard.videos.endFrameNone")}</option>
              {!isLast && <option value="next">{t("storyboard.videos.endFrameNext")}</option>}
              <option value="upload">{t("storyboard.videos.endFrameUpload")}</option>
            </select>
            <ImagePicker
              images={shot.endFrame.kind === "upload" ? [shot.endFrame.image] : []}
              max={1}
              disabled={busy}
              onChange={(images) =>
                onPatch((s) => ({ ...s, endFrame: images[0] ? { kind: "upload", image: images[0] } : { kind: "none" } }))
              }
            />
          </Field>
        </div>
      </PanelSection>

      <PanelSection title={t("storyboard.videos.fieldsTitle")} collapsible>
        {shot.draft && shot.fields ? (
          <PromptEditor
            draft={shot.draft}
            fields={shot.fields}
            isBusy={busy}
            onFieldChange={(key, value) => onPatch((s) => (s.fields ? { ...s, fields: { ...s.fields, [key]: value } } : s))}
          />
        ) : shot.draftStatus === "failed" ? (
          <p role="alert" className="text-sm text-danger">
            {t("storyboard.videos.draftFailed")}
            {shot.draftError && `（${shot.draftError.startsWith("errors.") ? t(shot.draftError) : shot.draftError}）`}
          </p>
        ) : (
          <p className="text-sm text-fg-subtle">
            {shot.draftStatus === "drafting" ? t("storyboard.videos.drafting") : t("storyboard.videos.needsFields")}
          </p>
        )}
      </PanelSection>
    </>
  );
}
