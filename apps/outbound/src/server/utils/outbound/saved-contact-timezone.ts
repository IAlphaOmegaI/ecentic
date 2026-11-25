import { resultify } from "@zenncore/utils";
import { getDomain } from "tldts";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import type { SourceReceipt } from "./automation-qualification";

const regions: Record<string, string> = Object.fromEntries(
  (
    [
      [
        "America/New_York",
        "CT DE DC GA ME MD MA NH NJ NY NC OH PA RI SC VT VA WV",
      ],
      ["America/Chicago", "AL AR IL IA LA MN MS MO OK WI"],
      ["America/Denver", "CO MT NM UT WY"],
      ["America/Los_Angeles", "CA NV WA"],
      ["Pacific/Honolulu", "HI"],
    ] as const
  ).flatMap(([timezone, states]) =>
    states.split(" ").map((state) => [state, timezone] as const),
  ),
);
const cities = [
  ["TX", "Austin|Dallas|Houston|San Antonio|Fort Worth", "America/Chicago"],
  ["TX", "El Paso", "America/Denver"],
  [
    "FL",
    "Miami|Orlando|Tampa|Jacksonville|Fort Lauderdale|Boca Raton|Sarasota",
    "America/New_York",
  ],
  ["FL", "Pensacola|Panama City", "America/Chicago"],
  ["IN", "Indianapolis|Fort Wayne|Bloomington", "America/Indiana/Indianapolis"],
  ["MI", "Detroit|Ann Arbor|Grand Rapids|Lansing", "America/Detroit"],
  ["OR", "Portland|Salem|Eugene|Bend", "America/Los_Angeles"],
  ["AZ", "Phoenix|Scottsdale|Tucson|Tempe|Mesa", "America/Phoenix"],
  ["TN", "Nashville|Memphis|Franklin", "America/Chicago"],
  ["TN", "Knoxville|Chattanooga", "America/New_York"],
  ["KS", "Wichita|Topeka|Overland Park|Kansas City", "America/Chicago"],
  ["NE", "Omaha|Lincoln", "America/Chicago"],
  ["ND", "Fargo|Bismarck|Grand Forks", "America/Chicago"],
  ["SD", "Sioux Falls", "America/Chicago"],
  ["SD", "Rapid City", "America/Denver"],
  ["ID", "Boise|Twin Falls|Idaho Falls", "America/Boise"],
  ["ID", "Coeur d'Alene|Moscow|Lewiston", "America/Los_Angeles"],
] as const;
const postalCities = [
  ["MI", "Holland", "49422|49423|49424", "America/Detroit"],
  ["FL", "Pompano Beach", "33069", "America/New_York"],
  ["FL", "Delray Beach", "33483", "America/New_York"],
  ["TN", "Bartlett", "38002|38133", "America/Chicago"],
] as const;
const stateNames: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};
const normalizeRegion = (region: string) =>
  Object.entries(stateNames).find(
    ([name]) => name.toLowerCase() === region.trim().toLowerCase(),
  )?.[1] ?? region.trim().toUpperCase();
