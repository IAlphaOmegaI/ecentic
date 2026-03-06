export type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: Using `any` to ensure we can handle all types
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;
