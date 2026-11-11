import type { ShelfScenario } from "./index";

/** Invented comparison scenarios; all visible sample facts live in interactiveShelf. */
export const scenarios = [
  {
    key: "cityBreak",
    required: [0, 4],
    missing: [0],
  },
  {
    key: "foodTour",
    required: [4, 5],
    missing: [5],
  },
  {
    key: "chalet",
    required: [4, 5],
    missing: [5],
  },
] as const satisfies readonly ShelfScenario[];
