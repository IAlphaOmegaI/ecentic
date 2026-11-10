"use client";

import { useReducedMotion } from "motion/react";
import { Motion } from "@/components/motion";

/** Decorative artwork moves once into place; all readable content stays server-visible. */
export const AsciiAtmosphere = ({ className }: { className: string }) => {
  const reducedMotion = useReducedMotion();
  return (
    <Motion.Up
      aria-hidden="true"
      className={className}
      initial={false}
      whileInView={
        reducedMotion
          ? { transform: "translateY(0px)" }
          : { transform: ["translateY(22px)", "translateY(0px)"] }
      }
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    />
  );
};
