"use client";

import { cn } from "@zenncore/utils";
import { Motion } from "@/components/motion";
import { useAsciiFrame } from "./evolving-ascii";

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
    const nearest = path.reduce(
      (nearest, point, index) => {
        const distance = (x - point.x) ** 2 + ((y - point.y) * 0.75) ** 2;
        return distance < nearest.distance ? { distance, index } : nearest;
      },
      { distance: 1, index: 0 },
    );
    return {
      x: column,
      y: row,
      tone:
        nearest.distance > 0.00045
          ? 0
          : Math.max(1, Math.round(Math.exp(-nearest.distance / 0.000055) * 8)),
      progress: nearest.index / (path.length - 1),
    };
  }),
)
  .flat()
  .filter((point) => point.tone > 0);
const mobile = Array.from({ length: 144 }, (_, row) =>
  Array.from({ length: 12 }, (_, column) => {
    const center = 5.5 + Math.sin((row / 143) * Math.PI * 6) * 2;
    const distance = Math.abs(column - center);
    return {
      x: column,
      y: row,
      tone:
        distance > 2.1 ? 0 : Math.max(1, Math.round((1 - distance / 2.2) * 8)),
      progress: row / 143,
    };
  }),
)
  .flat()
  .filter((point) => point.tone > 0);

/** Sample the retained route into circular tonal dots; a single light follows its chronology. */
export const AsciiRoad = ({ compact = false }: AsciiRoad.Props) => {
  const { target, frame, active } = useAsciiFrame();
  const field = compact ? mobile : desktop;
  const layers = Array.from({ length: 10 }, (_, index) => {
    const tone = index + 1;
    return {
      tone,
      points: field
        .filter((point) => {
          const glint =
            active && Math.abs(point.progress - frame / 20) < 0.06 ? 2 : 0;
          return point.tone + glint === tone;
        })
        .map((point) => `M${point.x} ${point.y}h.0001`)
        .join(""),
    };
  });

  return (
    <Motion.Item
      ref={target}
      aria-hidden="true"
      initial={false}
      data-ascii-road={compact ? "mobile" : "desktop"}
      data-ascii-frame={frame}
      data-artwork-renderer="tonal-dots"
      data-artwork-motion={
        active ? "revealing" : frame >= 20 ? "complete" : "rest"
      }
      className={cn(
        "pointer-events-none absolute select-none overflow-hidden text-primary/70",
        compact ? "inset-y-0 left-0 w-16 md:hidden" : "inset-0 hidden md:block",
      )}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={compact ? "0 0 12 144" : "0 0 192 72"}
        preserveAspectRatio="none"
        className="block size-full overflow-visible fill-none stroke-current"
      >
        {layers.map(({ tone, points }) => (
          <path
            key={tone}
            d={points}
            strokeWidth={0.7 + tone * 0.36}
            strokeOpacity={0.3 + tone * 0.07}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </Motion.Item>
  );
};

export namespace AsciiRoad {
  export type Props = { compact?: boolean };
}
