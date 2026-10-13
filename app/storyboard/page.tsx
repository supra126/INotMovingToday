"use client";

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

  // Storyboard mode always uses the user's own key (images are generated in the browser)
  const requireApiKey = () => {
    const key = getApiKey("gemini");
    if (!key) apiKeyStatus.openApiKeyModal();
    return key || null;
  };

  const StepComponent = project ? STEP_COMPONENTS[project.step] : null;
  const projectId = project?.id;
  const stepProps: StepProps | null = project
    ? {
        project,
        update: (fn) => store.update(project.id, fn),
        requireApiKey,
        goTo: (step: Step) => store.update(project.id, (p) => ({ ...p, step })),
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        active="storyboard"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onGuideClick={() => {}}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />

      <main className="container mx-auto w-full flex-1 px-4 lg:px-6 py-8 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <ProjectList
          projects={store.projects}
          activeId={projectId}
          onOpen={store.open}
          onCreate={store.create}
          onDelete={store.remove}
        />

        <section className="flex flex-col gap-6 min-w-0">
          {store.isLoading && <p className="text-sm text-muted">{t("storyboard.loading")}</p>}
          {!store.isLoading && !project && <p className="text-sm text-muted">{t("storyboard.empty")}</p>}
          {project && stepProps && StepComponent && (
            <>
              <StepBar project={project} onSelect={stepProps.goTo} />
              <StepComponent key={project.id} {...stepProps} />
            </>
          )}
        </section>
      </main>

      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
