"use client";

import dynamic from "next/dynamic";
import { EditStudio } from "@/components/edit/EditStudio";
import { Header } from "@/components/layout/Header";
import { useApiKeyStatus } from "@/hooks";
import { getApiKey } from "@/lib/storage/api-key-storage";

const ApiKeyModal = dynamic(
  () => import("@/components/settings/ApiKeyModal").then((mod) => mod.ApiKeyModal),
  { ssr: false }
);

export default function EditPage() {
  const apiKeyStatus = useApiKeyStatus();

  // Editing uploads the user's clip, so it always uses their own key
  const requireApiKey = () => {
    const key = getApiKey("gemini");
    if (!key) apiKeyStatus.openApiKeyModal();
    return key || null;
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-y-auto">
      <Header
        active="edit"
        hasApiKey={apiKeyStatus.hasApiKey}
        serverHasKey={apiKeyStatus.serverHasKey}
        onApiSettingsClick={apiKeyStatus.openApiKeyModal}
      />
      <EditStudio requireApiKey={requireApiKey} />
      <ApiKeyModal
        isOpen={apiKeyStatus.showApiKeyModal}
        onClose={apiKeyStatus.closeApiKeyModal}
        serverHasKey={apiKeyStatus.serverHasKey}
      />
    </div>
  );
}
