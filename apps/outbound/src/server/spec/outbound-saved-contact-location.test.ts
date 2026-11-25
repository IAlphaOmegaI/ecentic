import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as HTTP from "@/server/utils/http";
import type { SourceReceipt } from "@/server/utils/outbound/automation-qualification";
import { collectLocationReceipts } from "@/server/utils/outbound/saved-contact-location";
import { resolveBusinessTimezone } from "@/server/utils/outbound/saved-contact-timezone";

const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
) => {
  if (!result.success) throw result.error;
  return result.data;
};
const fixture = (
  pages: Record<string, { body: string; status?: number; url?: string }>,
) =>
  spyOn(HTTP, "page").mockImplementation(async (url) => {
    const page = pages[url];
    return {
      success: true,
      data: {
        status: page?.status ?? (page ? 200 : 404),
        body: page?.body ?? "Missing",
        url: page?.url ?? url,
        headers: new Headers(),
      },
    };
  });
const run = (existing: SourceReceipt[] = []) =>
  collectLocationReceipts({
    website: "https://brand.com",
    deadline: Date.now() + 30000,
    existing,
  });

afterEach(() => mock.restore());

describe("saved contact public location collection", () => {
  test("captures visible address and structured PostalAddress while keeping original receipts", async () => {
    const address = {
      "@type": "PostalAddress",
      streetAddress: "123 Main Street",
      addressLocality: "Boston",
      addressRegion: "MA",
      postalCode: "02110",
      addressCountry: "US",
    };
    const body = `<main><div>123 Main Street</div><span>Boston, MA 02110</span></main><script>private script address</script><div hidden>hidden address</div><div style="display:none">concealed address</div><script type="application/ld+json">${JSON.stringify({ "@type": "Organization", address })}</script>`;
    const page = fixture({
      "https://brand.com/robots.txt": { body: "User-agent: *\nAllow: /" },
      "https://brand.com/": { body: '<a href="/contact">Contact</a>' },
      "https://brand.com/contact": { body },
    });
    const existing: SourceReceipt = {
      kind: "product",
      url: "https://brand.com/products/item",
      excerpt: "Original product evidence",
      sha256: "a".repeat(64),
      checkedAt: "2026-11-15T00:00:00.000Z",
    };
    const receipts = value(await run([existing]));
    expect(receipts[0]).toBe(existing);
    const observed = receipts.find((receipt) =>
      receipt.url.endsWith("/contact"),
    );
    expect(observed?.sha256).toBe(
      createHash("sha256").update(body).digest("hex"),
    );
    expect(observed?.excerpt).toContain(JSON.stringify(address));
    expect(observed?.excerpt).toContain("123 Main Street Boston, MA 02110");
    expect(observed?.excerpt).not.toContain("private script");
    expect(observed?.excerpt).not.toContain("hidden address");
    expect(observed?.excerpt).not.toContain("concealed address");
    expect(Date.parse(observed?.checkedAt ?? "")).toBeLessThanOrEqual(
      Date.now(),
    );
    expect(resolveBusinessTimezone(receipts, "brand.com")?.timezone).toBe(
      "America/New_York",
    );
    expect(page.mock.calls.length).toBeLessThanOrEqual(5);
    expect(page.mock.calls.every(([, options]) => options?.strictGuard)).toBe(
      true,
    );
  });
  test("follows at most three own-site contact, about or privacy links", async () => {
    const page = fixture({
      "https://brand.com/robots.txt": { body: "", status: 404 },
      "https://brand.com/": {
        body: '<a href="https://other.com/contact">Other</a><a href="/contact">Contact</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/pages/about-us">More</a>',
      },
    });
    value(await run());
    expect(page.mock.calls.map(([url]) => url)).toEqual([
      "https://brand.com/robots.txt",
      "https://brand.com/",
      "https://brand.com/contact",
      "https://brand.com/about",
      "https://brand.com/privacy",
    ]);
  });
  test("respects a robots denial without trying alternative address paths", async () => {
    const page = fixture({
      "https://brand.com/robots.txt": {
        body: "User-agent: *\nDisallow: /contact",
      },
      "https://brand.com/": { body: '<a href="/contact">Contact</a>' },
    });
    const receipts = value(await run());
    expect(page).toHaveBeenCalledTimes(2);
    expect(receipts).toHaveLength(1);
  });
  test.each([401, 403, 429])(
    "stops on denied address page HTTP %s",
    async (status) => {
      const page = fixture({
        "https://brand.com/robots.txt": { body: "", status: 404 },
        "https://brand.com/": { body: '<a href="/contact">Contact</a>' },
        "https://brand.com/contact": { body: "Denied", status },
      });
      expect(value(await run())).toHaveLength(1);
      expect(page).toHaveBeenCalledTimes(3);
    },
  );
  test("rejects challenge receipts and redirects to another company without fallback", async () => {
    const page = fixture({
      "https://brand.com/robots.txt": { body: "", status: 404 },
      "https://brand.com/": { body: '<a href="/contact">Contact</a>' },
      "https://brand.com/contact": {
        body: "<title>Just a moment...</title><p>123 Main Street Boston MA 02110</p>",
      },
    });
    expect(value(await run())).toHaveLength(1);
    expect(page).toHaveBeenCalledTimes(3);
    page.mockImplementation(async () => ({
      success: true,
      data: {
        status: 200,
        body: "",
        url: "https://other.com/robots.txt",
        headers: new Headers(),
      },
    }));
    expect(value(await run())).toEqual([]);
    expect(page).toHaveBeenCalledTimes(4);
  });
  test("an expired deadline or invalid website makes no request", async () => {
    const page = fixture({});
    expect(
      value(
        await collectLocationReceipts({
          website: "https://brand.com",
          deadline: Date.now() - 1,
        }),
      ),
    ).toEqual([]);
    expect(
      (
        await collectLocationReceipts({
          website: "http://brand.com",
          deadline: Date.now() + 30000,
        })
      ).success,
    ).toBe(false);
    expect(page).not.toHaveBeenCalled();
  });
});
