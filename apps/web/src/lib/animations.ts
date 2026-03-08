import type { Transition, Variants } from "motion/react";

export const Spring = {
  Snappy: { type: "spring", stiffness: 320, damping: 28 } satisfies Transition,
  Gentle: { type: "spring", stiffness: 200, damping: 24 } satisfies Transition,
  Bounce: { type: "spring", stiffness: 400, damping: 20 } satisfies Transition,
};

export const Fade = {
  Up: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 320, damping: 28 },
    },
  } as Variants,
  Left: {
    hidden: { opacity: 0, x: -24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 280, damping: 26 },
    },
  } as Variants,
  Right: {
    hidden: { opacity: 0, x: 24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 280, damping: 26 },
    },
  } as Variants,
};

export const Stagger = {
  Container: (stagger = 0.06): Variants => ({
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0 } },
  }),
  Item: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 320, damping: 28 },
    },
  } as Variants,
};

export const Scale = {
  In: {
    hidden: { opacity: 0, scale: 0.94 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 320, damping: 28 },
    },
  } as Variants,
};

export const Table = {
  Row: {
    hidden: { opacity: 0, x: -6 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 320, damping: 28 },
    },
  } as Variants,
};

export const TapScale = {
  whileTap: { scale: 0.97 },
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  } satisfies Transition,
};

export const HoverLift = {
  whileHover: { y: -2 },
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  } satisfies Transition,
};
