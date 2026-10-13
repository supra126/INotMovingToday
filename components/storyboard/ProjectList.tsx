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

export function ProjectList({ projects, activeId, onOpen, onCreate, onDelete }: ProjectListProps) {
  const { t } = useLocale();

  return (
    <aside className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{t("storyboard.projects")}</h2>
        <button
          type="button"
          onClick={onCreate}
          className="h-8 px-3 rounded-md bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {t("storyboard.newProject")}
        </button>
      </div>
      {projects.length === 0 && <p className="text-xs text-muted">{t("storyboard.empty")}</p>}
      <ul className="flex flex-col gap-1">
        {projects.map((p) => (
          <li key={p.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className={`flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                p.id === activeId ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {p.name}
              <span className="ml-2 text-xs text-muted">{t(`storyboard.steps.${p.step}`)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("storyboard.deleteConfirm", { name: p.name }))) onDelete(p.id);
              }}
              className="h-8 px-2 rounded-md text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-red-300 transition"
            >
              {t("storyboard.deleteProject")}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
