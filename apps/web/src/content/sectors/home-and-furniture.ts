import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "sofa",
    required: [0, 2],
    missing: [0],
  },
  {
    key: "table",
    required: [1, 2, 4],
    missing: [1],
  },
  {
    key: "rug",
    required: [1],
    missing: [1],
  },
] as const satisfies readonly ShelfScenario[];
