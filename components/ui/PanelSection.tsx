"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** A section of a settings panel; collapsible sections show a summary while closed */
export function PanelSection({
  title,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
  summary,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: ReactNode;
}) {
  if (!collapsible) {
    return (
      <section className="border-b border-line px-4 py-4 last:border-b-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="section-title">{title}</h3>
          {action}
        </div>
        {children}
      </section>
    );
  }
  return (
    <details open={defaultOpen} className="group border-b border-line last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 hover:bg-raised">
        <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90" />
        <span className="section-title">{title}</span>
        {summary && (
          <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-fg-muted group-open:hidden">{summary}</span>
        )}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/** Label + control + optional hint, the building block inside sections */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-fg-muted">{label}</span>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
