"use client";

import { useEffect, useRef, useState } from "react";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "./use-interactive";

/** A finite example: it sleeps outside the viewport and yields to the reader. */
export const useSequence = ({
  length,
  delay = 3200,
}: {
  length: number;
  delay?: number;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const { window, document } = useDocument();
  const { ready, reduced } = useInteractive();
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const enhanced = ready && !reduced;
  const playing =
    enhanced && visible && !hidden && !paused && active < length - 1;

  useEffect(() => {
    if (!enhanced || !container.current) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.15 },
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
    const timer = window.setTimeout(() => setActive(active + 1), delay);
    return () => window.clearTimeout(timer);
  }, [playing, active, delay, window]);

  const pause = () => setPaused(true);
  const select = (index: number) => {
    setActive(index);
    setPaused(true);
  };
  const toggle = () => {
    if (active === length - 1) {
      setActive(0);
      setPaused(false);
      return;
    }
    setPaused(playing);
  };

  return { container, active, enhanced, playing, pause, select, toggle };
};
