"use client";

import type { HairlineProps } from "@lucasmarkes/hairline/react";
import { cn } from "@zenncore/utils";
import {
  type ComponentType,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";

/** Mount only near the viewport. Each page supplies one lazily imported figure. */
export const HairlineFigure = ({
  figure: Figure,
  label,
  surface = "background",
  className,
}: HairlineFigure.Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const { ready, reduced } = useInteractive();

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      data-hairline-figure=""
      data-hairline-surface={surface}
      className={cn(
        "relative isolate aspect-[5/4] w-full min-w-0 [--hairline-edge:var(--color-cross)] [--hairline-hi:var(--color-primary)] [--hairline-stroke:1]",
        surface === "field"
          ? "bg-background-dimmed [--hairline-plate:var(--color-background-dimmed)]"
          : "bg-background [--hairline-plate:var(--color-background)]",
        className,
      )}
    >
      {ready && near && (
        <Suspense fallback={null}>
          <Figure
            // Zero intensity still moves in Hairline. Reset to rest and prevent
            // both pointer and keyboard interaction when motion is reduced.
            key={reduced ? "rest" : "responsive"}
            theme="light"
            label={label}
            play={false}
            intensity={reduced ? 0 : 0.5}
            inert={reduced}
            tabIndex={reduced ? -1 : undefined}
            className={cn(
              "absolute inset-0 size-full focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4",
              reduced && "pointer-events-none",
            )}
          />
        </Suspense>
      )}
    </div>
  );
};

export namespace HairlineFigure {
  export type Props = {
    figure: ComponentType<HairlineProps>;
    label: string;
    surface?: "background" | "field";
    className?: string;
  };
}
