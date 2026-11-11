"use client";

import { cn } from "@zenncore/utils";
import { useMediaQuery } from "@zenncore/web/hooks";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { closingAscii, commerceAscii } from "@/content/ascii-artwork";
import { originalAscii } from "@/content/original-ascii";
import { useDocument } from "@/hooks/use-document";

const ramp = " -=+xX%#@";
const columns = 120;
const rows = 56;

const normalize = (source: string) => {
  const lines = source.trimEnd().split("\n");
  const offset = Math.floor((rows - lines.length) / 2);
  return Array.from({ length: rows }, (_, row) =>
    (lines[row - offset] ?? "").padEnd(columns).slice(0, columns),
  ).join("\n");
};

const artwork = {
  ...originalAscii,
  commerce: normalize(commerceAscii),
  closing: normalize(closingAscii),
};

const density = Object.fromEntries(
  Object.entries(artwork).map(([key, source]) => [
    key,
    [...source].map((character) =>
      character === "\n" ? -1 : Math.max(0, ramp.indexOf(character)),
    ),
  ]),
) as Record<keyof typeof artwork, number[]>;

/** Low-frequency character changes preserve the original silhouettes and layout. */
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

export const EvolvingAscii = ({
  artwork: kind = "cart",
  cycle,
  fit = "contain",
  className,
}: EvolvingAscii.Props) => {
  const { target, frame, active } = useAsciiFrame();
  const sequence = cycle?.length ? cycle : [kind];
  const position = Math.floor(frame / 40) % sequence.length;
  const current = density[sequence[position] ?? kind];
  const next = density[sequence[(position + 1) % sequence.length] ?? kind];
  const progress = Math.max(0, (frame % 40) - 28) / 12;
  const blend = progress * progress * (3 - 2 * progress);
  const characters = current
    .map((value, index) => {
      if (value < 0) return "\n";
      const mixed = value + ((next[index] ?? 0) - value) * blend;
      if (mixed < 0.5) return " ";
      const column = index % (columns + 1);
      const row = Math.floor(index / (columns + 1));
      const shimmer =
        active && (column + row * 2 + frame * 3) % columns < 7 ? 1 : 0;
      return ramp[Math.min(ramp.length - 1, Math.round(mixed) + shimmer)];
    })
    .join("");

  return (
    <Motion.Item
      ref={target}
      role="img"
      aria-hidden="true"
      data-ascii-artwork={sequence[position]}
      data-ascii-frame={frame}
      initial={false}
      className={cn(
        "pointer-events-none grid size-full grid-cols-1 grid-rows-1 select-none place-items-center overflow-hidden text-inherit [container-type:size]",
        className,
      )}
    >
      <pre
        className={cn(
          "m-0 w-[73.2em] overflow-visible whitespace-pre bg-transparent p-0 text-left font-medium font-mono text-inherit leading-none tracking-normal [font-variant-ligatures:none]",
          fit === "cover"
            ? "text-[max(calc(100cqw/73.2),calc(100cqh/56))]"
            : "text-[min(calc(100cqw/73.2),calc(100cqh/56))]",
        )}
      >
        {characters}
      </pre>
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
