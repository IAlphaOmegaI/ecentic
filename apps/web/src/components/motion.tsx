"use client";

import type { HTMLMotionProps } from "motion/react";
import * as motion from "motion/react";
import {
  Fade,
  HoverLift,
  Stagger as S,
  Scale,
  Table,
  TapScale,
} from "@/lib/animations";

const Stagger = ({
  stagger = 0.06,
  delay = 0,
  ...props
}: Motion.StaggerProps) => (
  <motion.div
    variants={S.Container(stagger)}
    initial="hidden"
    animate="visible"
    transition={{ delayChildren: delay }}
    {...props}
  />
);

const Item = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={S.Item} {...props} />
);

const Up = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Fade.Up} {...props} />
);

const Left = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Fade.Left} {...props} />
);

const Right = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Fade.Right} {...props} />
);

const ScaleIn = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Scale.In} {...props} />
);

const Row = (props: HTMLMotionProps<"tr">) => (
  <motion.tr variants={Table.Row} {...props} />
);

const Tap = (props: HTMLMotionProps<"div">) => (
  <motion.div {...TapScale} {...props} />
);

const Lift = (props: HTMLMotionProps<"div">) => (
  <motion.div {...HoverLift} {...props} />
);

export const Motion = {
  Stagger,
  Item,
  Up,
  Left,
  Right,
  Scale: ScaleIn,
  Row,
  Tap,
  Lift,
};

export namespace Motion {
  export type StaggerProps = HTMLMotionProps<"div"> & {
    stagger?: number;
    delay?: number;
  };
}
