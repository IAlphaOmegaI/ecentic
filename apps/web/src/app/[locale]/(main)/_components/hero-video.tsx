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
import { type AppConfig, useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

// Versioned assets match the approved film currently published on ecentic.ai.
const source = "/videos/ecentic-launch-20261008.mp4";
const poster = "/videos/ecentic-launch-poster-20261008.webp";

// Autoplay overrides preload, so attach the short silent preview only as the
// film approaches the viewport. The full film remains behind the dialog.
const loop = "/videos/ecentic-launch-preview-20261008.mp4";

export const HeroVideo = ({ transcript }: HeroVideo.Props) => {
  const locale = useLocale();
  const translateMedia = useTranslations("general.media");
  const translate = useTranslations("home.heroVideo");
  const descriptionId = useId();
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
          width={960}
          height={540}
          src={previewVisible ? loop : undefined}
          poster={
            previewVisible
              ? "/videos/ecentic-launch-poster-20261008-960.webp"
              : undefined
          }
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

      <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
        {translate("sampleLabel")}
      </p>

      <DialogPopup
        className="marketing-site enterprise-video-dialog text-(length:--text-base) rounded-xs bg-background font-body text-foreground leading-[1.6] [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [color-scheme:light] [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_:where(a,button).bg-primary]:rounded-md [&_:where(a,button).bg-primary]:bg-primary-text [&_:where(a,button).from-primary-rich]:rounded-md [&_:where(a,button,input,select,textarea):focus-visible]:outline-2 [&_:where(a,button,input,select,textarea):focus-visible]:outline-primary-text [&_:where(a,button,input,select,textarea):focus-visible]:outline-offset-4 [&_:where(button,[role=button])]:duration-160 [&_:where(button,[role=button])]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_:where(div:has(>input),div:has(>textarea))]:rounded-md [&_:where(input,textarea,select,[role=combobox])]:rounded-md [&_p]:text-pretty [:where(&)_:where(h1)]:max-w-[1040px] [:where(&)_:where(h1)]:text-[clamp(2.75rem,5.5vw,5rem)] [:where(&)_:where(h1,h2,h3,h4)]:text-balance [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(h1,h2,h3,h4)]:text-foreground-rich [:where(&)_:where(h1,h2,h3,h4)]:leading-[1.08] [:where(&)_:where(h1,h2,h3,h4)]:tracking-[-0.035em] [:where(&)_:where(h2)]:max-w-[900px] [:where(&)_:where(h2)]:text-[clamp(2rem,3.6vw,3.5rem)] [:where(&)_:where(h3)]:text-[clamp(1.4rem,2vw,1.85rem)]"
        classList={{
          backdrop:
            "z-50 bg-emphasis/85 opacity-100 backdrop-blur-md duration-150",
          root: "z-50 m-0 max-h-[90dvh] w-[min(94vw,1400px)] max-w-none overflow-y-auto rounded-xl border-background-rich/15 bg-emphasis p-0 shadow-2xl duration-150 data-ending-style:scale-95 data-starting-style:scale-95 motion-reduce:transition-none",
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
        {/* biome-ignore lint/a11y/useMediaCaption: A verified visual transcript is provided immediately below; no spoken caption track has been verified. */}
        <video
          aria-label={translate("title")}
          aria-describedby={descriptionId}
          autoPlay
          controls
          playsInline
          preload="auto"
          width={1920}
          height={1080}
          poster={poster}
          className="aspect-video w-full bg-emphasis object-contain"
        >
          <source src={source} type="video/mp4" />
          {translate("fallback")}
        </video>
        <section className="border-accent-foreground border-t bg-background">
          <div className="px-7 py-7 max-sm:px-4">
            <h2>{translate("transcriptTitle")}</h2>
            <p
              id={descriptionId}
              className="mt-4 max-w-4xl text-foreground-dimmed"
            >
              {translate("sampleLabel")}
            </p>
            <p className="mt-3 max-w-4xl text-foreground-dimmed text-sm">
              {translate("transcriptIntroduction")} {translateMedia("videoEnglish")}
            </p>
          </div>
          <ol>
            {transcript.map((scene) => (
              <li
                key={scene.time}
                className="grid grid-cols-[7rem_1fr] gap-6 border-accent-foreground border-t px-7 py-6 max-sm:grid-cols-1 max-sm:gap-3 max-sm:px-4"
              >
                <span className="text-primary-text tabular-nums">
                  {scene.time}
                </span>
                <div className="min-w-0">
                  <p lang={locale} className="font-medium text-foreground-rich">
                    <span className="sr-only">
                      {translate("onScreenLabel")}:{" "}
                    </span>
                    {scene.onScreen}
                  </p>
                  <p className="mt-3 text-foreground-dimmed leading-relaxed">
                    {scene.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </DialogPopup>
    </Dialog>
  );
};

export namespace HeroVideo {
  export type Props = {
    transcript: AppConfig["Messages"]["home"]["heroVideo"]["transcript"];
  };
}
