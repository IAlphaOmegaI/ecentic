"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  mountWordmark,
  type WordmarkKernel,
} from "@/components/hairline/wordmark-figure";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "./interactive/use-interactive";
import wordmark from "./wordmark-paths.json";

/** Complete SVG lettering is server-rendered; Hairline enhances it when in view. */
export const FooterWordmark = () => {
  const stage = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { ready, reduced } = useInteractive();
  const { window } = useDocument();
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = stage.current;
    const kernel = (window as (Window & { HL?: WordmarkKernel }) | null)?.HL;
    if (!element || !loaded || !kernel || !ready || reduced) return;
    return mountWordmark(
      element,
      [...element.querySelectorAll<SVGPathElement>("[data-wordmark-stroke]")],
      kernel,
    );
  }, [loaded, ready, reduced, window]);
  return (
    <>
      {near && !reduced && (
        <Script
          src="/hairline/kernel.js"
          strategy="afterInteractive"
          onReady={() => setLoaded(true)}
        />
      )}
      <div
        ref={stage}
        role="img"
        aria-label="écentic"
        tabIndex={ready && !reduced ? 0 : undefined}
        data-footer-wordmark
        data-wordmark-motion="static"
        className="relative isolate w-full overflow-hidden px-2 py-10 text-emphasis-dimmed outline-offset-[-4px] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid sm:px-4 sm:py-14"
      >
        <svg
          aria-hidden
          viewBox="0 108 400 114"
          className="block h-auto w-full overflow-visible"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <g transform={`translate(0 95) scale(${400 / wordmark.width})`}>
            {wordmark.glyphs.map((glyph) => (
              <g key={glyph.path}>
                <path
                  d={glyph.path}
                  vectorEffect="non-scaling-stroke"
                  className="text-primary-text/25"
                />
                <path
                  data-wordmark-stroke
                  data-center={
                    (((glyph.bounds[0] ?? 0) + (glyph.bounds[2] ?? 0)) /
                      2 /
                      wordmark.width) *
                    400
                  }
                  d={glyph.path}
                  vectorEffect="non-scaling-stroke"
                  className="data-[active=true]:text-primary-text"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </>
  );
};
