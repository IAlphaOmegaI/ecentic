"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export const CommerceDiagram = ({ children, label }: CommerceDiagram.Props) => {
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
      if (stacked) {
        const groups = ["input", "output"].flatMap((direction) => {
          const members = ports.filter(
            (port) => port.dataset["diagramPort"] === direction,
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
                pending: port.dataset["pending"] === "true",
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
        const input = port.dataset["diagramPort"] === "input";
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
          pending: port.dataset["pending"] === "true",
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
  }, []);

  return (
    <figure
      ref={container}
      aria-label={label}
      className="enterprise-commerce-diagram relative mx-auto mt-12 max-w-5xl"
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
  export type Props = { children: ReactNode; label: string };
}
