import "server-only";

import { createPublicKey } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { resultify } from "@zenncore/utils";
import { getDomain } from "tldts";
import { z } from "zod";
import type { DnsObservation, DomainReadiness } from "@/lib/outbound-warmup";

export type SenderDnsResolver = {
  resolveTxt: (hostname: string) => Promise<string[][]>;
  resolveMx: (
    hostname: string,
  ) => Promise<{ exchange: string; priority: number }[]>;
};

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(domainToASCII)
  .refine(
    (domain) =>
      domain.length <= 253 &&
      !isIP(domain) &&
      Boolean(getDomain(domain)) &&
      domain
        .split(".")
        .every((label) =>
          /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
        ) &&
      !/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(
        domain,
      ),
    "Enter a public sending domain.",
  );
const inputSchema = z
  .object({
    domain: domainSchema,
    dkimSelectors: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9_](?:[a-z0-9_.-]*[a-z0-9_])?$/),
      )
      .max(8)
      .default([]),
  })
  .strict();
type Lookup = { records: string[]; known: boolean };
const absent = (error: unknown) =>
  z.object({ code: z.string() }).safeParse(error).data?.code;
const txt = async (
  resolver: SenderDnsResolver,
  hostname: string,
): Promise<Lookup> => {
  const answer = await resultify(() => resolver.resolveTxt(hostname));
  if (answer.success)
    return {
      records: answer.data.map((record) => record.join("")),
      known: true,
    };
  return {
    records: [],
    known: ["ENODATA", "ENOTFOUND", "NXDOMAIN"].includes(
      absent(answer.error) ?? "",
    ),
  };
};
const observation = (
  lookup: Lookup,
  accepts: (record: string) => boolean,
): DnsObservation => {
  if (!lookup.known) return { state: "unknown", records: [] };
  const records = lookup.records.filter(accepts);
  return {
    state: !records.length
      ? "missing"
      : records.length > 1
        ? "invalid"
        : "present",
    records,
  };
};
const tags = (record: string) =>
  Object.fromEntries(
    record.split(";").flatMap((entry) => {
      const separator = entry.indexOf("=");
      return separator < 0
        ? []
        : [
            [
              entry.slice(0, separator).trim().toLowerCase(),
              entry.slice(separator + 1).trim(),
            ],
          ];
    }),
  );

const validDkimKey = (record: string) => {
  const attributes = tags(record);
  const encoded = attributes["p"]?.replaceAll(/\s/g, "") ?? "";
  if (
    !encoded ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ||
    encoded.length % 4 === 1
  )
    return false;
  const bytes = Buffer.from(encoded, "base64");
  const algorithm = attributes["k"]?.toLowerCase() ?? "rsa";
  if (algorithm === "ed25519") return bytes.length === 32;
  if (algorithm !== "rsa") return false;
  const key = resultify(() =>
    createPublicKey({ key: bytes, format: "der", type: "spki" }),
  );
  return key.success && key.data.asymmetricKeyType === "rsa";
};

/** DNS only. Publishing records is not proof that a real message authenticates or lands in the inbox. */
export const checkSendingDomain = async (
  input: { domain: string; dkimSelectors?: string[] },
  resolver: SenderDnsResolver = new Resolver({ timeout: 2500, tries: 1 }),
) =>
  resultify(async (): Promise<DomainReadiness> => {
    const parsed = inputSchema.parse(input);
    const domain = parsed.domain;
    const selectors = [...new Set(parsed.dkimSelectors)];
    const [mail, sender, policy, signatures] = await Promise.all([
      resultify(() => resolver.resolveMx(domain)),
      txt(resolver, domain),
      txt(resolver, `_dmarc.${domain}`),
      Promise.all(
        selectors.map(async (selector) => ({
          selector,
          answer: await txt(resolver, `${selector}._domainkey.${domain}`),
        })),
      ),
    ]);
    const mx: DnsObservation = mail.success
      ? {
          state: !mail.data.length
            ? "missing"
            : mail.data.some(
                  (record) => record.exchange === "." || !record.exchange,
                )
              ? "invalid"
              : "present",
          records: mail.data.map(
            (record) => `${record.priority} ${record.exchange}`,
          ),
        }
      : {
          state: ["ENODATA", "ENOTFOUND", "NXDOMAIN"].includes(
            absent(mail.error) ?? "",
          )
            ? "missing"
            : "unknown",
          records: [],
        };
    const spf = observation(sender, (record) =>
      /^v=spf1(?:\s|$)/i.test(record),
    );
    if (
      spf.state === "present" &&
      (!/\s\S/.test(spf.records[0] ?? "") ||
        /(?:^|\s)\+?all(?:\s|$)/i.test(spf.records[0] ?? ""))
    )
      spf.state = "invalid";

    const root = getDomain(domain) ?? domain;
    const directPolicy = observation(policy, (record) =>
      /^v=DMARC1(?:\s*;|$)/i.test(record),
    );
    const inherited = directPolicy.state === "missing" && root !== domain;
    const dmarc = inherited
      ? observation(await txt(resolver, `_dmarc.${root}`), (record) =>
          /^v=DMARC1(?:\s*;|$)/i.test(record),
        )
      : directPolicy;
    const requestedPolicy = tags(dmarc.records[0] ?? "")["p"]?.toLowerCase();
    const acceptedPolicy = ["none", "quarantine", "reject"].includes(
      requestedPolicy ?? "",
    )
      ? (requestedPolicy as "none" | "quarantine" | "reject")
      : null;
    if (dmarc.state === "present" && !acceptedPolicy) dmarc.state = "invalid";

    const keys = signatures.flatMap(({ selector, answer }) =>
      answer.records
        .filter(
          (record) =>
            /(?:^|;)\s*p\s*=/i.test(record) &&
            (!tags(record)["v"] ||
              tags(record)["v"]?.toUpperCase() === "DKIM1"),
        )
        .map((record) => ({
          selector,
          record,
          active: validDkimKey(record),
        })),
    );
    const activeKeys = keys.filter((key) => key.active);
    const duplicateSelector = signatures.some(
      ({ answer }) =>
        answer.records.filter((record) => /(?:^|;)\s*p\s*=/i.test(record))
          .length > 1,
    );
    const dkim: DomainReadiness["dkim"] = {
      state: duplicateSelector
        ? "invalid"
        : activeKeys.length
          ? "present"
          : keys.length
            ? "invalid"
            : "unknown",
      records: keys.map((key) => key.record),
      selectors,
    };
    return {
      domain,
      checkedAt: new Date().toISOString(),
      mx,
      spf,
      dkim,
      dmarc: {
        ...dmarc,
        recordDomain: inherited ? root : domain,
        inherited: inherited && dmarc.state !== "missing",
        policy: acceptedPolicy,
      },
      scope: "dns-records",
      inboxPlacement: "unknown",
    };
  });
