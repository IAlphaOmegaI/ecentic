import "server-only";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain, splitList } from "@/lib/outbound";
import { ConflictError, NotFoundError } from "@/server/utils/error";
import * as Discovery from "@/server/utils/outbound/discovery";
import * as Research from "@/server/utils/outbound/research";
import * as Store from "./store";

export const prepare = (
  actor: string,
  prospectId: string,
  deadline = Date.now() + 90000,
) =>
  resultify(async () => {
    z.string().uuid().parse(prospectId);
    const loaded = await Store.readProspect(prospectId);
    if (!loaded.success) throw loaded.error;
    const prospect = loaded.data;
    if (!prospect) throw new NotFoundError("Prospect not found.");
    if (
      prospect.sentStep ||
      !["candidate", "draft", "held"].includes(prospect.status)
    )
      throw new ConflictError(
        "This prospect is no longer eligible for new cold-outreach preparation.",
      );
    const settings = (await Store.policy()).settings;
    const hold = async (
      reason: string,
      discovered = 0,
      checked = 0,
      candidate?: Research.ProductCheck,
    ) => {
      const held = await Store.holdPreparation(actor, {
        prospect: prospect.id,
        revision: prospect.revision,
        reason,
        ...(candidate
          ? {
              details: {
                product: candidate.product,
                productUrl: candidate.url,
                gap: candidate.gap,
                finding: candidate.finding,
                evidence: candidate.evidence,
                evidenceCheckedAt: candidate.checkedAt,
                reviewCount: candidate.reviewCount,
                productCategory: candidate.productCategory,
                distributionSource: "",
                findingReviewed: false,
              },
            }
          : {}),
      });
      if (!held.success) throw held.error;
      return {
        prospectId,
        status: "hold" as const,
        discovered,
        checked,
        productUrl: candidate?.url ?? null,
        reason,
      };
    };
    if (
      prospect.details.relationship !== "cold" ||
      !splitList(settings.allowedCountries)
        .map((country) => country.toUpperCase())
        .includes(prospect.details.country) ||
      splitList(settings.heldCountries)
        .map((country) => country.toUpperCase())
        .includes(prospect.details.country) ||
      splitList(settings.excludedDomains)
        .map(normalizeDomain)
        .includes(normalizeDomain(prospect.details.domain))
    )
      return hold("This prospect is outside the current cold-outreach policy.");
    if (
      prospect.details.evidence &&
      prospect.details.gap &&
      prospect.details.finding &&
      prospect.details.productUrl &&
      prospect.details.findingReviewed &&
      Date.now() - Date.parse(prospect.details.evidenceCheckedAt) < 86400_000 &&
      Date.parse(prospect.details.evidenceCheckedAt) <= Date.now()
    )
      return {
        prospectId,
        status: "verified" as const,
        discovered: 0,
        checked: 0,
        productUrl: prospect.details.productUrl,
        reason: null,
      };
    const website =
      prospect.details.website || `https://${prospect.details.domain}`;
    if (normalizeDomain(website) !== normalizeDomain(prospect.details.domain))
      return hold("The storefront must belong to this prospect's company.");
    const discovered =
      Date.now() < deadline
        ? await Discovery.discover({ website, deadline })
        : {
            urls: [] as string[],
            reason:
              "The batch research budget ended. Prepare this prospect in the next run.",
          };
    const state = { checked: 0, reason: discovered.reason };
    for (const url of discovered.urls) {
      if (Date.now() >= deadline) {
        state.reason =
          "The research time budget ended before a reliable finding was found.";
        break;
      }
      const checked = await Research.checkProduct({ url });
      state.checked += 1;
      if (!checked.success) {
        state.reason = "The product check failed; the company needs review.";
        break;
      }
      if (checked.data.status !== "verified") {
        state.reason = checked.data.reason;
        if (checked.data.gap && checked.data.finding && checked.data.evidence)
          return hold(
            checked.data.reason ?? "The candidate finding needs source review.",
            discovered.urls.length,
            state.checked,
            checked.data,
          );
        if (
          /blocked|unavailable|access rules|password|login|could not be read/i.test(
            checked.data.reason ?? "",
          )
        )
          break;
        continue;
      }
      const saved = await Store.patchProspect(
        actor,
        prospect.id,
        {
          product: checked.data.product,
          productUrl: checked.data.url,
          gap: checked.data.gap,
          finding: checked.data.finding,
          evidence: checked.data.evidence,
          evidenceCheckedAt: checked.data.checkedAt,
          reviewCount: checked.data.reviewCount,
          productCategory: checked.data.productCategory,
          findingReviewed: false,
        },
        prospect.revision,
      );
      if (!saved.success) throw saved.error;
      return {
        prospectId,
        status: "verified" as const,
        discovered: discovered.urls.length,
        checked: state.checked,
        productUrl: checked.data.url,
        reason: null,
      };
    }
    const reason =
      state.reason ??
      "No verified product finding was established from the checked pages.";
    return hold(reason, discovered.urls.length, state.checked);
  });
