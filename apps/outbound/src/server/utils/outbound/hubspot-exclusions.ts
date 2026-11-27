import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import {
  hubspotPullInputSchema,
  hubspotPullStateSchema,
} from "@/lib/outbound-hubspot";

export const hubspotHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function requireProof(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
export const projectHubspotExclusions = (
  input: unknown,
  output: unknown,
  now = Date.now(),
) => {
  const request = hubspotPullInputSchema.parse(input);
  const state = hubspotPullStateSchema.parse(output);
  requireProof(
    state.pages.length <= request.maxPages,
    "The HubSpot page bound changed.",
  );
  const progress = {
    object: "companies" as "companies" | "contacts",
    after: null as string | null,
    complete: false,
    observed: 0,
  };
  const cursors = new Set<string>();
  const records = new Set<string>();
  const exclusions = new Map<
    string,
    {
      scope: "domain" | "email";
      value: string;
      sources: {
        object: string;
        id: string;
        property: string;
        value: string;
        updatedAt: string;
        observedAt: string;
      }[];
    }
  >();
  const skipped: {
    object: string;
    id: string;
    property: string;
    reason: string;
  }[] = [];
  for (const page of state.pages) {
    requireProof(
      !progress.complete &&
        page.object === progress.object &&
        page.after === progress.after,
      "The HubSpot page history is discontinuous.",
    );
    requireProof(
      page.responseHash === hubspotHash(page.response),
      "The HubSpot page proof changed.",
    );
    const observed = Date.parse(page.observedAt);
    requireProof(
      observed >= progress.observed && observed <= now,
      "The HubSpot observation time is invalid.",
    );
    progress.observed = observed;
    const cursor = `${page.object}:${page.after ?? "first"}`;
    requireProof(!cursors.has(cursor), "The HubSpot cursor repeated.");
    cursors.add(cursor);
    for (const record of page.response.results) {
      const identity = `${page.object}:${record.id}`;
      requireProof(
        !records.has(identity),
        "The HubSpot record repeated across pages; start a new checked pull.",
      );
      records.add(identity);
      const properties =
        page.object === "companies"
          ? (["domain", "hs_additional_domains"] as const)
          : (["email", "hs_additional_emails"] as const);
      for (const property of properties) {
        const source = record.properties[property];
        if (!source) continue;
        for (const raw of source.split(";")) {
          const clean = raw.trim().toLowerCase();
          if (!clean) continue;
          const scope =
            page.object === "companies"
              ? ("domain" as const)
              : ("email" as const);
          const value =
            scope === "domain"
              ? /^[\p{L}\p{N}.-]+$/u.test(clean)
                ? normalizeDomain(clean)
                : ""
              : z.email().max(320).safeParse(clean).success
                ? clean
                : "";
          if (!value) {
            skipped.push({
              object: page.object,
              id: record.id,
              property,
              reason: "No valid explicit domain or email; nothing inferred.",
            });
            continue;
          }
          const key = `${scope}:${value}`;
          const entry = exclusions.get(key) ?? { scope, value, sources: [] };
          entry.sources.push({
            object: page.object,
            id: record.id,
            property,
            value: raw,
            updatedAt: record.updatedAt,
            observedAt: page.observedAt,
          });
          exclusions.set(key, entry);
          requireProof(
            exclusions.size <= 10000,
            "The HubSpot preview exceeds ten thousand explicit exclusions.",
          );
        }
      }
    }
    const next = page.response.paging?.next?.after ?? null;
    requireProof(
      !next || !cursors.has(`${page.object}:${next}`),
      "The HubSpot paging cursor did not advance.",
    );
    if (next) progress.after = next;
    else if (page.object === "companies") {
      progress.object = "contacts";
      progress.after = null;
    } else {
      progress.complete = true;
      progress.after = null;
    }
  }
  requireProof(
    state.object === progress.object && state.after === progress.after,
    "The saved HubSpot cursor differs from its page history.",
  );
  requireProof(
    Boolean(state.completedAt) === progress.complete,
    "The HubSpot completion marker differs from the exhausted pages.",
  );
  if (state.completedAt)
    requireProof(
      Date.parse(state.completedAt) >= progress.observed &&
        Date.parse(state.completedAt) <= now &&
        !state.lease,
      "The HubSpot completion time or lease is invalid.",
    );
  const entries = [...exclusions.values()].sort((left, right) =>
    `${left.scope}:${left.value}`.localeCompare(
      `${right.scope}:${right.value}`,
    ),
  );
  const addressed = new Set(
    entries.flatMap((entry) =>
      entry.sources.map((source) => `${source.object}:${source.id}`),
    ),
  );
  const previewHash = hubspotHash({
    request,
    pages: state.pages,
    completedAt: state.completedAt ?? null,
    entries,
    skipped,
  });
  if (state.applied)
    requireProof(
      state.completedAt &&
        state.applied.previewHash === previewHash &&
        state.applied.added + state.applied.existing === entries.length &&
        Date.parse(state.applied.at) >= Date.parse(state.completedAt) &&
        Date.parse(state.applied.at) <= now,
      "The HubSpot applied checkpoint differs from its preview.",
    );
  return {
    previewHash,
    complete: progress.complete,
    pages: state.pages.length,
    records: records.size,
    unaddressableRecords: records.size - addressed.size,
    entries,
    skipped,
    completedAt: state.completedAt ?? null,
    applied: state.applied ?? null,
  };
};
