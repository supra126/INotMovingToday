"use client";

import { useRef, useState } from "react";
import { normalizeRegion, type Region } from "@/lib/edit/region";

interface RegionPickerProps {
  /** Data URL of the frame to draw on */
  frame: string;
  region: Region | null;
  onChange: (region: Region | null) => void;
}

/** Drag a box on a still frame to say where the edit should happen */
export function RegionPicker({ frame, region, onChange }: RegionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Region | null>(null);

  const point = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const shown = draft ?? region;
  return (
    <div
      ref={ref}
      className="relative mx-auto w-fit cursor-crosshair touch-none select-none overflow-hidden rounded border border-line"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setStart(point(e));
        setDraft(null);
      }}
      onPointerMove={(e) => start && setDraft(normalizeRegion(start, point(e)))}
      onPointerUp={(e) => {
        if (!start) return;
        onChange(normalizeRegion(start, point(e)));
        setStart(null);
        setDraft(null);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a captured frame as a data URL */}
      <img src={frame} alt="" draggable={false} className="block max-h-[40vh] w-auto max-w-full" />
      {shown && (
        <div
          className="pointer-events-none absolute border-2 border-accent bg-accent/15"
          style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%` }}
        />
      )}
    </div>
  );
}
