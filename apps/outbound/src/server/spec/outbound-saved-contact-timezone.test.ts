import { describe, expect, test } from "bun:test";
import type { SourceReceipt } from "@/server/utils/outbound/automation-qualification";
import { resolveBusinessTimezone } from "@/server/utils/outbound/saved-contact-timezone";

const receipt = (
  excerpt: string,
  url = "https://brand.com/contact",
): SourceReceipt => ({
  url,
  kind: "company",
  excerpt,
  checkedAt: "2026-11-25T09:00:00.000Z",
  sha256: "a".repeat(64),
});
const now = Date.parse("2026-11-25T10:00:00.000Z");
describe("resolveBusinessTimezone", () => {
  test("keeps actual postal address and source as business-hours evidence", () => {
    const source = receipt("Contact us at 123 Main Street, Boston, MA 02110.");
    expect(resolveBusinessTimezone([source], "brand.com", now)).toEqual({
      timezone: "America/New_York",
      quote: "123 Main Street, Boston, MA 02110",
      sourceUrl: source.url,
      checkedAt: source.checkedAt,
    });
  });
  test("reads structured US postal addresses", () => {
    const address = JSON.stringify({
      "@type": "PostalAddress",
      streetAddress: "100 Main Street",
      addressLocality: "Austin",
      addressRegion: "TX",
      postalCode: "78701",
      addressCountry: "US",
    });
    expect(
      resolveBusinessTimezone([receipt(address)], "brand.com", now)?.timezone,
    ).toBe("America/Chicago");
  });
  test("does not assign a zone from country, a state alone or a different domain", () => {
    expect(
      resolveBusinessTimezone(
        [receipt("We serve all customers in New York and California, USA.")],
        "brand.com",
        now,
      ),
    ).toBeNull();
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "123 Main Street, Boston, MA 02110",
            "https://competitor.com/contact",
          ),
        ],
        "brand.com",
        now,
      ),
    ).toBeNull();
  });
  test("requires a known city for split-zone states", () => {
    expect(
      resolveBusinessTimezone(
        [receipt("123 Main Street, El Paso, TX 79901")],
        "brand.com",
        now,
      )?.timezone,
    ).toBe("America/Denver");
    expect(
      resolveBusinessTimezone(
        [receipt("123 Main Street, Unknownville, TX 79901")],
        "brand.com",
        now,
      ),
    ).toBeNull();
  });
  test("refuses ambiguous business locations and future receipts", () => {
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "123 Main Street, Boston, MA 02110. 444 New Road, Los Angeles, CA 90001",
          ),
        ],
        "brand.com",
        now,
      ),
    ).toBeNull();
    expect(
      resolveBusinessTimezone(
        [
          {
            ...receipt("123 Main Street, Boston, MA 02110"),
            checkedAt: "2027-01-01T00:00:00.000Z",
          },
        ],
        "brand.com",
        now,
      ),
    ).toBeNull();
  });
  test.each([
    ["4433 Holland Ave. Holland, MI 49424", "America/Detroit"],
    ["2141 Blount Road Pompano Beach, Florida, 33069", "America/New_York"],
    ["7598 AE Beaty Dr Bartlett, TN 38133", "America/Chicago"],
    [
      "1110 South Federal Highway, Delray Beach, Florida 33483",
      "America/New_York",
    ],
    [
      "777 Florida St., Suite 202, San Francisco California US 94110",
      "America/Los_Angeles",
    ],
    ["200 CORPORATE BLVD S, SUITE 130, YONKERS NY 10701", "America/New_York"],
    [
      "503 Carthage Street, Suite 309, Sanford, NC, USA, 27330",
      "America/New_York",
    ],
    [
      "930 State Street, 2nd Floor Santa Barbara, CA, 93101",
      "America/Los_Angeles",
    ],
  ])("parses a printed business address unchanged: %s", (address, zone) => {
    const source = receipt(`Contact us: ${address} USA. Customer service.`);
    expect(resolveBusinessTimezone([source], "brand.com", now)).toEqual({
      timezone: zone,
      quote: address,
      sourceUrl: source.url,
      checkedAt: source.checkedAt,
    });
  });
  test("accepts full state names in original structured addresses", () => {
    const address = JSON.stringify({
      "@type": "PostalAddress",
      streetAddress: "20 Jay Street",
      addressLocality: "Brooklyn",
      addressRegion: "New York",
      postalCode: "11201",
      addressCountry: "US",
    });
    expect(
      resolveBusinessTimezone([receipt(address)], "brand.com", now),
    ).toEqual({
      timezone: "America/New_York",
      quote: address,
      sourceUrl: "https://brand.com/contact",
      checkedAt: "2026-11-25T09:00:00.000Z",
    });
  });
  test("does not treat a copyright year as the street number", () => {
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "© HEAVEN MAYHEM 2026 HEAVEN MAYHEM LLC 7190 W Sunset Blvd Los Angeles, CA, 90046",
          ),
        ],
        "brand.com",
        now,
      )?.quote,
    ).toBe("7190 W Sunset Blvd Los Angeles, CA, 90046");
  });
  test("requires observed city and supported ZIP together for new split-state matches", () => {
    for (const address of [
      "4433 Holland Ave. Holland, MI 33069",
      "4433 Holland Ave. Unknownville, MI 49424",
      "2141 Blount Road Unknownville, Florida 33069",
      "2141 Blount Road Pompano Beach, Florida 32501",
    ])
      expect(
        resolveBusinessTimezone([receipt(address)], "brand.com", now),
      ).toBeNull();
  });
  test("does not use a service provider's address on the company's policy page", () => {
    const url = "https://brand.com/policies/privacy-policy";
    for (const excerpt of [
      "Our service provider is based at 123 Main Street, Boston, MA 02110.",
      "Contact us at Brand or our service provider Shopify, 123 Main Street, Boston, MA 02110.",
      "Google privacy department: 123 Main Street, Boston, MA 02110.",
    ])
      expect(
        resolveBusinessTimezone([receipt(excerpt, url)], "brand.com", now),
      ).toBeNull();
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "Contact us by mail at: Brand LLC 123 Main Street, Boston, MA 02110.",
            url,
          ),
        ],
        "brand.com",
        now,
      )?.timezone,
    ).toBe("America/New_York");
  });
  test("preserves ambiguity after parsing expanded formats", () => {
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "4433 Holland Ave. Holland, Michigan 49424. 123 Main Street, El Paso, TX 79901.",
          ),
        ],
        "brand.com",
        now,
      ),
    ).toBeNull();
    expect(
      resolveBusinessTimezone(
        [
          receipt(
            "Polysorbate 60, Sodium Phosphate, Iron Oxide CI 77499, Ultramarine CI 77007",
          ),
        ],
        "brand.com",
        now,
      ),
    ).toBeNull();
  });
});
