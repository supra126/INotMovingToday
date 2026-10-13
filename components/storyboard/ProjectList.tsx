"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { ProjectSummary } from "@/lib/storyboard/types";

interface ProjectListProps {
  projects: ProjectSummary[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

/** Project picker as one row above the steps, so the work area gets the full width */
export function ProjectList({ projects, activeId, onOpen, onCreate, onDelete }: ProjectListProps) {
  const { t } = useLocale();
  const active = projects.find((p) => p.id === activeId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted sm:flex-none">
        {t("storyboard.projects")}
        <select
          value={activeId ?? ""}
          onChange={(e) => e.target.value && onOpen(e.target.value)}
          className="min-w-0 flex-1 sm:w-72 sm:flex-none bg-surface border border-line rounded-md px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {!activeId && <option value="">{t("storyboard.empty")}</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {t(`storyboard.steps.${p.step}`)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onCreate}
        className="h-8 px-3 rounded-md bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
      >
        {t("storyboard.newProject")}
      </button>
      {active && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("storyboard.deleteConfirm", { name: active.name }))) onDelete(active.id);
          }}
          className="h-8 px-3 rounded-md border border-line text-sm text-muted hover:text-red-300 transition-colors"
        >
          {t("storyboard.deleteProject")}
        </button>
      )}
    </div>
  );
}
