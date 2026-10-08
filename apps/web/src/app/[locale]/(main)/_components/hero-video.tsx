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
import { useEffect, useRef, useState } from "react";
import { useDocument } from "@/hooks/use-document";

// /videos/* is cached immutably. A new film must always get new filenames.
const source = "/videos/ecentic-launch-20261008.mp4";
const loop = "/videos/ecentic-launch-preview-20261008.mp4";
const poster = "/videos/ecentic-launch-poster-20261008.webp";

// Only the short, silent preview can load automatically. The complete 58s,
// 1080p/60fps film is mounted after the visitor opens the dialog.

export const HeroVideo = () => {
  const translate = useTranslations("home.heroVideo");
  const { document, window } = useDocument();
  const video = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    if (!window || !document || !video.current) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      window.navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const viewport = { visible: false };
    const update = () => {
      setReduced(motion.matches);
      setPreview(
        viewport.visible &&
          !document.hidden &&
          !open &&
          !motion.matches &&
          !connection?.saveData,
      );
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        viewport.visible = entry?.isIntersecting ?? false;
        update();
      },
      { rootMargin: "160px" },
    );

    update();
    observer.observe(video.current);
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [document, window, open]);

  useEffect(() => {
    if (preview) return;
    // Removing the source plus load() also cancels downloads and restores the
    // poster when the tab is hidden, the dialog opens, or preferences change.
    video.current?.pause();
    video.current?.load();
  }, [preview]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* No `aria-label`: the name derives from the visible text below, which is
        what a voice-control user would say out loud. */}
      <DialogTrigger className="group relative h-auto w-full overflow-hidden rounded-2xl border border-accent-foreground bg-emphasis p-0 text-left shadow-2xl shadow-primary/10 outline-offset-4">
        <video
          ref={video}
          aria-hidden
          autoPlay={preview}
          loop
          muted
          playsInline
          preload="none"
          width={960}
          height={540}
          src={preview ? loop : undefined}
          poster={poster}
          className="aspect-video w-full object-cover"
        />
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
        {open && (
          // biome-ignore lint/a11y/useMediaCaption: No speech; all information is on screen. The soundtrack is decorative music and effects.
          <video
            autoPlay={!reduced}
            controls
            playsInline
            preload="none"
            width={1920}
            height={1080}
            poster={poster}
            className="aspect-video w-full bg-emphasis object-contain"
          >
            <source src={source} type="video/mp4" />
            {translate("fallback")}
          </video>
        )}
      </DialogPopup>
    </Dialog>
  );
};
