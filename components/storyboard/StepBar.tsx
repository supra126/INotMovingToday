"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { canEnterStep } from "@/lib/storyboard/shots";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

const STEPS: Step[] = [1, 2, 3, 4];

export function StepBar({ project, onSelect }: { project: StoryboardProject; onSelect: (step: Step) => void }) {
  const { t } = useLocale();

  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step) => {
        // Going back is always allowed; going forward only through the step's own button
        const reachable = step <= project.step && canEnterStep(project, step);
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(step)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                project.step === step ? "border-accent text-foreground" : "border-line text-muted hover:text-foreground"
              }`}
            >
              <span className="mr-1.5 text-xs">{step}</span>
              {t(`storyboard.steps.${step}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
