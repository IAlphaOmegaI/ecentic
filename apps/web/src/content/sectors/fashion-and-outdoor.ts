import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "jacket",
    required: [2, 3],
    missing: [2],
  },
  {
    key: "shoes",
    required: [0, 2],
    missing: [0],
  },
  {
    key: "baseLayer",
    required: [1, 3],
    missing: [1],
  },
] as const satisfies readonly ShelfScenario[];
