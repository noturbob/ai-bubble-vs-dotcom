import type { ReactNode } from "react";

/** An app window pinned to the sketchpad: dotted title bar, hairline border, no shadow. */
export function Window({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-hairline bg-paper ${className}`}>
      <div className="flex items-center justify-between border-b border-hairline bg-mist px-16 py-8">
        <span aria-hidden className="text-[14px] leading-none tracking-[0.2em]">•••</span>
        <span className="mono text-[11px]">{title}</span>
        <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-ink" />
      </div>
      <div className="p-20 sm:p-28">{children}</div>
    </div>
  );
}
