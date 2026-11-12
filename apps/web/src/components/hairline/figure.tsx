"use client";

import type { HairlineProps } from "@lucasmarkes/hairline/react";
import { cn } from "@zenncore/utils";
import {
  Component,
  type ComponentType,
  type PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { stockRestPoses } from "./stock-rest";
import "./kernel-style.css";
import "./figure.css";

// Optional artwork must not replace readable page content if its chunk fails.
class ArtworkBoundary extends Component<
  PropsWithChildren<{ onFailure: () => void }>,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onFailure();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Mount only near the viewport. Each explanation supplies a lazily imported subject figure. */
export const HairlineFigure = ({
  name,
  figure: Figure,
  label,
  surface = "background",
  className,
}: HairlineFigure.Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [enhancedName, setEnhancedName] = useState<
    HairlineFigure.Props["name"] | null
  >(null);
  const { ready, reduced } = useInteractive();
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const active = ready && near && !reduced;
  const showRest = !active || enhancedName !== name;
  const rest = stockRestPoses[name].replaceAll(
    "__REST_ID__",
    `rest-${instanceId}`,
  );
  const markEnhanced = useCallback(() => setEnhancedName(name), [name]);
  const restoreRest = useCallback(() => setEnhancedName(null), []);

  useEffect(() => {
    if (!active) setEnhancedName(null);
  }, [active]);

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
      data-stock-hairline-figure=""
      data-hairline-surface={surface}
      className={cn(
        "relative isolate aspect-[5/4] w-full min-w-0 [--hairline-edge:var(--color-cross)] [--hairline-hi:var(--color-primary)] [--hairline-lo:var(--color-accent-foreground)] [--hairline-mid:var(--color-foreground-dimmed)] [--hairline-stroke:1]",
        surface === "field" &&
          "bg-background-dimmed [--hairline-plate:var(--color-background-dimmed)]",
        surface === "background" &&
          "bg-background [--hairline-plate:var(--color-background)]",
        surface === "rich" &&
          "bg-background-rich [--hairline-plate:var(--color-background-rich)]",
        surface === "dark" &&
          "bg-emphasis-dimmed [--hairline-edge:var(--color-background-rich)] [--hairline-hi:var(--color-primary-rich)] [--hairline-lo:var(--color-foreground-dimmed)] [--hairline-mid:var(--color-background-dimmed)] [--hairline-plate:var(--color-emphasis-dimmed)]",
        className,
      )}
    >
      <div
        role="img"
        aria-label={label}
        aria-hidden={!showRest}
        hidden={!showRest}
        data-hairline={name}
        data-hairline-rest=""
        data-hairline-theme={surface === "dark" ? "dark" : "light"}
        className="absolute inset-0 size-full"
      >
        <svg
          aria-hidden
          viewBox="0 0 400 320"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Local SVG captured from Hairline 0.5.1 and validated; only its internal IDs are namespaced.
          dangerouslySetInnerHTML={{ __html: rest }}
        />
      </div>
      {active && (
        <ArtworkBoundary key={name} onFailure={restoreRest}>
          <Suspense fallback={null}>
            <Figure
              theme={surface === "dark" ? "dark" : "light"}
              label={label}
              play={false}
              intensity={0.5}
              onRead={markEnhanced}
              className="absolute inset-0 size-full focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4"
            />
          </Suspense>
        </ArtworkBoundary>
      )}
    </div>
  );
};

export namespace HairlineFigure {
  export type Props = {
    name: keyof typeof stockRestPoses;
    figure: ComponentType<HairlineProps>;
    label: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
