import type { PropsWithChildren } from "react";

/** The same connected frame used by ecentic's dashboard and account pages. */
export const WorkspaceFrame = ({ children }: WorkspaceFrame.Props) => (
  <div className="flex h-dvh min-h-0 overflow-hidden bg-background-rich p-(--dashboard-frame-gutter) font-normal [--dashboard-frame-gutter:calc(var(--spacing)*2)] sm:[--dashboard-frame-gutter:calc(var(--spacing)*3)]">
    <div
      data-dashboard-frame
      className="border-(length:--dashboard-frame-border-width) isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border-emphasis bg-emphasis shadow-foreground-rich/10 shadow-lg [--dashboard-frame-border-width:3px] md:flex-row"
    >
      {children}
    </div>
  </div>
);

export namespace WorkspaceFrame {
  export type Props = PropsWithChildren;
}
