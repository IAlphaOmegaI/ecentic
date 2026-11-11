import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "moisturizer",
    required: [0, 1, 2],
    missing: [0, 2],
  },
  {
    key: "sunscreen",
    required: [0, 1, 3],
    missing: [3],
  },
  {
    key: "shampoo",
    required: [0, 2],
    missing: [2],
  },
] as const satisfies readonly ShelfScenario[];
