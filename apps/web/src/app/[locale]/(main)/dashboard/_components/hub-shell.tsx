import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "./grid";
import { HubShellCopy } from "./hub-shell-copy";
import { NotificationBell } from "./notification-bell";

/**
 * The store hub's static frame, shared by `page.tsx` and `loading.tsx`.
 *
 * Everything here — the header, the heading block, the "Connect a store" button
 * — needs no data, so it renders identically whether the page is streaming or a
 * navigation is still in flight. Keeping it in one place is what stops the two
 * from drifting: the loading state used to redraw all of it as grey boxes, so a
 * client navigation looked nothing like a refresh of the same URL.
 */
export const HubShell = ({
  userBadge,
  stores,
}: {
  userBadge: ReactNode;
  stores: ReactNode;
}) => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
      <Link href="/dashboard" aria-label="ecentic">
        <Image
          src="/images/trademark.svg"
          alt="ecentic"
          width={96}
          height={28}
          loading="eager"
        />
      </Link>
      <div className="flex items-center gap-3">
        <NotificationBell />
        {userBadge}
      </div>
    </header>

    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <HubShellCopy />

        <div className="mt-8">{stores}</div>
      </div>
    </main>
  </div>
);

export const UserBadgeSkeleton = () => (
  <div className="size-8 bg-accent-foreground/30" />
);

// Corner crosshairs included deliberately: the aggregate row and every store
// card draw them, so leaving them out of the skeleton made the marks pop in
// once the real content arrived.
export const StoresSkeleton = () => (
  <div className="flex flex-col gap-8">
    <div className="relative grid grid-cols-2 gap-px border border-accent-foreground bg-accent-foreground lg:grid-cols-4">
      <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div key={key} className="bg-background-rich p-5">
          <div className="flex items-center gap-1.5">
            <div className="size-4 animate-pulse bg-foreground/10" />
            <div className="h-3 w-20 animate-pulse bg-foreground/10" />
          </div>
          <div className="mt-2 h-8 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div
          key={key}
          className="relative flex flex-col border border-accent-foreground bg-background-rich"
        >
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="flex items-start justify-between gap-3 border-accent-foreground border-b p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-11 shrink-0 animate-pulse bg-foreground/10" />
              <div className="space-y-2">
                <div className="h-5 w-32 animate-pulse bg-foreground/10" />
                <div className="h-3 w-40 animate-pulse bg-foreground/10" />
              </div>
            </div>
            {/* The real card carries a status pill here. */}
            <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-foreground/10" />
          </div>

          <div className="grid grid-cols-3 divide-x divide-accent-foreground">
            {(["x", "y", "z"] as const).map((cell) => (
              <div key={cell} className="space-y-2 p-4">
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                <div className="h-7 w-12 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between border-accent-foreground border-t p-4">
            <div className="h-4 w-24 animate-pulse bg-foreground/10" />
            <div className="h-4 w-28 animate-pulse bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
