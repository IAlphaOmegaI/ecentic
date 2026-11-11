"use client";

import type { HairlineProps } from "@lucasmarkes/hairline/react";
import { cn } from "@zenncore/utils";
import {
  Component,
  type ComponentType,
  type PropsWithChildren,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";

// Optional artwork must not replace readable page content if its chunk fails.
class ArtworkBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Mount only near the viewport. Each explanation supplies a lazily imported subject figure. */
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
        surface === "field" &&
          "bg-background-dimmed [--hairline-plate:var(--color-background-dimmed)]",
        surface === "background" &&
          "bg-background [--hairline-plate:var(--color-background)]",
        surface === "rich" &&
          "bg-background-rich [--hairline-plate:var(--color-background-rich)]",
        surface === "dark" &&
          "bg-emphasis-dimmed [--hairline-edge:var(--color-background-rich)] [--hairline-hi:var(--color-primary-rich)] [--hairline-plate:var(--color-emphasis-dimmed)]",
        className,
      )}
    >
      {ready && near && (
        <ArtworkBoundary>
          <Suspense fallback={null}>
            <Figure
              // Zero intensity still moves in Hairline. Reset to rest and prevent
              // both pointer and keyboard interaction when motion is reduced.
              key={reduced ? "rest" : "responsive"}
              theme={surface === "dark" ? "dark" : "light"}
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
        </ArtworkBoundary>
      )}
    </div>
  );
};

export namespace HairlineFigure {
  export type Props = {
    figure: ComponentType<HairlineProps>;
    label: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
