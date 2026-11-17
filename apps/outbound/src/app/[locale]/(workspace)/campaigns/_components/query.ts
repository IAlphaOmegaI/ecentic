export type CampaignSearchParams = {
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};
export const campaignQuery = (
  search: CampaignSearchParams,
): {
  page: number;
  q: string;
  status: "draft" | "active" | "paused" | "archived" | "all";
} => {
  const page = Number(
    Array.isArray(search.page) ? search.page[0] : search.page,
  );
  const q = Array.isArray(search.q) ? search.q[0] : search.q;
  const status = Array.isArray(search.status)
    ? search.status[0]
    : search.status;
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: (q ?? "").replaceAll("\u0000", "").trim().slice(0, 200),
    status:
      (["draft", "active", "paused", "archived"] as const).find(
        (value) => value === status,
      ) ?? "all",
  };
};

export const campaignListHref = ({
  page,
  q,
  status,
}: {
  page: number;
  q: string;
  status: string;
}) => {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (q) query.set("q", q);
  if (status !== "all") query.set("status", status);
  return `/campaigns${query.size ? `?${query}` : ""}`;
};
