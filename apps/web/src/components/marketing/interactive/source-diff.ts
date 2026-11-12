export type SourceDiffLine = {
  kind: "context" | "removed" | "added";
  source: string;
  before?: number;
  after?: number;
};

/** Longest common subsequence preserves repeated lines and both source documents. */
export const sourceDiff = (before: string, after: string): SourceDiffLine[] => {
  const original = before.split("\n");
  const updated = after.split("\n");
  const lengths = Array.from({ length: original.length + 1 }, () =>
    Array<number>(updated.length + 1).fill(0),
  );
  const reversedUpdated = [...updated].reverse();
  [...original].reverse().forEach((line, reverseOriginal) => {
    const originalIndex = original.length - reverseOriginal - 1;
    reversedUpdated.forEach((other, reverseUpdated) => {
      const updatedIndex = updated.length - reverseUpdated - 1;
      const row = lengths[originalIndex];
      if (!row) return;
      row[updatedIndex] =
        line === other
          ? 1 + (lengths[originalIndex + 1]?.[updatedIndex + 1] ?? 0)
          : Math.max(
              lengths[originalIndex + 1]?.[updatedIndex] ?? 0,
              row[updatedIndex + 1] ?? 0,
            );
    });
  });
  const visit = (
    originalIndex: number,
    updatedIndex: number,
  ): SourceDiffLine[] => {
    if (originalIndex >= original.length && updatedIndex >= updated.length)
      return [];
    const source = original[originalIndex];
    const replacement = updated[updatedIndex];
    if (source !== undefined && source === replacement)
      return [
        {
          kind: "context",
          source,
          before: originalIndex + 1,
          after: updatedIndex + 1,
        },
        ...visit(originalIndex + 1, updatedIndex + 1),
      ];
    if (
      source !== undefined &&
      (replacement === undefined ||
        (lengths[originalIndex + 1]?.[updatedIndex] ?? 0) >=
          (lengths[originalIndex]?.[updatedIndex + 1] ?? 0))
    )
      return [
        { kind: "removed", source, before: originalIndex + 1 },
        ...visit(originalIndex + 1, updatedIndex),
      ];
    if (replacement !== undefined)
      return [
        { kind: "added", source: replacement, after: updatedIndex + 1 },
        ...visit(originalIndex, updatedIndex + 1),
      ];
    return [];
  };
  return visit(0, 0);
};
