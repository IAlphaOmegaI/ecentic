"use client";

import { useMediaQuery } from "@zenncore/web/hooks";
import { useInView } from "motion/react";
import { useRef } from "react";
import { AsciiCommerceArtwork } from "@/components/marketing/ascii-artwork";
import { Motion } from "@/components/motion";

export const OverviewArtwork = () => {
  const target = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const visible = useInView(target, { margin: "160px" });
  const active = visible && !reduced;
  return (
    <div
      ref={target}
      aria-hidden="true"
      className="enterprise-art pointer-events-none absolute inset-y-0 -right-20 left-[24%] text-background-rich opacity-60 [mask-image:linear-gradient(105deg,transparent_16%,black_82%)] max-sm:top-40 max-sm:-right-24 max-sm:left-0 max-sm:opacity-32 max-sm:[mask-image:linear-gradient(180deg,transparent_4%,black_70%,transparent)]"
    >
      <Motion.Item
        className="size-full"
        initial={false}
        animate={{
          transform: active
            ? [
                "translate3d(0px,0px,0px) rotate(-2deg)",
                "translate3d(14px,-18px,0px) rotate(1deg)",
                "translate3d(0px,0px,0px) rotate(-2deg)",
              ]
            : "none",
        }}
        transition={
          active
            ? {
                duration: 14,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
            : { duration: 0 }
        }
      >
        <AsciiCommerceArtwork />
      </Motion.Item>
    </div>
  );
};
