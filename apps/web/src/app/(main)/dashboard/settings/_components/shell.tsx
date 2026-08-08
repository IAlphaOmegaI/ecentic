import type { PropsWithChildren } from "react";
import { Crosshair, StatusPill } from "../../_components/grid";

export const PanelSkeleton = () => (
  <div className="bg-background-rich p-6">
    <div className="mb-6 flex items-center gap-4">
      <div className="size-16 animate-pulse bg-foreground/10" />
      <div className="h-8 w-32 animate-pulse bg-foreground/10" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {(["g", "h", "i", "j"] as const).map((key) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div className="h-3 w-20 animate-pulse bg-foreground/10" />
          <div className="h-9 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Static frame, shared with `loading.tsx`. The heading block needs no data, so
 * it prerenders — a loading state that greys it out would look like a different
 * screen from a refresh of the same URL.
 */
export const SettingsShell = ({ children }: PropsWithChildren) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Account & workspace</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Settings
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Manage your account, integrations, and preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {children}
        </div>
      </div>
    </div>
  </div>
);
