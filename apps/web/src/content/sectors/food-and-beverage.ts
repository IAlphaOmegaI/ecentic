import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "snack",
    required: [2],
    missing: [2],
  },
  {
    key: "crackers",
    required: [0, 1],
    missing: [0],
  },
  {
    key: "proteinPowder",
    required: [0, 4],
    missing: [4],
  },
] as const satisfies readonly ShelfScenario[];
