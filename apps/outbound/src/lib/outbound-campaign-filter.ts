/** Campaign links retain their scope through queue search, paging and review. */
export const parseCampaignFilter = (input: unknown) => {
  const value = Array.isArray(input) ? input[0] : input;
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : undefined;
};
