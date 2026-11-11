import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "singleMalt",
    required: [3, 4],
    missing: [3],
  },
  {
    key: "barolo",
    required: [1, 2, 3],
    missing: [3],
  },
  {
    key: "rum",
    required: [3],
    missing: [3],
  },
] as const satisfies readonly ShelfScenario[];
