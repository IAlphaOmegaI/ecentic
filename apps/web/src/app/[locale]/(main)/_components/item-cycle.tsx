"use client";

import { cn } from "@zenncore/utils";
import { useMediaQuery } from "@zenncore/web/hooks";
import { AnimatePresence, motion } from "motion/react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { useEffect, useState } from "react";

const INTERVAL_MS = 2600;
const EASE = [0.22, 1, 0.36, 1] as const;

export type ItemCycleItem = {
  title: string;
  description: string;
  logo?: StaticImageData | string;
};

export const ItemCycle = ({ items }: { items: readonly ItemCycleItem[] }) => {
  const [index, setIndex] = useState(0);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const active = reduced ? 0 : index;
  const hasLogos = items.some((entry) => entry.logo);

  useEffect(() => {
    if (reduced || items.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [items.length, reduced]);

  const item = items[active];
  if (!item) return null;

  const content = (
    <>
      {item.logo ? (
        <div className="mb-1 flex size-12 items-center justify-center">
          <Image src={item.logo} alt="" className="size-full object-contain" />
        </div>
      ) : null}
      <p className="font-heading font-medium text-2xl text-background-rich leading-tight md:text-3xl">
        {item.title}
      </p>
      <p className="max-w-sm text-background-rich/80 text-sm leading-relaxed">
        {item.description}
      </p>
    </>
  );

  return (
    <div className="relative flex flex-1 flex-col justify-end overflow-hidden bg-foreground-rich px-7 py-8 max-sm:px-4 md:py-10">
      {/* Fixed slot so title/description swaps never reflow the panel. */}
      <div
        className={cn(
          "relative z-10",
          hasLogos ? "h-40 md:h-44" : "h-28 md:h-32",
        )}
      >
        {reduced ? (
          <div className="absolute inset-x-0 top-0 flex flex-col gap-2">
            {content}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              transition={{ duration: 0.45, ease: EASE }}
              className="motion-reduce:transform-none! motion-reduce:filter-none! absolute inset-x-0 top-0 flex flex-col gap-2 motion-reduce:opacity-100!"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <div className="relative z-10 mt-8 flex gap-1.5">
        {items.map((entry, entryIndex) => (
          <span
            key={entry.title}
            aria-hidden
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
              entryIndex === active ? "bg-primary" : "bg-background-rich/20",
            )}
          />
        ))}
      </div>
    </div>
  );
};
