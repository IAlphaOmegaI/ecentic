import "server-only";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { spokenMerchantName } from "@/lib/outbound-round3-copy";
import {
  type Round3CopyProof,
  round3CopyProofSchema,
  type ShoppingResearch,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";
import { projectBrowserExecution } from "./live-shopping-browser";
import type { SavedResearchEvidence } from "./shopping-assessment";
import {
  computeDiscoveryBase,
  matchMerchantText,
  replayShoppingCapture,
} from "./shopping-presence";

export type NoProductBrandsReview = NonNullable<
  Round3CopyProof["noProductBrands"]
>;

const proofFor = (
  evidence: SavedResearchEvidence,
  receipt: ShoppingResearch,
  noProductBrands: NoProductBrandsReview | undefined,
  now: number,
): Round3CopyProof => {
  const merchant = evidence.answer.job.query.merchant;
  if (!merchant || receipt.selected.kind !== "discovery-absence")
    throw new Error(
      "Round-three absence proof requires the saved merchant identity and an absence finding.",
    );
  if (
    !isDeepStrictEqual(receipt.sources, [
      evidence.answer.source,
      ...evidence.browser.sources,
    ])
  )
    throw new Error("The receipt sources differ from the saved capture.");
  const spokenName = spokenMerchantName({ company: merchant.name });
  const domain = merchant.domain.replace(/^www\./i, "").toLowerCase();
  // The original query identity must remain intact; aliases are checked below
  // without altering the capture's saved merchant object.
  const full = replayShoppingCapture(evidence.answer, now);
  const original = computeDiscoveryBase(
    { ...evidence, allowBoundCardAliases: true },
    now,
  );
  if (
    full.completeness.status !== "complete" ||
    original.completeness.status !== "complete" ||
    original.merchantPresent !== false ||
    receipt.discovery?.answerHash !== full.answerHash ||
    receipt.discovery.linksHash !== full.linksHash ||
    receipt.discovery.sourceId !== evidence.answer.source.id
  )
    throw new Error(
      original.completeness.reason ??
        "The complete original answer does not establish merchant absence.",
    );
  const names = { ...merchant, aliases: [...merchant.aliases, spokenName] };
  const product = evidence.answer.job.query.product;
  if (spokenName === "Midwinter Co." && merchant.name !== spokenName) {
    const source = evidence.browser.sources.find(
      (source) => source.kind === "product" && source.url === product.url,
    );
    const raw =
      source &&
      evidence.browser.raw.find(
        (capture) => source.artifact === `sha256:${capture.sha256}`,
      );
    const projected =
      source && raw
        ? projectBrowserExecution({
            capture: raw,
            url: source.url,
            id: source.id,
            productName: product.name,
            startedAt: raw.receivedAt,
            now,
          })
        : null;
    if (
      !projected ||
      !source ||
      !isDeepStrictEqual(projected.source, source) ||
      !matchMerchantText(
        [
          projected.rendered.title,
          projected.rendered.text,
          ...projected.rendered.headings,
        ].join("\n"),
        { ...merchant, name: spokenName, aliases: [] },
        product,
      ).includes(spokenName)
    )
      throw new Error(
        "The configured Midwinter spoken name needs intact rendered merchant-page support.",
      );
  }
  if (
    [...full.answerVariants, ...full.citationText].some(
      (text) => matchMerchantText(text, names, product).length,
    )
  )
    throw new Error(
      "The full or spoken merchant name appears in the saved answer or cited links.",
    );
  const citedSources = evidence.browser.sources
    .filter((source) => source.kind === "competitor")
    .map((source) => {
      const raw = evidence.browser.raw.find(
        (capture) => source.artifact === `sha256:${capture.sha256}`,
      );
      const projected = raw
        ? projectBrowserExecution({
            capture: raw,
            url: source.url,
            id: source.id,
            productName: product.name,
            startedAt: raw.receivedAt,
            now,
          })
        : null;
      if (!raw || !projected || !isDeepStrictEqual(projected.source, source))
        throw new Error(
          "A saved cited page is missing its intact raw browser proof.",
        );
      const rendered = projected.rendered;
      const text = [
        source.url,
        rendered.title,
        rendered.text,
        ...rendered.headings,
        ...rendered.selected,
        ...rendered.structured,
      ].join("\n");
      if (matchMerchantText(text, names, product).length)
        throw new Error(
          "The full or spoken merchant name appears in a saved cited page.",
        );
      return { id: source.id, url: source.url, sha256: raw.sha256 };
    });
  if (noProductBrands) {
    if (
      !(
        (merchant.name === "Diamond Dotz" && domain === "diamonddotz.com") ||
        (merchant.name === "Terrapin Ridge Farms" &&
          domain === "terrapinridge.com")
      ) ||
      noProductBrands.expectedAnswerHash !== full.answerHash ||
      noProductBrands.expectedLinksHash !== full.linksHash ||
      Date.parse(noProductBrands.reviewedAt) > now + 60_000 ||
      receipt.discovery?.brandProjection ||
      receipt.claims?.some((claim) => claim.kind === "brand")
    )
      throw new Error(
        "This saved answer has no authorized, intact no-product-brand review.",
      );
  }
  return round3CopyProofSchema.parse({
    version: "round3-copy-proof-v1",
    sourceId: evidence.answer.source.id,
    answerHash: full.answerHash,
    linksHash: full.linksHash,
    fullName: merchant.name,
    spokenName,
    domain,
    namesAbsent: true,
    citedSources,
    ...(noProductBrands ? { noProductBrands } : {}),
  });
};

/** No provider: the operator attestation is authorized only for its exact saved answer. */
export const projectRound3CopyProof = (
  evidence: SavedResearchEvidence,
  receipt: ShoppingResearch,
  options: { noProductBrands?: NoProductBrandsReview } = {},
  now = Date.now(),
) =>
  resultify(() =>
    shoppingResearchSchema.parse({
      ...receipt,
      discovery: {
        ...receipt.discovery,
        round3CopyProof: proofFor(
          evidence,
          receipt,
          options.noProductBrands,
          now,
        ),
      },
    }),
  );

/** Called after normal capture/receipt replay; old receipts without this proof stay unchanged. */
export const validateRound3CopyProof = (
  evidence: SavedResearchEvidence,
  receipt: ShoppingResearch,
  now = Date.now(),
): string | null => {
  const saved = receipt.discovery?.round3CopyProof;
  if (!saved) return null;
  const replayed = resultify(() =>
    proofFor(evidence, receipt, saved.noProductBrands, now),
  );
  return !replayed.success
    ? replayed.error.message
    : isDeepStrictEqual(replayed.data, saved)
      ? null
      : "The round-three copy proof changed from its original answer, identity or saved cited pages.";
};
