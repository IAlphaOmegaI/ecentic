type Segment = string | number;

export type EditorialChange = {
  path: Segment[];
  before: string;
  after: string;
};

const read = (value: unknown, path: Segment[]): unknown =>
  path.reduce<unknown>((current, segment) => {
    if (Array.isArray(current) && typeof segment === "number")
      return current[segment];
    if (current && typeof current === "object" && typeof segment === "string")
      return (current as Record<string, unknown>)[segment];
    throw new Error("Editorial patch path no longer exists.");
  }, value);

/** Exact before/after checks make the patch repeatable without replacing later edits. */
export const applyEditorialChanges = <T>(
  original: T,
  changes: EditorialChange[],
) => {
  const updated = structuredClone(original);
  const applied = changes.map(({ path, before, after }) => {
    const current = read(updated, path);
    if (current === after) return false;
    if (current !== before)
      throw new Error(
        `Editorial copy changed at ${path.join(".")}; review required.`,
      );

    const parent = read(updated, path.slice(0, -1));
    const key = path.at(-1);
    if (Array.isArray(parent) && typeof key === "number") {
      parent[key] = after;
      return true;
    }
    if (parent && typeof parent === "object" && typeof key === "string") {
      (parent as Record<string, unknown>)[key] = after;
      return true;
    }
    throw new Error("Editorial patch target is not a text field.");
  });

  return { updated, changes: applied.filter(Boolean).length };
};
