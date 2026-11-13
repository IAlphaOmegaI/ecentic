import Image from "next/image";
import { type ReactNode, Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "./grid";
import { HubShellCopy } from "./hub-shell-copy";
import { NotificationBell } from "./notification-bell";

/** Shared static frame keeps the heading and account controls stable during streaming. */
export const HubShell = ({ userBadge, stores }: HubShell.Props) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
    <header className="z-10 shrink-0 border-accent-foreground border-b bg-background-rich">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link
          href="/dashboard"
          aria-label="ecentic"
          className="shrink-0 rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Image
            src="/images/trademark.svg"
            alt="ecentic"
            width={112}
            height={32}
            loading="eager"
            className="h-auto w-24 sm:w-28"
          />
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-10 w-20 shrink-0 animate-pulse rounded-sm bg-foreground/10"
              />
            }
          >
            <LanguageSwitcher />
          </Suspense>
          <NotificationBell />
          {userBadge}
        </div>
      </div>
    </header>

    <main
      className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 sm:px-8"
      data-hub-scroll
    >
      <div className="relative mx-auto min-h-full max-w-[1216px] border-accent-foreground border-x">
        <HubShellCopy />
        {stores}
      </div>
    </main>
  </div>
);

export namespace HubShell {
  export type Props = {
    userBadge: ReactNode;
    stores: ReactNode;
  };
}

export const UserBadgeSkeleton = () => (
  <div
    aria-hidden
    className="size-9 shrink-0 animate-pulse rounded-md bg-accent-foreground/30"
  />
);

/** Match the single-store row and its responsive breakpoints while data streams. */
export const StoresSkeleton = () => (
  <div
    aria-hidden
    data-hub-skeleton
    className="relative border-accent-foreground border-b bg-background-rich"
  >
    <div className="relative isolate border-accent-foreground border-b">
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary-text via-primary-text to-emphasis [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)]" />
      <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <div className="size-8 animate-pulse rounded-sm bg-background-rich/15" />
          <div className="h-9 w-28 animate-pulse rounded-sm bg-background-rich/15" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-sm bg-background-rich/20" />
      </div>
    </div>
    <div className="grid min-w-0 lg:grid-cols-2">
      <div className="px-6 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="h-8 w-28 animate-pulse rounded-sm bg-foreground/10" />
          <div className="h-4 w-20 animate-pulse rounded-sm bg-foreground/10" />
        </div>
        <div className="h-7 w-3/4 animate-pulse rounded-sm bg-foreground/10" />
        <div className="mt-2 h-5 w-1/2 animate-pulse rounded-sm bg-foreground/10" />
      </div>
      <div className="grid grid-cols-1 border-accent-foreground border-t sm:grid-cols-3 lg:border-t-0 lg:border-l">
        {(["products", "comparisons", "visits"] as const).map((key) => (
          <div
            key={key}
            className="grid min-w-0 grid-cols-[16px_minmax(0,1fr)_48px] items-center gap-3 border-accent-foreground border-b px-6 py-4 last:border-b-0 sm:flex sm:flex-col sm:items-start sm:justify-center sm:border-r sm:border-b-0 sm:py-6 sm:last:border-r-0 lg:px-4"
          >
            <div className="size-4 animate-pulse rounded-sm bg-foreground/10" />
            <div className="h-4 w-full max-w-20 animate-pulse rounded-sm bg-foreground/10" />
            <div className="h-8 w-12 animate-pulse rounded-sm bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-6 py-4 sm:px-8">
      <div className="h-4 w-24 animate-pulse rounded-sm bg-foreground/10" />
      <div className="h-5 w-32 animate-pulse rounded-sm bg-foreground/10" />
    </div>
    <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
  </div>
);
