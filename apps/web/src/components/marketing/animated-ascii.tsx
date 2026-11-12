"use client";

import { useMediaQuery } from "@zenncore/web/hooks";
import { useInView } from "motion/react";
import { type ReactNode, useRef } from "react";
import { Motion } from "@/components/motion";
import { EvolvingAscii } from "./evolving-ascii";

export const AnimatedAscii = ({ children, className }: AnimatedAscii.Props) => {
  const target = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const visible = useInView(target, { margin: "160px" });
  const active = visible && !reduced;
  return (
    <Motion.Item
      ref={target}
      aria-hidden
      initial={false}
      animate={
        !active
          ? { transform: "none" }
          : {
              transform: [
                "translateY(4px)",
                "translateY(-4px)",
                "translateY(4px)",
              ],
            }
      }
      transition={
        !active
          ? { duration: 0 }
          : { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
      }
      className={className}
    >
      {children}
    </Motion.Item>
  );
};

export namespace AnimatedAscii {
  export type Props = { children: ReactNode; className?: string };
}

const illustrations = {
  catalog: "catalog",
  commerce: "commerce",
  market: "cart",
} as const;

export const EvidenceArtwork = ({ kind, className }: EvidenceArtwork.Props) => (
  <EvolvingAscii artwork={illustrations[kind]} className={className} />
);

export namespace EvidenceArtwork {
  export type Props = {
    kind: keyof typeof illustrations;
    className?: string;
  };
}
