"use client";

import type { StepProps } from "./types";

export function ShotVideosStep(props: StepProps) {
  return <p className="text-sm text-muted">{props.project.name}</p>;
}
