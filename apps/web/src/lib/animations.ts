import type { Transition, Variants } from "motion/react";

export const spring = {
  snappy: { type: "spring", stiffness: 320, damping: 28 } as Transition,
  gentle: { type: "spring", stiffness: 200, damping: 24 } as Transition,
  bounce: { type: "spring", stiffness: 400, damping: 20 } as Transition,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 280, damping: 26 },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 280, damping: 26 },
  },
};

export const staggerContainer = (stagger = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0 } },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export const tableRow: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 25 },
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: { type: "spring", stiffness: 400, damping: 25 },
};