const zone = (region: string, city: string, postalCode: string) => {
  const state = normalizeRegion(region);
  return (
    regions[state] ??
    cities.find(
      ([region, names]) =>
        region === state && new RegExp(`^(?:${names})$`, "i").test(city.trim()),
    )?.[2] ??
    postalCities.find(
      ([region, name, codes]) =>
        region === state &&
        name.toLowerCase() === city.trim().toLowerCase() &&
        new RegExp(`^(?:${codes})(?:-\\d{4})?$`).test(postalCode),
    )?.[3] ??
    null
  );
};
const addressSchema = z.object({
  "@type": z.literal("PostalAddress"),
  streetAddress: z.string().min(3),
  addressLocality: z.string().min(1),
  addressRegion: z.string().min(2).max(24),
  postalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  addressCountry: z.enum(["US", "USA", "United States"]).optional(),
});
const printedAddress = new RegExp(
  `(?:\\b\\d{1,6}\\s+(?:(?!\\b\\d{4,6}\\b)[A-Za-z0-9 .'-]){2,70}?\\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Parkway|Pkwy|Court|Ct|Place|Pl|Highway|Hwy)\\.?(?:\\s+(?:N|S|E|W|NE|NW|SE|SW)\\b)?|\\bP\\.?O\\.?\\s+Box\\s+\\d+)(?:[,\\s]+(?:(?:Suite|Ste|Unit|Floor|#)\\s*[\\w-]+|\\d+(?:st|nd|rd|th)\\s+Floor))?[,\\s]+([A-Za-z .'-]{2,45}?)[,\\s]+(${Object.keys(
    stateNames,
  )
    .sort((left, right) => right.length - left.length)
    .join(
      "|",
    )}|[A-Z]{2})[,\\s]+(?:(?:USA?|United States(?: of America)?)[,\\s]+)?(\\d{5}(?:-\\d{4})?)\\b`,
  "gi",
);
const ownPolicyAddress = (
  source: SourceReceipt,
  index: number,
  domain: string,
) => {
  if (!/privacy|polic(?:y|ies)|terms|legal/i.test(new URL(source.url).pathname))
    return true;
  const before = source.excerpt.slice(Math.max(0, index - 240), index);
  const invitation = [
    ...before.matchAll(
      /(?:contact us(?: by mail)?|(?:e-?mail|mailing|mail|write to) us|by mail|registered office)\b/gi,
    ),
  ].at(-1);
  if (!invitation) return false;
  const subject = before.slice(invitation.index);
  if (
    /\b(?:third.party|service provider|processor|partner|their|c\/o|care of|Shopify|Google|Microsoft|Stripe|Klaviyo|Amazon)\b/i.test(
      subject,
    )
  )
    return false;
  const identity = (text: string) =>
    text
      .toLowerCase()
      .replaceAll("&", "and")
      .replace(/[^a-z0-9]/g, "");
  const brand = getDomain(normalizeDomain(domain))?.split(".").at(0) ?? "";
  return brand.length >= 3 && identity(subject).includes(identity(brand));
};
const observations = (source: SourceReceipt, domain: string) => {
  const structured = [
    ...source.excerpt.matchAll(/\{[^{}]{40,1800}\}/g),
  ].flatMap((match) => {
    const quote = match[0];
    if (!ownPolicyAddress(source, match.index, domain)) return [];
    const parsed = resultify(() => JSON.parse(quote) as unknown);
    const address = parsed.success
      ? addressSchema.safeParse(parsed.data)
      : null;
    if (!address?.success) return [];
    const timezone = zone(
      address.data.addressRegion,
      address.data.addressLocality,
      address.data.postalCode,
    );
    return timezone ? [{ timezone, quote }] : [];
  });
  const printed = [...source.excerpt.matchAll(printedAddress)].flatMap(
    (match) => {
      const [quote, city, region, postalCode] = match;
      if (!ownPolicyAddress(source, match.index, domain)) return [];
      const timezone = zone(region ?? "", city ?? "", postalCode ?? "");
      return timezone ? [{ timezone, quote }] : [];
    },
  );
  return [...structured, ...printed].map((observation) => ({
    ...observation,
    sourceUrl: source.url,
    checkedAt: source.checkedAt,
  }));
};

/** Scheduling uses an observed business address, never a guessed personal location. */
export const resolveBusinessTimezone = (
  receipts: SourceReceipt[],
  domain: string,
  now = Date.now(),
) => {
  const matches = receipts.flatMap((receipt) =>
    receipt.kind !== "provider" &&
    normalizeDomain(receipt.url) === normalizeDomain(domain) &&
    Number.isFinite(Date.parse(receipt.checkedAt)) &&
    Date.parse(receipt.checkedAt) <= now + 60_000
      ? observations(receipt, domain)
      : [],
  );
  if (new Set(matches.map((match) => match.timezone)).size !== 1) return null;
  return matches[0] ?? null;
};
