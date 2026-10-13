"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import type { ProjectSummary } from "@/lib/storyboard/types";

interface ProjectListProps {
  projects: ProjectSummary[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

/** Project picker for the top bar */
export function ProjectList({ projects, activeId, onOpen, onCreate, onDelete }: ProjectListProps) {
  const { t } = useLocale();
  const active = projects.find((p) => p.id === activeId);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <select
        aria-label={t("storyboard.projects")}
        value={activeId ?? ""}
        onChange={(e) => e.target.value && onOpen(e.target.value)}
        className="h-8 w-56 min-w-0 truncate rounded-[var(--radius-control)] border border-line bg-sunken px-2 text-[13px] text-fg focus:border-line-strong focus:outline-none"
      >
        {!activeId && <option value="">{t("storyboard.empty")}</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="sm" iconOnly aria-label={t("storyboard.newProject")} title={t("storyboard.newProject")} onClick={onCreate}>
        <Plus size={15} />
      </Button>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("storyboard.deleteProject")}
          title={t("storyboard.deleteProject")}
          onClick={() => {
            if (window.confirm(t("storyboard.deleteConfirm", { name: active.name }))) onDelete(active.id);
          }}
        >
          <Trash2 size={14} />
        </Button>
      )}
    </div>
  );
}
