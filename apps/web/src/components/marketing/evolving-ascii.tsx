"use client";

import { cn } from "@zenncore/utils";
import { useMediaQuery } from "@zenncore/web/hooks";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { useDocument } from "@/hooks/use-document";

const artwork = {
  bag: "/images/ascii/tonal/home-bag.svg",
  cart: "/images/ascii/tonal/shopping-cart.svg",
  console: "/images/ascii/tonal/console.svg",
  commerce: "/images/ascii/tonal/shopping-bot.svg",
  closing: "/images/ascii/tonal/home-bag.svg",
  selection: "/images/ascii/tonal/selection.svg",
  catalog: "/images/ascii/tonal/catalog.svg",
  catalogCommerce: "/images/ascii/tonal/catalog-commerce.svg",
  headphones: "/images/ascii/tonal/headphones.svg",
  homeBag: "/images/ascii/tonal/home-bag.svg",
  homeCart: "/images/ascii/tonal/shopping-cart.svg",
};

/** A finite light pass for the procedural tonal path, with an intact static rest state. */
export const useAsciiFrame = () => {
  const target = useRef<HTMLDivElement>(null);
  const visible = useInView(target, { margin: "120px" });
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const { document, window } = useDocument();
  const [frame, setFrame] = useState(0);
  const active = visible && !reduced && frame < 20;

  useEffect(() => {
    if (!active || !window || !document) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setFrame((current) => Math.min(current + 1, 20));
    }, 160);
    return () => window.clearInterval(timer);
  }, [active, document, window]);

  return { target, frame, active };
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
      data-artwork-renderer="tonal-dots"
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
          <div className="absolute inset-0 bg-current" />
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
