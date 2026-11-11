"use client";

import { cn } from "@zenncore/utils";
import { useMediaQuery } from "@zenncore/web/hooks";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { useDocument } from "@/hooks/use-document";

const artwork = {
  bag: "/images/ascii/bag-halftone.svg",
  cart: "/images/ascii/cart-halftone.svg",
  console: "/images/ascii/console-halftone.svg",
  commerce: "/images/ascii/robot-halftone.svg",
  closing: "/images/ascii/bag-halftone.svg",
  catalog: "/images/ascii/connect-catalog-halftone.svg",
  selection: "/images/ascii/simulate-selection-halftone.svg",
};

/** The character road retains its sampled path; object artwork uses dot masks. */
export const useAsciiFrame = () => {
  const target = useRef<HTMLDivElement>(null);
  const visible = useInView(target, { margin: "120px" });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const { document, window } = useDocument();
  const [frame, setFrame] = useState(0);
  const active = visible && !reduced;

  useEffect(() => {
    if (!active || !window || !document) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setFrame((current) => (current + 1) % 1200);
    }, 160);
    return () => window.clearInterval(timer);
  }, [active, document, window]);

  return { target, frame: active ? frame : 0, active };
};

/** A complete silhouette in the server HTML, revealed once by a moving light. */
export const EvolvingAscii = ({
  artwork: kind = "cart",
  cycle,
  fit = "contain",
  className,
}: EvolvingAscii.Props) => {
  const target = useRef<HTMLDivElement>(null);
  const visible = useInView(target, { margin: "40px" });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const { document, window } = useDocument();
  const [documentVisible, setDocumentVisible] = useState(true);
  const [position, setPosition] = useState(0);
  const [complete, setComplete] = useState(false);
  const sequence = [...new Set(cycle?.length ? cycle : [kind])];
  const active = visible && documentVisible && !reduced && !complete;

  useEffect(() => {
    if (!document) return;
    const updateVisibility = () =>
      setDocumentVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, [document]);

  useEffect(() => {
    if (!active || !window) return;
    const timer = window.setTimeout(() => {
      if (position < sequence.length - 1) {
        setPosition((current) => current + 1);
        return;
      }
      setComplete(true);
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [active, position, sequence.length, window]);

  return (
    <Motion.Item
      ref={target}
      aria-hidden="true"
      data-ascii-artwork={sequence[position] ?? kind}
      data-artwork-renderer="halftone"
      data-artwork-motion={
        complete ? "complete" : active ? "revealing" : "rest"
      }
      initial={false}
      className={cn(
        "pointer-events-none relative size-full select-none overflow-hidden text-inherit",
        className,
      )}
    >
      {sequence.map((subject, index) => (
        <Motion.Item
          key={subject}
          data-artwork-mask
          initial={false}
          animate={{ opacity: index === (reduced ? 0 : position) ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.24 }}
          className="absolute inset-0 overflow-hidden [mask-position:center] [mask-repeat:no-repeat]"
          style={{ maskImage: `url('${artwork[subject]}')`, maskSize: fit }}
        >
          <div className="absolute inset-0 bg-current opacity-80" />
          <Motion.Item
            initial={false}
            animate={{
              x: active && index === position ? "120%" : "-120%",
              opacity: active && index === position ? 0.65 : 0,
            }}
            transition={{
              x: { duration: active ? 3.2 : 0, ease: "easeInOut" },
              opacity: { duration: reduced ? 0 : 0.2 },
            }}
            className="absolute inset-0 bg-linear-to-r from-transparent via-current to-transparent"
          />
        </Motion.Item>
      ))}
    </Motion.Item>
  );
};

export namespace EvolvingAscii {
  export type Kind = keyof typeof artwork;
  export type Props = {
    artwork?: Kind;
    cycle?: readonly Kind[];
    fit?: "contain" | "cover";
    className?: string;
  };
}
