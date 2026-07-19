"use client";

import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";

export const MotionProvider = ({ children }: PropsWithChildren) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
