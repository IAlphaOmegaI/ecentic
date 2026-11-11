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
      className="enterprise-commerce-diagram relative mt-12"
    >
      {geometry && (
        <svg
          aria-hidden
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block"
        >
          {geometry.paths.map((path) => (
            <path
              key={path.curve}
              d={path.curve}
              fill="none"
              strokeDasharray={path.pending ? "4 6" : undefined}
              className="stroke-primary/30"
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
