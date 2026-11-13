import * as Files from "node:fs/promises";
import * as Path from "node:path";
import { resultify } from "@zenncore/utils";
import { canonicalRoute, localeForRoute } from "./routes.mjs";

const chartRoutes = {
  C1: ["/", "/platform/simulate"],
  C2: ["/", "/solutions/enterprise", "/solutions/retailers-and-marketplaces"],
  C3: ["/", "/ai-channels", "/solutions/enterprise"],
  C5: ["/", "/stories/dua-flavours"],
  C6: ["/"],
};

// These placements ask for the same input; retain every original source below.
const aliases = {
  "enterpriseCompany.contact.sections.1.rows.0.value":
    "enterpriseCompany.about.sections.6.rows.0.value#0",
  "enterpriseCompany.contact.sections.1.rows.1.value":
    "enterpriseCompany.about.sections.6.rows.1.value#0",
  "enterpriseCompany.duaFlavours.sections.0.rows.3.value":
    "enterpriseEvidence.pending.duaChanges.question#0",
  "enterpriseCompany.duaFlavours.sections.1.paragraphs.0":
    "enterpriseEvidence.pending.duaStartingPoint.question#0",
  "enterpriseCompany.duaFlavours.sections.2.paragraphs.0":
    "enterpriseEvidence.pending.duaChanges.question#0",
  "enterpriseCompany.duaFlavours.sections.4.paragraphs.1":
    "enterpriseEvidence.pending.duaAprilStart.question#0",
};

const evidence = async (project) => {
  const file = "apps/web/src/content/marketing-evidence.ts";
  const source = await resultify(() =>
    Files.readFile(Path.join(project, file), "utf8"),
  );
  if (!source.success) {
    if (source.error.code === "ENOENT") return new Map();
    throw source.error;
  }
  const literal = source.data.match(
    /export\s+const\s+evidencePending\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
  );
  if (!literal)
    throw new Error(
      `Cannot read the static evidencePending registry in ${file}`,
    );
  const records = [...literal[1].matchAll(/\{([^}]+)\}/g)].map(([, object]) => {
    const fields = Object.fromEntries(
      [...object.matchAll(/\b(id|owner|chart)\s*:\s*"([^"]+)"/g)].map(
        ([, key, value]) => [key, value],
      ),
    );
    if (
      !fields.id ||
      !["Alvi", "Xhurian"].includes(fields.owner) ||
      !chartRoutes[fields.chart]
    )
      throw new Error(`Invalid pending evidence entry: ${object}`);
    return [
      `enterpriseEvidence.pending.${fields.id}.question`,
      { ...fields, file, routes: chartRoutes[fields.chart] },
    ];
  });
  return new Map(records);
};

const company = {
  about: "/about",
  security: "/security",
  partners: "/partners",
  stories: "/stories",
  duaFlavours: "/stories/dua-flavours",
  tools: "/tools",
  resources: "/resources",
  support: "/support",
  contact: "/contact",
  changelog: "/changelog",
  researchDraft: "/research/ai-shopping-simulations",
};

const routes = (key, registry) => {
  if (registry.has(key)) return registry.get(key).routes;
  const [namespace, group, name] = key.split(".");
  switch (namespace) {
    case "enterpriseHome":
      return ["/"];
    case "enterpriseChrome":
    case "enterpriseNav":
      return ["*"];
    case "enterpriseCompany":
      return company[group] ? [company[group]] : [];
    case "enterprisePlatform":
      return [group === "pages" ? `/platform/${name}` : "/platform"];
    case "enterpriseSolutions":
      switch (group) {
        case "business":
          return [`/solutions/${name}`];
        case "sectors":
          return [`/solutions/sectors/${name}`];
        case "sectorIndex":
          return ["/solutions/sectors"];
        default:
          return ["/solutions"];
      }
    case "enterpriseChannels":
      return [group === "pages" ? `/ai-channels/${name}` : "/ai-channels"];
    case "enterpriseIntegrations":
      return [group === "pages" ? `/integrations/${name}` : "/integrations"];
    case "enterprisePricing":
      return ["/pricing"];
    case "enterpriseDemo":
      return ["/demo"];
    case "enterpriseLead":
      return ["/demo", "/integrations", "/partners"];
    case "enterpriseRecovery":
      switch (group) {
        case "api":
          return ["/docs/api"];
        case "instructions":
          return ["/ai-instructions"];
        case "notFound":
          return ["/review-pack-not-found"];
        default:
          return ["*"];
      }
    default:
      return [];
  }
};

