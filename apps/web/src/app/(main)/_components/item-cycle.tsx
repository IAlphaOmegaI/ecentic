"use client";

import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2600;

export const ItemCycle = ({
  items,
}: {
  items: readonly { title: string; description: string }[];
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  const item = items[index];
  if (!item) return null;

  return (
    <div className="relative flex flex-1 flex-col justify-end overflow-hidden bg-[#191919] px-6 py-8 md:px-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background-dimmed to-background-dimmed/0"
      />
      {/* Fixed slot so title/description swaps never reflow the panel. */}
      <div className="relative z-10 h-28 md:h-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-0 flex flex-col gap-2"
          >
            <p className="font-body font-medium text-2xl text-white leading-tight md:text-3xl">
              {item.title}
            </p>
            <p className="max-w-sm font-light text-sm text-white/60 leading-relaxed">
              {item.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative z-10 mt-8 flex gap-1.5">
        {items.map((entry, entryIndex) => (
          <span
            key={entry.title}
            aria-hidden
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              entryIndex === index ? "bg-primary" : "bg-white/15",
            )}
          />
        ))}
      </div>
    </div>
  );
};
