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

const source = "/videos/banner.mp4";

// Keep the existing silent preview and full film. Autoplay overrides preload,
// so attach the preview source only as the film approaches the viewport.
const loop = "/videos/banner-loop.mp4";

export const HeroVideo = () => {
  const translate = useTranslations("home.heroVideo");
  const trigger = useRef<HTMLButtonElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    const element = trigger.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setPreviewVisible(true);
        observer.disconnect();
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Dialog>
      {/* No `aria-label`: the name derives from the visible text below, which is
        what a voice-control user would say out loud. */}
      <DialogTrigger
        ref={trigger}
        className="group relative h-auto w-full overflow-hidden rounded-2xl border border-accent-foreground bg-emphasis p-0 text-left shadow-2xl shadow-primary/10 outline-offset-4"
      >
        <video
          aria-hidden
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          src={previewVisible ? loop : undefined}
          poster={previewVisible ? "/images/hero-poster.webp" : undefined}
          className="aspect-video w-full object-cover transition-transform duration-150 group-hover:scale-[1.01] motion-reduce:transition-none"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-emphasis/70 via-transparent to-transparent"
        />
        <span className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4 text-background-rich">
          <span className="flex flex-col">
            <span className="font-body font-medium text-lg">
              {translate("heading")}
            </span>
            <span className="font-body text-background-rich/70 text-sm">
              {translate("caption")}
            </span>
          </span>
          <span className="rounded-md border border-background-rich/30 bg-background/90 px-3.5 py-2 font-body font-medium text-foreground shadow-sm backdrop-blur-md">
            {translate("action.primary")}
          </span>
        </span>
      </DialogTrigger>

      <DialogPopup
        className="marketing-site enterprise-video-dialog text-(length:--text-base) rounded-xs bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-md [&_:where(input,textarea,select,[role=combobox])]:rounded-md [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]"
        classList={{
          backdrop:
            "z-50 bg-emphasis/85 opacity-100 backdrop-blur-md duration-150",
          root: "z-50 m-0 w-[min(94vw,1400px)] max-w-none overflow-hidden rounded-xl border-background-rich/15 bg-emphasis p-0 shadow-2xl duration-150 data-ending-style:scale-95 data-starting-style:scale-95 motion-reduce:transition-none",
        }}
      >
        <DialogTitle className="sr-only">{translate("title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {translate("description")}
        </DialogDescription>
        <DialogClose
          aria-label={translate("close")}
          className="absolute top-3 right-3 z-10 size-10 rounded-full border-background-rich/20 bg-emphasis/70 p-0 text-background-rich shadow-md backdrop-blur-md hover:bg-emphasis"
        >
          <XIcon aria-hidden className="size-5" />
        </DialogClose>
        {/* biome-ignore lint/a11y/useMediaCaption: Preserve the existing film; a caption track requires a verified transcript. */}
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
