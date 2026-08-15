"use client";

import { XIcon } from "@zenncore/icons";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import { useTranslations } from "next-intl";

const source = "/videos/banner.mp4";

// The trigger loops silently forever behind a "Play video" affordance, so it
// has no use for the film's 70 seconds or its audio track. It gets a 15s, 960w,
// soundless cut (357KB); the full 15.8MB film stays behind the dialog, where it
// only downloads once someone actually asks for it. `autoPlay` overrides
// `preload`, so whatever this element points at is fetched on load regardless.
const loop = "/videos/banner-loop.mp4";

export const HeroVideo = () => {
  const translate = useTranslations("home.heroVideo");

  return (
    <Dialog>
      {/* No `aria-label`: the name derives from the visible text below, which is
        what a voice-control user would say out loud. */}
      <DialogTrigger className="group relative h-auto w-full overflow-hidden rounded-2xl border border-accent-foreground bg-emphasis p-0 text-left shadow-2xl shadow-primary/10 outline-offset-4">
        <video
          aria-hidden
          autoPlay
          loop
          muted
          playsInline
          poster="/images/hero-poster.webp"
          className="aspect-video w-full object-cover transition-transform duration-150 group-hover:scale-[1.01] motion-reduce:transition-none"
        >
          <source src={loop} type="video/mp4" />
        </video>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-emphasis/70 via-transparent to-transparent"
        />
        <span className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4 text-white">
          <span className="flex flex-col">
            <span className="font-body font-medium text-lg">
              See ecentic in action
            </span>
            <span className="font-body text-sm text-white/70">
              Watch the product film
            </span>
          </span>
          <span className="rounded-md border border-white/30 bg-background/90 px-3.5 py-2 font-body font-medium text-foreground shadow-sm backdrop-blur-md">
            Play video
          </span>
        </span>
      </DialogTrigger>

      <DialogPopup
        classList={{
          backdrop:
            "z-50 bg-emphasis/85 opacity-100 backdrop-blur-md duration-150",
          root: "z-50 m-0 w-[min(94vw,1400px)] max-w-none overflow-hidden rounded-xl border-white/15 bg-emphasis p-0 shadow-2xl duration-150 data-ending-style:scale-95 data-starting-style:scale-95 motion-reduce:transition-none",
        }}
      >
        <DialogTitle className="sr-only">{translate("title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {translate("description")}
        </DialogDescription>
        <DialogClose
          aria-label={translate("close")}
          className="absolute top-3 right-3 z-10 size-10 rounded-full border-white/20 bg-emphasis/70 p-0 text-white shadow-md backdrop-blur-md hover:bg-emphasis"
        >
          <XIcon aria-hidden className="size-5" />
        </DialogClose>
        <video
          autoPlay
          controls
          playsInline
          preload="auto"
          className="aspect-video w-full bg-emphasis object-contain"
        >
          <source src={source} type="video/mp4" />
          {translate("fallback")}
        </video>
      </DialogPopup>
    </Dialog>
  );
};
