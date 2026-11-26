import type { PropsWithChildren } from "react";

/** Outbound's connected dashboard fills the viewport without an outer gutter. */
export const WorkspaceFrame = ({ children }: WorkspaceFrame.Props) => (
  <div className="flex h-dvh min-h-0 overflow-hidden bg-emphasis font-normal">
    <div
      data-dashboard-frame
      className="border-(length:--dashboard-frame-border-width) isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-emphasis bg-emphasis [--dashboard-frame-border-width:3px] md:flex-row"
    >
      {children}
    </div>
  </div>
);

export namespace WorkspaceFrame {
  export type Props = PropsWithChildren;
}
