export type AnalysisSegment = { text: string; emphasized: boolean };

/** Only explicit strong phrases and exact known names receive presentation. */
export const segmentAnalysisText = (
  text: string,
  terms: readonly string[] = [],
): AnalysisSegment[] => {
  const names = [...new Set(terms.map((term) => term.trim()))]
    .filter((term) => term.length >= 2 && term.length <= 100)
    .sort((left, right) => right.length - left.length)
    .slice(0, 64);
  const pattern = names.length
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`,
        "giu",
      )
    : null;

  return text.split(/(\*\*[^*\n]{1,160}\*\*)/g).flatMap((part, index) => {
    if (index % 2 === 1)
      return [{ text: part.slice(2, -2), emphasized: true }];
    if (!pattern) return [{ text: part, emphasized: false }];

    return part.split(pattern).map((segment, index) => ({
      text: segment,
      emphasized: index % 2 === 1,
    }));
  });
};
