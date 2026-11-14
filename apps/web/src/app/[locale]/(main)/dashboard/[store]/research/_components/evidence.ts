type Comparison = {
  scanId: string;
  productId: string;
  model: string;
  winner: string;
};

/** Only summarize rows returned by the authenticated, store-scoped read. */
export const summarizeComparisons = (
  rows: readonly Comparison[],
  scanId: string,
) => {
  const comparisons = rows.filter((row) => row.scanId === scanId);
  const wins = comparisons.filter((row) => row.winner === "product").length;
  const models = [...new Set(comparisons.map((row) => row.model))];
  return {
    wins,
    losses: comparisons.length - wins,
    count: new Set(comparisons.map((row) => row.productId)).size,
    modelRates: Object.fromEntries(
      models.map((model) => {
        const responses = comparisons.filter((row) => row.model === model);
        const modelWins = responses.filter(
          (row) => row.winner === "product",
        ).length;
        return [
          model,
          {
            wins: modelWins,
            losses: responses.length - modelWins,
            rate: Math.round((modelWins / responses.length) * 100),
          },
        ];
      }),
    ),
  };
};
