import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "dogFood",
    required: [0, 1, 5],
    missing: [0, 1],
  },
  {
    key: "magnesium",
    required: [1],
    missing: [1],
  },
  {
    key: "catLitter",
    required: [3, 5],
    missing: [3],
  },
] as const satisfies readonly ShelfScenario[];