const leaves = (value, prefix = "") => {
  if (typeof value === "string") return [{ key: prefix, text: value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
};

const owner = ({ key, text }, registry) => {
  if (registry.has(key))
    return {
      name: registry.get(key).owner,
      basis: "Explicit owner in marketing-evidence.ts",
    };
  if (/\bXhurian\b/i.test(text))
    return { name: "Xhurian", basis: "Named in the source question" };
  if (
    /\bAlvi\b/i.test(text) ||
    key.startsWith("enterpriseCompany.researchDraft")
  )
    return {
      name: "Alvi",
      basis: "Named source or research-method owner in the brief",
    };
  if (
    /encryption|hosting region|database operator|backup|retention|mfa|model (?:version|settings)|simulation (?:data|method)|rubric/i.test(
      text,
    )
  )
    return {
      name: "Alvi",
      basis: "Suggested technical owner; confirm assignment",
    };
  return {
    name: "Xhurian",
    basis:
      "Review routing: confirm the answer or assign its owner; the source does not name one",
  };
};

export const collect = async (project) => {
  const pending = await evidence(project);
  const directory = Path.join(project, "apps/web/messages/fragments");
  const names = (await Files.readdir(directory))
    .filter((name) => /^enterprise.+\.(en|es)\.json$/.test(name))
    .sort();
  const catalogs = await Promise.all(
    names.map(async (name) => ({
      file: `apps/web/messages/fragments/${name}`,
      locale: name.endsWith(".es.json") ? "es" : "en",
      leaves: leaves(
        JSON.parse(await Files.readFile(Path.join(directory, name), "utf8")),
      ),
    })),
  );
  const english = new Map(
    catalogs
      .filter((catalog) => catalog.locale === "en")
      .flatMap((catalog) =>
        catalog.leaves.map((leaf) => [leaf.key, leaf.text]),
      ),
  );
  const records = catalogs.flatMap((catalog) =>
    catalog.leaves.flatMap((leaf) =>
      [...leaf.text.matchAll(/\{\{TODO\b[\s\S]*?\}\}/g)].map(
        ([text], index) => ({
          id:
            index === 0 && aliases[leaf.key]
              ? aliases[leaf.key]
              : `${leaf.key}#${index}`,
          key: leaf.key,
          file: catalog.file,
          locale: catalog.locale,
          text,
          context: leaf.text,
          routes: routes(leaf.key, pending),
          ...(pending.has(leaf.key) ? { evidence: pending.get(leaf.key) } : {}),
          owner: owner(
            {
              key: leaf.key,
              text: english.get(leaf.key) ?? leaf.text,
            },
            pending,
          ),
        }),
      ),
    ),
  );
  for (const key of pending.keys())
    for (const locale of ["en", "es"])
      if (
        !records.some(
          (record) => record.key === key && record.locale === locale,
        )
      )
        throw new Error(
          `Pending evidence question is missing from raw ${locale} fragments: ${key}`,
        );
  const merged = [
    ...new Set(records.map((record) => `${record.locale}:${record.id}`)),
  ].map((identity) => {
    const members = records.filter(
      (record) => `${record.locale}:${record.id}` === identity,
    );
    const primary = members.find((record) => record.evidence) ?? members[0];
    return {
      ...primary,
      routes: [...new Set(members.flatMap((record) => record.routes))],
      sources: members.map(({ file, key, text, context, evidence }) => ({
        file,
        key,
        text,
        context,
        ...(evidence ? { evidence } : {}),
      })),
    };
  });
  return {
    records: merged,
    unmapped: merged.filter((record) => !record.routes.length),
  };
};

export const forPage = (registry, route) => {
  // Source review questions are authored in EN/ES; every translated placement
  // points back to that same authoritative input rather than creating another TODO.
  const locale = localeForRoute(route) === "es" ? "es" : "en";
  const canonical = canonicalRoute(route);
  return registry.records.filter(
    (record) =>
      record.locale === locale &&
      (record.routes.includes("*") || record.routes.includes(canonical)),
  );
};
