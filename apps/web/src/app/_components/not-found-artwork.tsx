"use client";

import { useInView } from "motion/react";
import { useRef } from "react";
import { IllustrationGlow } from "@/components/marketing/illustration-glow";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";

/** Tonal dots retain the bevel, perspective and depth of the site's own 404 type. */
export const NotFoundArtwork = () => {
  const target = useRef<HTMLDivElement>(null);
  const visible = useInView(target, { once: true });
  const { ready, reduced } = useInteractive();
  const active = ready && visible && !reduced;
  return (
    <div
      ref={target}
      aria-hidden="true"
      data-not-found-artwork
      data-artwork-renderer="tonal-dots"
      className="pointer-events-none relative isolate h-[clamp(220px,51dvh,660px)] w-[min(1600px,calc(100dvw-48px))] shrink-0 select-none self-center [perspective:1200px] max-sm:h-[clamp(180px,27dvh,260px)] max-sm:w-[calc(100dvw-32px)]"
    >
      <IllustrationGlow className="opacity-55" />
      <Motion.Item
        initial={false}
        animate={{
          rotateX: active ? [0, 2, 0] : 0,
          rotateY: active ? [0, -2, 0] : 0,
          y: active ? [0, -6, 0] : 0,
        }}
        transition={{ duration: active ? 3.2 : 0, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary-text [mask-image:url('/images/ascii/tonal/not-found.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] max-sm:[mask-image:url('/images/ascii/tonal/not-found-mobile.svg')]"
      />
    </div>
  );
};
