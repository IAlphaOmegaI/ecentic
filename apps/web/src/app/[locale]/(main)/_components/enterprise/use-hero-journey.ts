"use client";

import { useEffect, useRef, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { useDocument } from "@/hooks/use-document";

/** Give each part of the connected workflow time to read while it is visible. */
export const useHeroJourney = (length: number) => {
  const container = useRef<HTMLDivElement>(null);
  const { document, window } = useDocument();
  const { ready, reduced } = useInteractive();
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const enhanced = ready && !reduced;
  const playing = enhanced && visible && !hidden;

  useEffect(() => {
    if (!enhanced || !container.current) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [enhanced]);

  useEffect(() => {
    if (!document) return;
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [document]);

  useEffect(() => {
    if (!playing || !window) return;
    const timer = window.setTimeout(() => {
      setActive((active + 1) % length);
    }, 4800);
    return () => window.clearTimeout(timer);
  }, [active, length, playing, window]);

  return {
    container,
    active,
    enhanced,
    playing,
  };
};
