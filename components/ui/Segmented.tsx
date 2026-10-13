"use client";

import React from "react";

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}

/** 單選按鈕組（role=radiogroup，可用方向鍵切換） */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: SegmentedProps<T>) {
  const enabled = options.filter((o) => !o.disabled);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const index = enabled.findIndex((o) => o.value === value);
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex w-full rounded-[var(--radius-control)] border border-line bg-sunken p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={[
              "flex-1 rounded-[5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-6 text-xs" : "h-7 text-xs",
              active ? "bg-panel text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
