"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { ProjectList } from "@/components/storyboard/ProjectList";
import { StepBar } from "@/components/storyboard/StepBar";
import { ProjectSetupStep } from "@/components/storyboard/ProjectSetupStep";
import { ScriptStep } from "@/components/storyboard/ScriptStep";
import { ShotImagesStep } from "@/components/storyboard/ShotImagesStep";
import { ShotVideosStep } from "@/components/storyboard/ShotVideosStep";
import type { StepProps } from "@/components/storyboard/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useApiKeyStatus } from "@/hooks";
import { useStoryboardProject } from "@/hooks/useStoryboardProject";
import { getApiKey } from "@/lib/storage/api-key-storage";
import type { Step } from "@/lib/storyboard/types";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

const STEP_COMPONENTS = {
  1: ProjectSetupStep,
  2: ScriptStep,
  3: ShotImagesStep,
  4: ShotVideosStep,
} as const;

export default function StoryboardPage() {
  const { t } = useLocale();
  const apiKeyStatus = useApiKeyStatus();
  const store = useStoryboardProject();
  const { project } = store;
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Storyboard mode always uses the user's own key (images are generated in the browser)
  const requireApiKey = () => {
    const key = getApiKey("gemini");
    if (!key) apiKeyStatus.openApiKeyModal();
    return key || null;
  };

  const StepComponent = project ? STEP_COMPONENTS[project.step] : null;
  const stepProps: StepProps | null = project
    ? {
        project,
        update: (fn, options) => store.update(project.id, fn, options),
        requireApiKey,
        goTo: (step: Step) => store.update(project.id, (p) => ({ ...p, step })),
        selectedShotId,
        selectShot: setSelectedShotId,
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        active="storyboard"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      >
        <ProjectList
          projects={store.projects}
          activeId={project?.id}
          onOpen={store.open}
          onCreate={store.create}
          onDelete={store.remove}
        />
        {project && stepProps && <StepBar project={project} onSelect={stepProps.goTo} />}
      </Header>

      {store.saveError && (
        <p role="alert" className="border-b border-danger/40 bg-danger-soft px-4 py-2 text-sm text-danger">
          {t("storyboard.saveError", { error: store.saveError })}
        </p>
      )}

      {project && stepProps && StepComponent ? (
        <StepComponent key={project.id} {...stepProps} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-fg-subtle">
          {store.isLoading ? t("storyboard.loading") : t("storyboard.empty")}
        </div>
      )}

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
