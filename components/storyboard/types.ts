import type { ProjectUpdater } from "@/hooks/useStoryboardProject";
import type { Step, StoryboardProject } from "@/lib/storyboard/types";

export interface StepProps {
  project: StoryboardProject;
  /** Bound to this project's id, so late async results land in the right project */
  update: ProjectUpdater;
  /** Returns the user's key, or opens the key dialog and returns null */
  requireApiKey: () => string | null;
  goTo: (step: Step) => void;
}
