import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "earbuds",
    required: [0, 1],
    missing: [1],
  },
  {
    key: "laptop",
    required: [0, 2],
    missing: [0],
  },
  {
    key: "vacuum",
    required: [0, 2, 3],
    missing: [2],
  },
] as const satisfies readonly ShelfScenario[];
