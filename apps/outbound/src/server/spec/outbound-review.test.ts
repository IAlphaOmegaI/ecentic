import { describe, expect, test } from "bun:test";
import { parseReviewQuery, reviewQueueHref } from "@/lib/outbound-review";

describe("review queue URLs", () => {
  test("accepts a shared filtered page without losing search punctuation", () => {
    const query = parseReviewQuery({
      q: ["  100%_! Beauty & Co  ", "ignored"],
      status: ["held", "draft"],
      page: "2",
    });
    expect(query).toEqual({ q: "100%_! Beauty & Co", status: "held", page: 2 });
    const href = reviewQueueHref(query);
    const parameters = new URL(href, "http://localhost").searchParams;
    expect(parseReviewQuery(Object.fromEntries(parameters))).toEqual(query);
    expect(href).toStartWith("/review?");
  });

  test.each(["-1", "0", "1.5", "Infinity", "no-page", "9007199254740992"])(
    "ignores invalid page %s",
    (page) => {
      expect(parseReviewQuery({ page }).page).toBe(1);
    },
  );

  test("bounds input and removes values that cannot be searched in Postgres", () => {
    const query = parseReviewQuery({
      q: `\u0000${"x".repeat(250)}`,
      status: "optedOut",
      page: [],
    });
    expect(query.q).toHaveLength(200);
    expect(query.q).not.toContain("\u0000");
    expect(query.status).toBe("all");
    expect(query.page).toBe(1);
  });

  test("keeps the default queue URL clean and does not accept a destination URL", () => {
    expect(reviewQueueHref()).toBe("/review");
    const href = reviewQueueHref({ q: "https://example.com/?a=b#fragment" });
    expect(new URL(href, "http://localhost").pathname).toBe("/review");
    expect(new URL(href, "http://localhost").hash).toBe("");
  });
});
