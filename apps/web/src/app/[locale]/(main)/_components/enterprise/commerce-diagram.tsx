"use client";

import { cn } from "@zenncore/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";

export const DiagramIdentity = ({ children }: { children: ReactNode }) => {
  const { ready, reduced } = useInteractive();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="min-w-0"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <Motion.Item
        initial={false}
        animate={{ y: ready && !reduced && hovered ? -4 : 0 }}
        transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
        className="min-w-0"
      >
        {children}
      </Motion.Item>
    </div>
  );
};

export const CommerceDiagram = ({
  children,
  label,
  compact = false,
}: CommerceDiagram.Props) => {
  const container = useRef<HTMLElement>(null);
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    paths: { curve: string; pending: boolean }[];
  } | null>(null);

  useEffect(() => {
    const figure = container.current;
    if (!figure) return;
    const hub = figure.querySelector<HTMLElement>("[data-diagram-hub]");
    const ports = Array.from(
      figure.querySelectorAll<HTMLElement>("[data-diagram-port]"),
    );
    if (!hub) return;
    const measure = () => {
      const bounds = figure.getBoundingClientRect();
      const center = hub.getBoundingClientRect();
      const stacked = window.matchMedia("(width < 1024px)").matches;
      if (stacked && compact) {
        const axis = center.left + center.width / 2 - bounds.left;
        const paths = ["input", "output"].flatMap((direction) => {
          const input = direction === "input";
          const members = ports
            .filter(
              (port) => port.getAttribute("data-diagram-port") === direction,
            )
            .map((port) => ({
              bounds: port.getBoundingClientRect(),
              pending: port.getAttribute("data-pending") === "true",
            }));
          if (!members.length) return [];
          const rows = Array.from(
            new Set(members.map((member) => member.bounds.top)),
          );
          const junctions = rows.map((top) => {
            const row = members.filter((member) => member.bounds.top === top);
            return {
              members: row,
              vertical:
                (input
                  ? Math.max(...row.map((member) => member.bounds.bottom)) + 8
                  : top - 8) - bounds.top,
            };
          });
          const connection = (input ? center.top : center.bottom) - bounds.top;
          const endpoint = input
            ? Math.min(...junctions.map((junction) => junction.vertical))
            : Math.max(...junctions.map((junction) => junction.vertical));
          return [
            {
              curve: `M ${axis} ${connection} V ${endpoint}`,
              pending: false,
            },
            ...junctions.flatMap((junction) =>
              junction.members.map((member) => {
                const horizontal =
                  member.bounds.left + member.bounds.width / 2 - bounds.left;
                const vertical =
                  (input ? member.bounds.bottom : member.bounds.top) -
                  bounds.top;
                return {
                  curve: `M ${axis} ${junction.vertical} H ${horizontal} V ${vertical}`,
                  pending: member.pending,
                };
              }),
            ),
          ];
        });
        setGeometry({ width: bounds.width, height: bounds.height, paths });
        return;
      }
      if (stacked) {
        const groups = ["input", "output"].flatMap((direction) => {
          const members = ports.filter(
            (port) => port.getAttribute("data-diagram-port") === direction,
          );
          const first = members[0]?.getBoundingClientRect();
          const last = members.at(-1)?.getBoundingClientRect();
          if (!first || !last) return [];
          const input = direction === "input";
          const axis = first.left - bounds.left - 20;
          const middle = center.left + center.width / 2 - bounds.left;
          const junction =
            (input ? center.top - 16 : center.bottom + 16) - bounds.top;
          const endpoint =
            (input
              ? first.top + first.height / 2
              : last.top + last.height / 2) - bounds.top;
          const identity = hub.querySelector("img")?.getBoundingClientRect();
          const stages = hub.querySelector("ol")?.getBoundingClientRect();
          const connection =
            (input
              ? (identity?.top ?? center.top) - 8
              : (stages?.bottom ?? center.bottom) + 8) - bounds.top;
          return [
            {
              curve: `M ${axis} ${endpoint} V ${junction} H ${middle} V ${connection}`,
              pending: false,
            },
            ...members.map((port) => {
              const position = port.getBoundingClientRect();
              const end = position.left - bounds.left - 6;
              const vertical = position.top + position.height / 2 - bounds.top;
              return {
                curve: `M ${axis} ${vertical} H ${end}`,
                pending: port.getAttribute("data-pending") === "true",
              };
            }),
          ];
        });
        setGeometry({
          width: bounds.width,
          height: bounds.height,
          paths: groups,
        });
        return;
      }
      const paths = ports.map((port) => {
        const position = port.getBoundingClientRect();
        const input = port.getAttribute("data-diagram-port") === "input";
        const start = {
          x: (input ? position.right : center.right) - bounds.left,
          y:
            (input
              ? position.top + position.height / 2
              : center.top + center.height / 2) - bounds.top,
        };
        const end = {
          x: (input ? center.left : position.left) - bounds.left,
          y:
            (input
              ? center.top + center.height / 2
              : position.top + position.height / 2) - bounds.top,
        };
        const middle = (start.x + end.x) / 2;
        return {
          curve: `M ${start.x} ${start.y} C ${middle} ${start.y} ${middle} ${end.y} ${end.x} ${end.y}`,
          pending: port.getAttribute("data-pending") === "true",
        };
      });
      setGeometry({ width: bounds.width, height: bounds.height, paths });
    };
    const observer = new ResizeObserver(measure);
    for (const element of [
      figure,
      hub,
      ...ports,
      ...figure.querySelectorAll("h3, ul"),
    ])
      observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [compact]);

  return (
    <figure
      ref={container}
      aria-label={label}
      className={cn(
        "enterprise-commerce-diagram relative mx-auto",
        compact ? "w-full" : "mt-12 max-w-5xl",
      )}
    >
      {geometry && (
        <svg
          aria-hidden
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          {geometry.paths.map((path) => (
            <path
              key={path.curve}
              d={path.curve}
              fill="none"
              strokeDasharray={path.pending ? "4 6" : undefined}
              className="stroke-primary/45"
            />
          ))}
        </svg>
      )}
      {children}
    </figure>
  );
};

export namespace CommerceDiagram {
  export type Props = {
    children: ReactNode;
    label: string;
    compact?: boolean;
  };
}
