"use client";

import { cn } from "@zenncore/utils";
import { Motion } from "@/components/motion";
import { useAsciiFrame } from "./evolving-ascii";

const ramp = " -=+xX%#@";
const horizontal = (height: number, reverse = false) =>
  Array.from({ length: 96 }, (_, index) => {
    const x = 0.25 + (reverse ? 1 - index / 95 : index / 95) * 0.5;
    return { x, y: height + Math.sin((x - 0.25) * Math.PI * 4) * 0.014 };
  });
const bend = (x: number, y: number, direction: number) =>
  Array.from({ length: 64 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / 63) * Math.PI;
    return {
      x: x + Math.cos(angle) * 0.2 * direction,
      y: y + Math.sin(angle) / 6,
    };
  });
const path = [
  ...horizontal(0.1273),
  ...bend(0.75, 0.294, 1),
  ...horizontal(0.4606, true),
  ...bend(0.25, 0.6273, -1),
  ...horizontal(0.794),
];

const desktop = Array.from({ length: 72 }, (_, row) =>
  Array.from({ length: 192 }, (_, column) => {
    const x = column / 191;
    const y = row / 71;
    const distance = path.reduce(
      (nearest, point) =>
        Math.min(nearest, (x - point.x) ** 2 + ((y - point.y) * 0.75) ** 2),
      1,
    );
    return distance > 0.00045
      ? 0
      : Math.max(1, Math.round(Math.exp(-distance / 0.000055) * 8));
  }),
);
const mobile = Array.from({ length: 144 }, (_, row) =>
  Array.from({ length: 12 }, (_, column) => {
    const center = 5.5 + Math.sin((row / 143) * Math.PI * 6) * 2;
    const distance = Math.abs(column - center);
    return distance > 2.1
      ? 0
      : Math.max(1, Math.round((1 - distance / 2.2) * 8));
  }),
);

/** A sampled continuous route, with a brighter wave following its chronology. */
export const AsciiRoad = ({ compact = false }: AsciiRoad.Props) => {
  const { target, frame, active } = useAsciiFrame();
  const field = compact ? mobile : desktop;
  const characters = field
    .map((row, rowIndex) =>
      row
        .map((value, column) => {
          if (value === 0) return " ";
          const glint =
            active && (column + rowIndex + frame * 2) % 32 < 4 ? 1 : 0;
          return ramp[Math.min(ramp.length - 1, value + glint)];
        })
        .join(""),
    )
    .join("\n");

  return (
    <Motion.Item
      ref={target}
      aria-hidden="true"
      initial={false}
      data-ascii-road={compact ? "mobile" : "desktop"}
      data-ascii-frame={frame}
      className={cn(
        "pointer-events-none absolute select-none overflow-hidden text-primary/45 [container-type:size]",
        compact ? "inset-y-0 left-0 w-16 md:hidden" : "inset-0 hidden md:block",
      )}
    >
      <pre
        className={cn(
          "m-0 whitespace-pre bg-transparent p-0 font-medium font-mono tracking-normal [font-variant-ligatures:none]",
          compact
            ? "text-[calc(100cqw/7.32)] leading-[calc(100cqh/144)]"
            : "text-[calc(100cqw/117.12)] leading-[calc(100cqh/72)]",
        )}
      >
        {characters}
      </pre>
    </Motion.Item>
  );
};

export namespace AsciiRoad {
  export type Props = { compact?: boolean };
}
