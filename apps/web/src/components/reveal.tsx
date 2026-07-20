import type { HTMLMotionProps } from "motion/react";
import * as motion from "motion/react-client";
import { Stagger } from "@/lib/animations";

const viewport = { once: true, margin: "-80px" } as const;

export const Reveal = ({ stagger = 0.08, ...props }: Reveal.Props) => (
  <motion.div
    variants={Stagger.Container(stagger)}
    initial="hidden"
    whileInView="visible"
    viewport={viewport}
    {...props}
  />
);

export const RevealItem = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Stagger.Item} {...props} />
);

export namespace Reveal {
  export type Props = HTMLMotionProps<"div"> & {
    stagger?: number;
  };
}
