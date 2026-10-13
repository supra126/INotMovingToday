import type { ReactNode } from "react";

/** Shot rail | canvas | inspector; stacks below 1024px */
export function StepLayout({ rail, main, inspector }: { rail: ReactNode; main: ReactNode; inspector?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      {rail}
      <main className="min-w-0 flex-1 bg-canvas lg:overflow-y-auto">{main}</main>
      {inspector && (
        <aside className="flex w-full shrink-0 flex-col border-line bg-panel lg:w-[340px] lg:border-l">{inspector}</aside>
      )}
    </div>
  );
}

/** Scrolling settings with an optional pinned action at the bottom */
export function Inspector({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{children}</div>
      {footer && <div className="flex flex-col gap-2 border-t border-line p-3">{footer}</div>}
    </>
  );
}
