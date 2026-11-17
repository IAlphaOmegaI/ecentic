import { expect, test } from "bun:test";
import { parseReviewQuery, reviewQueueHref } from "@/lib/outbound-review";
import { parseLinkedInQuery, linkedinQueueHref } from "@/lib/outbound-linkedin";

const campaign = "ad85b9e2-8b03-4ab0-9c12-d8c987ee5f45";
test("campaign scope survives review and LinkedIn filtering, paging and shared links", () => {
  for (const [parse, href] of [[parseReviewQuery, reviewQueueHref], [parseLinkedInQuery, linkedinQueueHref]] as const) {
    const query = parse({ campaign, q: "brand", page: 3 });
    expect(query.campaign).toBe(campaign);
    expect(new URL(href({ ...query, page: 4 }), "https://outbound.ecentic.ai").searchParams.get("campaign")).toBe(campaign);
    expect(parse({ campaign: "https://untrusted.example" }).campaign).toBeUndefined();
  }
});
