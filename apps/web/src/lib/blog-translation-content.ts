import { createHash } from "node:crypto";
import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
import type { TranslationUnit } from "@/i18n/translation/runner";

export type BlogTranslationSource = {
  slug: string;
  source: string;
  externalId: string | null;
  title: string;
  description: string;
  introduction: string;
  category: string;
  tags: readonly string[];
  takeaways: readonly string[];
  faqs: readonly { question: string; answer: string }[];
  sections: readonly { number: string; title: string; content: string }[];
  contentHtml: string | null;
  publishedAt: string;
  thumbnailUrl: string | null;
};

type Slot = TranslationUnit & {
  start: number;
  end: number;
  encode: (value: string) => string;
};
const escapeText = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const meaningful = (value: string) => /\p{L}/u.test(value);

// Reviewed source headings use ordinary scale, not the ecentic Scale plan.
// Keep this exact allowlist scoped to source copy; all other plan mentions stay protected.
const translatableBlogTerms = (text: string) =>
  [
    "Can These Tools Scale as Your Business Grows?",
    "Running Audits at Scale: What Actually Works",
    "How to Scale Product Copy With AI Without Breaking Your Catalog",
  ].includes(text)
    ? { translatableTerms: ["Scale"] as const }
    : {};

/** Only replace source-located text/accessible attribute values. All other HTML bytes survive. */
export const createBlogHtmlTranslation = (html: string) => {
  const slots: Slot[] = [];
  const blocks = new Map<string, { tag: string; start: number; end: number }>();
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const visit = (
    node: DefaultTreeAdapterMap["node"],
    path: string,
    context: string,
    group = path,
    insideAnchor = false,
  ) => {
    const anchor = insideAnchor || ("tagName" in node && node.tagName === "a");
    if (
      "tagName" in node &&
      ["script", "style", "pre", "code", "svg", "math", "template"].includes(
        node.tagName,
      )
    )
      return;
    if (
      "tagName" in node &&
      node.attrs.some(
        (attribute) =>
          attribute.name === "translate" && attribute.value === "no",
      )
    )
      return;
    if (
      node.nodeName === "#text" &&
      "value" in node &&
      node.sourceCodeLocation &&
      meaningful(node.value)
    ) {
      const location = node.sourceCodeLocation;
      const raw = html.slice(location.startOffset, location.endOffset);
      const prefix = raw.match(/^\s*/)?.[0] ?? "";
      const suffix = raw.match(/\s*$/)?.[0] ?? "";
      slots.push({
        id: `html.${path}`,
        text: node.value.trim(),
        context,
        group,
        ...(!anchor && /^(a|an|the)$/i.test(node.value.trim())
          ? { grammaticalArticle: true as const }
          : {}),
        start: location.startOffset,
        end: location.endOffset,
        encode: (value) => prefix + escapeText(value) + suffix,
      });
    }
    if ("attrs" in node) {
      for (const attribute of node.attrs) {
        if (
          !["alt", "title", "aria-label", "placeholder"].includes(
            attribute.name,
          ) ||
          !meaningful(attribute.value)
        )
          continue;
        const location = node.sourceCodeLocation?.attrs?.[attribute.name];
        if (!location) continue;
        const raw = html.slice(location.startOffset, location.endOffset);
        const match = raw.match(/^(\S+\s*=\s*)(["']?)([\s\S]*?)\2$/);
        if (!match)
          throw new Error(
            `Unable to preserve HTML attribute ${attribute.name}`,
          );
        const prefix = match[1] ?? "";
        const quote = match[2] ?? "";
        slots.push({
          id: `html.${path}.attribute.${attribute.name}`,
          text: attribute.value,
          context: `${context}: accessible ${attribute.name}`,
          group,
          start: location.startOffset,
          end: location.endOffset,
          encode: (value) => {
            const escaped = escapeText(value)
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
            // An unquoted source value cannot safely hold translated spaces. Entity escaping preserves its syntax.
            return (
              prefix +
              quote +
              (quote
                ? escaped
                : escaped
                    .replace(/\s/g, "&#32;")
                    .replace(/=/g, "&#61;")
                    .replace(/`/g, "&#96;")) +
              quote
            );
          },
        });
      }
    }
    if ("childNodes" in node) {
      const block =
        "tagName" in node &&
        [
          "p",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "td",
          "th",
          "blockquote",
          "figcaption",
        ].includes(node.tagName);
      const surrounding = block ? `Article ${node.tagName} text` : context;
      if (block && node.sourceCodeLocation)
        blocks.set(path, {
          tag: node.tagName,
          start: node.sourceCodeLocation.startOffset,
          end: node.sourceCodeLocation.endOffset,
        });
      for (const [index, child] of node.childNodes.entries()) {
        visit(
          child,
          `${path}.${index}`,
          surrounding,
          block ? path : group,
          anchor,
        );
      }
    }
  };
  visit(fragment, "body", "Article body");
  const grammaticalArticles = new Set(
    slots
      .filter(
        (slot) =>
          slot.grammaticalArticle &&
          blocks.has(slot.group ?? "") &&
          slots.some(
            (following) =>
              following.group === slot.group &&
              following.start > slot.end &&
              !following.id.includes(".attribute.") &&
              !/^(a|an|the)$/i.test(following.text),
          ),
      )
      .map((slot) => slot.id),
  );
  // Exact source offsets avoid replacing an article such as "a" inside code,
  // entity text or an href. Prose is sent once as units; the template preserves
  // inline order, link/emphasis boundaries, punctuation and untranslatable code.
  const templates = new Map(
    [...blocks].map(([group, block]) => {
      const template = slots
        .filter((slot) => slot.start >= block.start && slot.end <= block.end)
        .sort((left, right) => right.start - left.start)
        .reduce(
          (output, slot) =>
            output.slice(0, slot.start - block.start) +
            slot.encode(`⟦${slot.id}⟧`) +
            output.slice(slot.end - block.start),
          html.slice(block.start, block.end),
        );
      return [
        group,
        `Article ${block.tag} text. Source layout: ${template}. Each ⟦id⟧ is the corresponding requested source text, not literal output. Read all slots in order as one connected passage; preserve code and link/emphasis boundaries.`,
      ] as const;
    }),
  );
  return {
    units: slots.map(
      ({
        start: _start,
        end: _end,
        encode: _encode,
        grammaticalArticle: _article,
        ...unit
      }) => ({
        ...unit,
        ...translatableBlogTerms(unit.text),
        format: "plain" as const,
        ...(grammaticalArticles.has(unit.id)
          ? { grammaticalArticle: true as const }
          : {}),
        context: templates.get(unit.group ?? "") ?? unit.context,
      }),
    ),
    apply: (values: ReadonlyMap<string, string>) =>
      [...slots]
        .sort((left, right) => right.start - left.start)
        .reduce((output, slot) => {
          const value = values.get(slot.id);
          if (
            value === undefined ||
            (!value.trim() && !grammaticalArticles.has(slot.id))
          )
            throw new Error(`Missing translated HTML unit ${slot.id}`);
          return (
            output.slice(0, slot.start) +
            slot.encode(value) +
            output.slice(slot.end)
          );
        }, html),
  };
};

export const blogSourceHash = (
  source: BlogTranslationSource,
  policyVersion: string,
) =>
  createHash("sha256")
    .update(JSON.stringify({ source, policyVersion }))
    .digest("hex");

export const createBlogTranslation = (source: BlogTranslationSource) => {
  const units: TranslationUnit[] = [];
  const add = (id: string, text: string, context: string) => {
    if (meaningful(text))
      units.push({
        id,
        text,
        context,
        ...translatableBlogTerms(text),
        group: /^(faqs|sections)\.\d+\./.test(id)
          ? id.split(".").slice(0, 2).join(".")
          : id,
        format: context.includes("Markdown") ? "markdown" : "plain",
      });
    return (values: ReadonlyMap<string, string>) => {
      if (!meaningful(text)) return text;
      const value = values.get(id);
      if (value === undefined || !value.trim())
        throw new Error(`Missing translated article unit ${id}`);
      return value;
    };
  };
  const title = add(
    "meta.title",
    source.title,
    "Article headline and SEO title; preserve the full meaning, write an idiomatic headline",
  );
  const description = add(
    "meta.description",
    source.description,
    "SEO description; preserve every source qualification",
  );
  const introduction = add(
    "meta.introduction",
    source.introduction,
    "Article introduction",
  );
  const category = add(
    "meta.category",
    source.category,
    "Editorial category label",
  );
  const tags = source.tags.map((text, index) =>
    add(`tags.${index}`, text, "Topic label"),
  );
  const takeaways = source.takeaways.map((text, index) =>
    add(
      `takeaways.${index}`,
      text,
      "Key takeaway; preserve details and qualification",
    ),
  );
  const faqs = source.faqs.map((entry, index) => ({
    question: add(`faqs.${index}.question`, entry.question, "FAQ question"),
    answer: add(
      `faqs.${index}.answer`,
      entry.answer,
      `Full FAQ answer to: ${entry.question}. Preserve existing Markdown syntax and all link destinations.`,
    ),
  }));
  const sections = source.sections.map((entry, index) => ({
    number: entry.number,
    title: add(
      `sections.${index}.title`,
      entry.title,
      "Article section heading",
    ),
    content: add(
      `sections.${index}.content`,
      entry.content,
      `Full article section: ${entry.title}. Preserve existing Markdown syntax, paragraph/list structure and all link destinations.`,
    ),
  }));
  const html = source.contentHtml
    ? createBlogHtmlTranslation(source.contentHtml)
    : null;
  units.push(...(html?.units ?? []));
  return {
    units,
    documentContext: `ecentic commerce article, English source, /blog/${source.slug}. Headline: ${source.title}. Description: ${source.description}. Category: ${source.category}. Write like an editor for online merchants and technical commerce teams; keep claims, obligations, product and provider distinctions unchanged. Section outline: ${JSON.stringify([...source.sections.map((section) => section.title), ...(html?.units.filter((unit) => /^Article h[1-6] text/.test(unit.context)).map((unit) => unit.text) ?? [])])}.`,
    apply: (values: ReadonlyMap<string, string>) => ({
      ...source,
      title: title(values),
      description: description(values),
      introduction: introduction(values),
      category: category(values),
      tags: tags.map((get) => get(values)),
      takeaways: takeaways.map((get) => get(values)),
      faqs: faqs.map((entry) => ({
        question: entry.question(values),
        answer: entry.answer(values),
      })),
      sections: sections.map((entry) => ({
        number: entry.number,
        title: entry.title(values),
        content: entry.content(values),
      })),
      contentHtml: html?.apply(values) ?? null,
    }),
  };
};

/** Nearby intact groups provide context without resending the whole article at every phase. */
export const blogBatchContext = (
  allUnits: readonly TranslationUnit[],
  batch: readonly TranslationUnit[],
  documentContext: string,
  knownTargets: Readonly<Record<string, string>> = {},
) => {
  const grouped = new Map<string, TranslationUnit[]>();
  for (const unit of allUnits) {
    const key = unit.group ?? unit.id;
    grouped.set(key, [...(grouped.get(key) ?? []), unit]);
  }
  const entries = [...grouped.entries()];
  const selected = new Set(batch.map((unit) => unit.group ?? unit.id));
  const requested = new Set(batch.map((unit) => unit.id));
  const first = entries.findIndex(([key]) => selected.has(key));
  const last = entries.reduce(
    (previous, [key], index) => (selected.has(key) ? index : previous),
    -1,
  );
  const neighbors = entries.filter(
    (_, index) =>
      index === first - 1 || index === last + 1 || index === last + 2,
  );
  const context = [
    ...entries.filter(([key]) => selected.has(key)),
    ...neighbors,
  ].map(([group, units]) => ({
    group,
    context: [
      ...new Set(units.map((unit) => unit.context.split(". Each ⟦id⟧")[0])),
    ],
    // The requested batch already has its source text; only neighbors need additional prose.
    contextOnlyUnits: units
      .filter((unit) => !requested.has(unit.id))
      .map((unit) => ({
        id: unit.id,
        text: unit.text,
        ...(knownTargets[unit.id] !== undefined
          ? { approvedTarget: knownTargets[unit.id] }
          : {}),
      })),
  }));
  return {
    documentContext: `${documentContext} Each ⟦id⟧ in a source layout denotes its corresponding source text, not literal output. Read connected slots in order as one passage; preserve code and link/emphasis boundaries. Requested units identify their group; context-only sibling targets are already approved and must stay unchanged. Connected source groups and up to three neighboring paragraphs (context only, do not add rows): ${JSON.stringify(context)}`,
    units: batch.map((unit) => ({
      ...unit,
      context: unit.context.split(". Source layout:")[0] ?? unit.context,
    })),
  };
};

/** One batch fits a model request; complete reviewed batches are committed independently. */
export const nextBlogTranslationBatch = (
  units: readonly TranslationUnit[],
  completed: Readonly<Record<string, string>>,
  characterLimit = 4500,
  blocked: Readonly<Record<string, unknown>> = {},
  unitLimit = 48,
) => {
  const pending = units.filter(
    (unit) =>
      completed[unit.id] === undefined && blocked[unit.id] === undefined,
  );
  const groups: TranslationUnit[][] = [];
  for (const unit of pending) {
    const previous = groups.at(-1);
    if (previous && unit.group && previous[0]?.group === unit.group)
      previous.push(unit);
    else groups.push([unit]);
  }
  const selection: TranslationUnit[] = [];
  groups.some((group) => {
    const characters = group.reduce((sum, unit) => sum + unit.text.length, 0);
    if (
      selection.length &&
      (selection.length + group.length > unitLimit ||
        selection.reduce((sum, unit) => sum + unit.text.length, 0) +
          characters >
          characterLimit)
    )
      return true;
    // A single oversized source paragraph remains intact, just like a long editorial unit.
    selection.push(...group);
    return false;
  });
  return selection;
};
