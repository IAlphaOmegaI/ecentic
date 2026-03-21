import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Prettify, UnionToIntersection } from "../types";

export { cva, type VariantProps } from "class-variance-authority";
export type { ClassProp } from "class-variance-authority/types";
export type { ClassValue };
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

type Input = string | Partial<{ [key: string]: Input }>;
export type ClassList<I extends Input> = Prettify<
  UnionToIntersection<
    I extends string
      ? Partial<Record<I, string>>
      : I extends Record<infer K, infer V extends Input>
        ? Partial<Record<K, ClassList<V>>>
        : never
  >
>;

// TODO: fix this edge case
type Hi = ClassList<{
  root:
    | {
        content: "root";
        dindong: {
          room: "hello" | "world";
        };
      }
    | "bombalcaat";
}>;
const _xhuri: Hi = {
  root: {
    content: {},
    bombalcaat: "",
  },
};
