import { describe, expect, test } from "bun:test";
import { LINKEDIN_STATUSES } from "@/lib/outbound";
import { linkedinQueueHref, parseLinkedInQuery } from "@/lib/outbound-linkedin";

describe("LinkedIn queue URLs", () => {
  test("retains search punctuation, status and page in a shareable URL", () => {
    const query = parseLinkedInQuery({
      q: ["  100%_! Beauty & Co  ", "ignored"],
      status: ["connected", "ready"],
      page: "2",
    });
    expect(query).toEqual({
      q: "100%_! Beauty & Co",
      status: "connected",
      page: 2,
    });
    const href = linkedinQueueHref(query);
    const parameters = new URL(href, "http://localhost").searchParams;
    expect(parseLinkedInQuery(Object.fromEntries(parameters))).toEqual(query);
    expect(href).toStartWith("/linkedin?");
  });

  test.each([...LINKEDIN_STATUSES])("supports saved status %s", (status) => {
    expect(parseLinkedInQuery({ status }).status).toBe(status);
  });

  test.each(["-1", "0", "1.5", "Infinity", "no-page", "9007199254740992"])(
    "ignores invalid page %s",
    (page) => {
      expect(parseLinkedInQuery({ page }).page).toBe(1);
    },
  );

  test("bounds search input and ignores unknown filters", () => {
    const query = parseLinkedInQuery({
      q: `\u0000${"x".repeat(250)}`,
      status: "not-a-status",
      page: [],
    });
    expect(query.q).toHaveLength(200);
    expect(query.q).not.toContain("\u0000");
    expect(query.status).toBe("all");
    expect(query.page).toBe(1);
  });

  test("keeps the default URL clean and search text cannot replace the route", () => {
    expect(linkedinQueueHref()).toBe("/linkedin");
    const href = linkedinQueueHref({ q: "https://example.com/?a=b#fragment" });
    expect(new URL(href, "http://localhost").pathname).toBe("/linkedin");
    expect(new URL(href, "http://localhost").hash).toBe("");
  });
});
