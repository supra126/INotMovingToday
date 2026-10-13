"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

const STEPS: Step[] = [1, 2, 3, 4];

export function StepBar({ project, onSelect }: { project: StoryboardProject; onSelect: (step: Step) => void }) {
  const { t } = useLocale();

  return (
    <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
      {STEPS.map((step) => {
        // Going back is always allowed; going forward only through the step's own button
        const reachable = step <= project.step && canEnterStep(project, step);
        const current = project.step === step;
        return (
          <li key={step} className="shrink-0">
            <button
              type="button"
              disabled={!reachable}
              aria-current={current ? "step" : undefined}
              onClick={() => onSelect(step)}
              className={`flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-xs font-medium transition-colors disabled:opacity-35 ${
                current ? "bg-raised text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              <span className="font-mono text-[11px] text-fg-subtle">{step}</span>
              {t(`storyboard.steps.${step}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
