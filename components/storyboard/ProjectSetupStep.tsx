"use client";

import type { StepProps } from "./types";

export function ProjectSetupStep(props: StepProps) {
  return <p className="text-sm text-muted">{props.project.name}</p>;
}
