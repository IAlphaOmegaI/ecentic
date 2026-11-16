"use client";

import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";

/** A single sweep follows the record connection; it never conceals real content. */
export const PlatformLight = () => {
  const { ready, reduced } = useInteractive();
  return (
    <Motion.Item
      aria-hidden
      data-platform-light
      initial={false}
      whileInView={
        ready && !reduced
          ? {
              transform: ["translateX(-120%)", "translateX(480%)"],
              opacity: [0, 0.8, 0],
            }
          : { opacity: 0 }
      }
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 1.8, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-none absolute top-1/2 left-0 h-px w-1/4 bg-linear-to-r from-transparent via-primary-rich to-transparent opacity-0 shadow-lg shadow-primary/20"
    />
  );
};
