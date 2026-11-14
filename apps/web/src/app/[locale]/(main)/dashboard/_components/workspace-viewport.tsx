"use client";

import { ChevronDownIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const WorkspaceAccess = createContext<((blocked: boolean) => void) | null>(
  null,
);

// A streamed paywall marks the underlying workspace inert, while its own
// controls and the account/navigation menus remain reachable.
export const WorkspaceAccessBlocker = () => {
  const setBlocked = useContext(WorkspaceAccess);
  useEffect(() => {
    setBlocked?.(true);
    return () => setBlocked?.(false);
  }, [setBlocked]);
  return null;
};

// The content remains the scrolling surface. The fade never intercepts a row,
// and the bottom space keeps the final action above the assistant dock.
export const WorkspaceViewport = ({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay: ReactNode;
}) => {
  const viewport = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!viewport.current || !end.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMoreBelow(!entry?.isIntersecting),
      { root: viewport.current },
    );
    observer.observe(end.current);
    return () => observer.disconnect();
  }, []);

  return (
    <WorkspaceAccess value={setBlocked}>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background md:rounded-tl-lg">
        <main
          ref={viewport}
          inert={blocked}
          className="h-full min-w-0 scroll-pb-28 overflow-y-auto overscroll-y-contain pb-28"
        >
          {children}
          <div ref={end} aria-hidden className="h-px" />
        </main>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-background via-background/85 to-transparent transition-opacity duration-150 motion-reduce:transition-none",
            moreBelow ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          inert={blocked}
          className="pointer-events-none absolute right-24 bottom-4 left-3 z-20 flex justify-center sm:bottom-5 sm:left-6 lg:inset-x-24"
        >
          <AssistantPreview blocked={blocked} />
        </div>
        {overlay}
      </div>
    </WorkspaceAccess>
  );
};

const AssistantPreview = ({ blocked }: { blocked: boolean }) => {
  const translate = useTranslations("dashboard.nav.assistant");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open && !blocked} onOpenChange={setOpen}>
      <div className="relative w-full max-w-80">
        <div
          aria-hidden
          className="mask-radial-from-50% mask-radial-to-100% pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-full backdrop-blur-xs"
        />
        <div
          aria-hidden
          className="mask-radial-from-50% mask-radial-to-100% pointer-events-none absolute -inset-x-3 -inset-y-2 rounded-full backdrop-blur-sm"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 inset-y-0 rounded-full bg-emphasis/20 blur-md"
        />
        <PopoverTrigger className="pointer-events-auto relative inset-shadow-background-rich/20 inset-shadow-sm flex h-12 w-full justify-start gap-2.5 rounded-full border-background-rich/15 bg-emphasis bg-linear-to-b from-background-rich/15 via-emphasis to-emphasis px-3.5 text-background-rich shadow-none backdrop-blur-md transition-colors duration-150 hover:bg-emphasis hover:from-background-rich/20 focus-visible:outline-offset-2 active:bg-emphasis active:from-background-rich/10 data-popup-open:bg-emphasis data-popup-open:from-background-rich/20 motion-reduce:transition-none contrast-more:bg-emphasis">
          <Image
            src="/images/assistant/judy-fiat500.webp"
            alt=""
            width={72}
            height={60}
            className="h-8 w-10 shrink-0 object-contain"
          />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-sm">
            {translate("title")}
          </span>
          <span className="rounded-full bg-background-rich/10 px-2 py-0.5 text-background-rich/70 text-xs">
            {translate("status")}
          </span>
          <ChevronDownIcon
            aria-hidden
            className="size-3.5 shrink-0 rotate-180 text-background-rich/65"
          />
        </PopoverTrigger>
      </div>
      <PopoverPositioner side="top" sideOffset={12} className="z-50">
        <PopoverPopup className="w-80 max-w-(--available-width) bg-background-rich px-5 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/images/assistant/judy-fiat500.webp"
              alt=""
              width={112}
              height={93}
              className="h-24 w-28 shrink-0 object-contain"
            />
            <PopoverTitle className="font-semibold text-lg">
              {translate("name")}
            </PopoverTitle>
          </div>
          <PopoverDescription className="mt-3 text-sm leading-6">
            {translate("description")}
          </PopoverDescription>
        </PopoverPopup>
      </PopoverPositioner>
    </Popover>
  );
};
