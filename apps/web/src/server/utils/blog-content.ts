import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Element, Root as HastRoot } from "hast";
import { toHtml } from "hast-util-to-html";
import type { Root as MdastRoot, Nodes, RootContent } from "mdast";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { parseDocument } from "yaml";
import { z } from "zod";
import { isFaqHeading } from "@/lib/blog-html";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";

/**
 * Blog posts kept as markdown files in the repo (`apps/web/content/blog`).
 *
 * Pure on purpose: no Next, AI or database imports, so the `blog:check` script
 * and the specs can load it under plain Bun — `server/app/blog.ts` cannot be
 * (it pulls `@ai-sdk/rsc` and Sentry, which only resolve inside Next). The
 * blog server module owns the writes; this one only reads, renders and judges.
 */

/** Relative to the app root; `next.config.ts` traces it into the blog cron. */
export const CONTENT_DIRECTORY = "content/blog";

/** The byline every post renders under (`blog/[slug]/page.tsx`). */
export const DEFAULT_AUTHOR = "Xhurian Shaba";

/**
 * Part of every content hash. Bump it when a change to `render` should reach
 * posts that are already live: each one re-ingests (and re-translates) once.
 */
const RENDER_VERSION = "1";

/**
 * House-voice rules from `docs/context/seo/blog-voice.md` that a machine can
 * check. One constant so the lists stay easy to edit; `fix` is what the
 * checker prints next to a hit.
 */
export const VOICE_RULES = {
  phrases: [
    { phrase: "delve", fix: "say what you looked at" },
    { phrase: "leverage", fix: "use" },
    { phrase: "utilize", fix: "use" },
    { phrase: "unlock", fix: "say what the reader gets" },
    { phrase: "empower", fix: "let, or help" },
    { phrase: "seamless", fix: "say what actually happens" },
    { phrase: "robust", fix: "say what makes it hold up" },
    { phrase: "cutting-edge", fix: "new, or name the feature" },
    { phrase: "game-changing", fix: "say what changed" },
    { phrase: "game changer", fix: "say what changed" },
    { phrase: "supercharge", fix: "speed up, or improve" },
    { phrase: "elevate", fix: "improve, or raise" },
    { phrase: "harness", fix: "use" },
    { phrase: "ever-evolving", fix: "changing" },
    { phrase: "in today's fast-paced", fix: "cut it and start with the fact" },
    { phrase: "it's worth noting", fix: "cut it and state the fact" },
    { phrase: "let's dive in", fix: "cut it" },
    { phrase: "in conclusion", fix: "cut it and end on the next step" },
    {
      phrase: "paying customers",
      fix: "we're pre-revenue and running pilots; say pilots",
    },
  ],
  headings: ["conclusion", "final thoughts"],
  /** Stores we audited or pilot with. Never public, whatever the context. */
  names: [
    "Flaviar",
    "Upflex",
    "Biano",
    "Ghirardelli",
    "Red Bull Shop",
    "Cotopaxi",
    "True Organic",
    "Rock Face",
  ],
} as const;

export type Issue = {
  line: number;
  rule: string;
  message: string;
  fix?: string;
};

export type File = {
  /** `content/blog/<slug>.md` — also what `externalId` points at. */
  path: string;
  raw: string;
};

export type Faq = { question: string; answer: string };

export type Post = {
  path: string;
  slug: string;
  /** `<path>#<sha256>` — stored on both locale rows to detect edits. */
  externalId: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  tags: readonly string[];
  thumbnailUrl: string | null;
  draft: boolean;
  contentHtml: string;
  faqs: readonly Faq[];
};

export type Report = {
  path: string;
  slug: string;
  /** `null` whenever `errors` is not empty. */
  post: Post | null;
  errors: Issue[];
  warnings: Issue[];
  /** Root-relative image paths (hero and body), for the caller to look up. */
  images: string[];
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Canonical frontmatter keys and the other spellings accepted for each. The
 * aliases are the ones this repo already reads off BabyLoveGrowth payloads
 * (`publishPayloadSchema` in `server/app/blog.ts`), so an outside writer that
 * mimics that CMS shape still parses. A canonical key wins over its alias.
 */
const FIELDS = {
  title: [],
  description: ["meta_description", "metaDescription"],
  date: ["publishedAt", "published_at", "createdAt", "created_at"],
  keyword: ["seedKeyword", "target_keyword", "targetKeyword"],
  tags: ["keywords"],
  image: [
    "hero_image_url",
    "heroImageUrl",
    "hero_image",
    "heroImage",
    "og_image",
    "ogImage",
  ],
  author: [],
  draft: [],
  slug: [],
} as const satisfies Record<string, readonly string[]>;

type Field = keyof typeof FIELDS;

const isDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(value) &&
  !Number.isNaN(Date.parse(value.slice(0, 10)));

/**
 * The hero ends up in an unquoted CSS `url()` on the blog index and in
 * JSON-LD, so anything that could break out of either is refused here.
 */
const isImage = (value: string) => {
  if (/[\s"'()<>\\]/.test(value)) return false;
  if (value.startsWith("https://")) return URL.canParse(value);
  return (
    /^\/[^/]/.test(value) &&
    !value.split("/").includes("..") &&
    /\.(png|jpe?g|webp|avif|gif)$/i.test(value)
  );
};

const frontmatterSchema = z.object({
  title: z
    .string({ error: "title is required" })
    .trim()
    .min(1, "title is required"),
  description: z
    .string({ error: "description is required" })
    .trim()
    .min(1, "description is required")
    .max(159, "description must be under 160 characters"),
  date: z
    .string({ error: "date is required, as YYYY-MM-DD" })
    .trim()
    .refine(isDay, "date must be YYYY-MM-DD")
    .transform((value) => value.slice(0, 10)),
  keyword: z.string({ error: "keyword must be text" }).trim().min(1).optional(),
  tags: z
    .preprocess(
      (value) => (typeof value === "string" ? value.split(",") : value),
      z.array(z.string().trim().min(1), {
        error: "tags must be a list of text",
      }),
    )
    .optional(),
  image: z
    .string({ error: "image must be text" })
    .trim()
    .refine(
      isImage,
      "image must be an https:// URL or a path to an image under public/, like /blog/<slug>.png",
    )
    .optional(),
  author: z.string({ error: "author must be text" }).trim().min(1).optional(),
  draft: z.boolean({ error: "draft must be true or false" }).optional(),
  slug: z.string({ error: "slug must be text" }).trim().optional(),
});

const FRONTMATTER =
  /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

const countLines = (text: string) => text.split("\n").length - 1;

const lineOfKey = (frontmatter: string, key: string) => {
  const index = frontmatter
    .split(/\r?\n/)
    .findIndex((line) => line.startsWith(`${key}:`));
  // Line 1 is the opening `---`.
  return index === -1 ? 1 : index + 2;
};

/** Maps every accepted spelling onto its canonical key, remembering which. */
const normalizeFields = (data: Record<string, unknown>) => {
  const origin = new Map<Field, string>();
  const values: Record<string, unknown> = {};

  for (const [field, aliases] of Object.entries(FIELDS) as [
    Field,
    readonly string[],
  ][]) {
    const key = [field, ...aliases].find((name) => data[name] !== undefined);
    if (!key) continue;
    origin.set(field, key);
    values[field] = data[key];
  }

  const known = new Set(Object.entries(FIELDS).flat(2));
  const unknown = Object.keys(data).filter((key) => !known.has(key));

  return { values, origin, unknown };
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Raw HTML in the markdown is dropped here (no `allowDangerousHtml`), and
  // `parse` reports it as an error so nothing vanishes silently.
  .use(remarkRehype)
  // GitHub's own allowlist: no script, style or iframe, no event handlers, no
  // `javascript:` URLs. Its `user-content-` id prefix is turned off because
  // `remark-rehype` already applies it to the only ids a post can have (raw
  // HTML never gets this far), and a second pass broke every footnote link.
  .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: "" });

const isExternal = (href: string) =>
  /^https?:\/\//i.test(href) &&
  URL.canParse(href) &&
  !/(^|\.)ecentic\.ai$/i.test(new URL(href).hostname);

/**
 * Runs after the sanitizer, so the attributes it adds are ours rather than the
 * author's. `splitBlogHtmlByH2` still qualifies every outbound link with
 * `nofollow` at render time, as it does for BabyLoveGrowth bodies.
 */
const markExternalLinks = (node: HastRoot | Element) => {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const href = child.properties.href;
    if (child.tagName === "a" && typeof href === "string" && isExternal(href))
      child.properties = {
        ...child.properties,
        target: "_blank",
        rel: ["noopener"],
      };
    markExternalLinks(child);
  }
};

/** Markdown to the HTML shape BabyLoveGrowth stores in `contentHtml`. */
const render = (tree: MdastRoot) => {
  // `remark-rehype` turns the tree into hast, but unified's chain typing does
  // not carry that through `rehype-sanitize`.
  const html = processor.runSync(structuredClone(tree)) as unknown as HastRoot;
  markExternalLinks(html);
  // Named references (`&amp;`, not `&#x26;`) because `splitBlogHtmlByH2`
  // decodes those when it lifts an H2 into the left rail.
  return toHtml(html, { characterReferences: { useNamedReferences: true } });
};

const text = (node: Nodes): string => {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "image") return node.alt ?? "";
  if (node.type === "break") return " ";
  if (!("children" in node)) return "";
  const separator =
    node.type === "listItem" || node.type === "blockquote" ? " " : "";
  return (node.children as Nodes[]).map(text).join(separator);
};

const blockText = (node: RootContent) =>
  node.type === "list"
    ? node.children.map((item) => `- ${text(item).trim()}`).join("\n")
    : text(node).trim();

/**
 * The `## FAQ` block as data: each `###` is a question, the blocks under it
 * until the next `###` or `##` its answer, as plain text — these feed
 * `FAQPage` JSON-LD and the Spanish translation, not the page body (the block
 * stays in `contentHtml` too, which is what `hasFaqSection` keys off).
 */
const extractFaqs = (tree: MdastRoot) => {
  const start = tree.children.findIndex(
    (node) =>
      node.type === "heading" && node.depth === 2 && isFaqHeading(text(node)),
  );
  if (start === -1) return { found: false, faqs: [] as Faq[] };

  const end = tree.children.findIndex(
    (node, index) =>
      index > start && node.type === "heading" && node.depth <= 2,
  );
  const block = tree.children.slice(start + 1, end === -1 ? undefined : end);

  const faqs = block
    .reduce<{ question: string; answer: RootContent[] }[]>((pairs, node) => {
      if (node.type === "heading" && node.depth === 3)
        pairs.push({ question: text(node), answer: [] });
      else pairs.at(-1)?.answer.push(node);
      return pairs;
    }, [])
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.map(blockText).filter(Boolean).join("\n\n"),
    }))
    .filter((faq) => faq.question && faq.answer);

  return { found: true, faqs };
};

const walk = (node: Nodes, visit: (node: Nodes) => void) => {
  visit(node);
  if ("children" in node)
    for (const child of node.children as Nodes[]) walk(child, visit);
};

const isComment = (html: string) => /^\s*<!--[\s\S]*-->\s*$/.test(html);

/** Problems that would make the rendered post differ from what was written. */
const checkStructure = (tree: MdastRoot, offset: number) => {
  const issues: Issue[] = [];
  const images: string[] = [];
  const lineOf = (node: Nodes) => (node.position?.start.line ?? 1) + offset;

  walk(tree, (node) => {
    if (node.type === "html" && !isComment(node.value))
      issues.push({
        line: lineOf(node),
        rule: "raw-html",
        message: `raw HTML is not published and would be dropped: ${node.value.trim().slice(0, 60)}`,
        fix: "write it in markdown",
      });
    if (node.type === "image" && node.url.startsWith("/"))
      images.push(node.url);
    // The sanitizer strips any other scheme, which leaves a dead link behind.
    if (node.type === "link" && !/^(https?:\/\/|mailto:|\/|#)/i.test(node.url))
      issues.push({
        line: lineOf(node),
        rule: "link",
        message: `link to "${node.url}" would be removed`,
        fix: "link to https://..., mailto:..., a /path on ecentic.ai or a #anchor",
      });
  });

  const content = tree.children.filter(
    (node) => node.type !== "html" || !isComment(node.value),
  );
  if (content.length === 0)
    issues.push({
      line: offset + 1,
      rule: "body",
      message: "the post is empty",
    });

  for (const node of content.slice(1))
    if (node.type === "heading" && node.depth === 1)
      issues.push({
        line: lineOf(node),
        rule: "heading",
        message: "only the title may be a # heading",
        fix: "use ## for sections",
      });

  const { found, faqs } = extractFaqs(tree);
  if (found && faqs.length === 0)
    issues.push({
      line: offset + 1,
      rule: "faq",
      message: "the FAQ section has no questions",
      fix: "put each question in a ### heading with its answer under it",
    });

  return { issues, images, faqs };
};

const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wordPattern = (phrase: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapePattern(phrase)
      .replace(/'/g, "['’]")
      .replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}_])`,
    "giu",
  );

/** Same length and line breaks, so offsets still map to the same lines. */
const blank = (value: string) => value.replace(/[^\n]/g, " ");

/** Lines where `--` is markdown syntax rather than prose. */
const isStructuralDashes = (line: string) =>
  /^\s*(?:---|\.\.\.)\s*$/.test(line) ||
  /^\s{0,3}(?:-\s*){2,}$/.test(line) ||
  /^\s{0,3}(?:\*\s*){3,}$/.test(line) ||
  /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(line);

/**
 * The voice rules over the whole file, frontmatter included, with the line of
 * every hit. Code (fenced or inline) is skipped for the wording rules — a
 * `--flag` in a command is not a double hyphen — but never for store names.
 */
export const checkVoice = (raw: string) => {
  const starts = [...raw.matchAll(/\n/g)].map((match) => match.index + 1);
  const lineAt = (offset: number) =>
    starts.filter((start) => start <= offset).length + 1;

  const prose = raw
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/^(\s*)(`{3,}|~{3,})[\s\S]*?^\1\2/gm, blank)
    .replace(/`[^`\n]+`/g, blank)
    .replace(/https?:\/\/[^\s)>\]]+/g, blank);

  const issues: Issue[] = [];

  for (const match of prose.matchAll(/—/g))
    issues.push({
      line: lineAt(match.index),
      rule: "em-dash",
      message: "em dash",
      fix: "use a comma or a period",
    });

  prose.split("\n").forEach((line, index) => {
    if (isStructuralDashes(line) || !line.includes("--")) return;
    issues.push({
      line: index + 1,
      rule: "double-hyphen",
      message: "double hyphen",
      fix: "use a comma or a period",
    });
  });

  for (const { phrase, fix } of VOICE_RULES.phrases)
    for (const match of prose.matchAll(wordPattern(phrase)))
      issues.push({
        line: lineAt(match.index),
        rule: "wording",
        message: `"${match[0].replace(/\s+/g, " ")}"`,
        fix,
      });

  prose.split("\n").forEach((line, index) => {
    const heading = line.match(/^\s{0,3}##\s+(.+?)\s*#*\s*$/)?.[1];
    const name = heading?.toLowerCase().replace(/[:.!?]+$/, "");
    if (!name || !(VOICE_RULES.headings as readonly string[]).includes(name))
      return;
    issues.push({
      line: index + 1,
      rule: "heading",
      message: `"${heading}" heading`,
      fix: "end on the next step instead of a recap",
    });
  });

  for (const name of VOICE_RULES.names)
    for (const match of raw.matchAll(wordPattern(name)))
      issues.push({
        line: lineAt(match.index),
        rule: "private-name",
        message: `${match[0]} is an audit or pilot store and never appears in public`,
        fix: "describe it without the name",
      });

  return issues.sort((first, second) => first.line - second.line);
};

const hash = (raw: string) =>
  createHash("sha256").update(`${RENDER_VERSION}\n`).update(raw).digest("hex");

const slugOf = (path: string) =>
  path.split("/").at(-1)?.replace(/\.md$/, "") ?? path;

/** Everything one file needs to be published, or why it cannot be. */
export const parse = ({ path, raw }: File): Report => {
  const slug = slugOf(path);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const images: string[] = [];
  const report = () => ({ path, slug, post: null, errors, warnings, images });

  errors.push(...checkVoice(raw));

  if (!SLUG_PATTERN.test(slug))
    errors.push({
      line: 1,
      rule: "slug",
      message: `"${slug}" is not a valid slug`,
      fix: "name the file with lowercase letters, digits and single hyphens",
    });

  const retired = RETIRED_BLOG_POSTS.get(slug);
  if (retired)
    errors.push({
      line: 1,
      rule: "slug",
      message: `/blog/${slug} is retired and redirects to /blog/${retired}`,
      fix: "pick another slug, or edit the post that replaced it",
    });

  const match = raw.match(FRONTMATTER);
  if (!match) {
    errors.push({
      line: 1,
      rule: "frontmatter",
      message: "the file must open with a --- frontmatter block",
      fix: "see content/blog/README.md",
    });
    return report();
  }

  const frontmatter = match[1] ?? "";
  const document = parseDocument(frontmatter);
  for (const error of document.errors)
    errors.push({
      line: (error.linePos?.[0].line ?? 0) + 1,
      rule: "frontmatter",
      message: error.message.split("\n")[0] ?? "invalid YAML",
    });

  const data: unknown = document.errors.length > 0 ? null : document.toJS();
  if (document.errors.length === 0 && (!data || typeof data !== "object"))
    errors.push({
      line: 1,
      rule: "frontmatter",
      message: "frontmatter must be key: value pairs",
    });
  if (!data || typeof data !== "object") return report();

  const { values, origin, unknown } = normalizeFields(
    data as Record<string, unknown>,
  );
  const lineOf = (field: Field) =>
    lineOfKey(frontmatter, origin.get(field) ?? field);

  for (const key of unknown)
    warnings.push({
      line: lineOfKey(frontmatter, key),
      rule: "frontmatter",
      message: `"${key}" is not a known field and is ignored`,
    });

  const fields = frontmatterSchema.safeParse(values);
  if (!fields.success)
    for (const issue of fields.error.issues)
      errors.push({
        line: lineOf((issue.path[0] as Field | undefined) ?? "title"),
        rule: "frontmatter",
        message: issue.message,
      });

  if (fields.success && fields.data.slug && fields.data.slug !== slug)
    errors.push({
      line: lineOf("slug"),
      rule: "slug",
      message: `slug "${fields.data.slug}" does not match the file name "${slug}.md"`,
      fix: "rename the file, or drop the slug field",
    });

  if (
    fields.success &&
    fields.data.author &&
    fields.data.author !== DEFAULT_AUTHOR
  )
    warnings.push({
      line: lineOf("author"),
      rule: "author",
      message: `every post is bylined ${DEFAULT_AUTHOR}; "${fields.data.author}" is not shown`,
    });

  const image = fields.success ? fields.data.image : undefined;
  if (image?.startsWith("/")) images.push(image);

  const offset = countLines(match[0]);
  const body = raw.slice(match[0].length);
  const tree = processor.parse(body);
  const structure = checkStructure(tree, offset);
  errors.push(...structure.issues);
  images.push(...structure.images);

  if (!fields.success || errors.length > 0) return report();

  const contentHtml = render(tree);
  const digest = hash(raw);

  return {
    ...report(),
    post: {
      path,
      slug,
      externalId: `${path}#${digest}`,
      title: fields.data.title,
      description: fields.data.description,
      publishedAt: fields.data.date,
      category: fields.data.keyword ?? "Guide",
      tags:
        fields.data.tags ?? (fields.data.keyword ? [fields.data.keyword] : []),
      thumbnailUrl: image ?? null,
      draft: fields.data.draft ?? false,
      contentHtml,
      faqs: structure.faqs,
    },
  };
};

/** `parse` over the whole folder, plus the one check that spans files. */
export const validate = (files: readonly File[]) => {
  const reports = files.map(parse);
  const counts = reports.reduce(
    (slugs, report) =>
      slugs.set(report.slug, (slugs.get(report.slug) ?? 0) + 1),
    new Map<string, number>(),
  );

  return reports.map((report) =>
    (counts.get(report.slug) ?? 0) > 1
      ? {
          ...report,
          post: null,
          errors: [
            ...report.errors,
            {
              line: 1,
              rule: "slug",
              message: `another file also publishes /blog/${report.slug}`,
            },
          ],
        }
      : report,
  );
};

/** Every post file in `directory`, README excluded, in a stable order. */
export const read = async (directory: string) => {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort();

  return await Promise.all(
    names.map(async (name) => ({
      path: `${CONTENT_DIRECTORY}/${name}`,
      raw: await readFile(join(directory, name), "utf8"),
    })),
  );
};

export type StoredRow = {
  slug: string;
  locale: string;
  source: string;
  externalId: string | null;
};

/**
 * A slug with any repo row belongs to the repo: BabyLoveGrowth writes skip it,
 * whichever locale they would touch.
 */
export const isRepoOwned = (rows: readonly StoredRow[]) =>
  rows.some((row) => row.source === "repo");

/**
 * How urgently a post needs ingesting, or `null` when both locale rows already
 * hold this exact file. Lower goes first: a post with no rows is a 404, one
 * missing a locale still renders (Spanish falls back to English), and a stale
 * or not-yet-claimed post is live in its previous form.
 */
const urgency = (post: Post, rows: readonly StoredRow[]) => {
  const english = rows.find((row) => row.locale === "en");
  const spanish = rows.find((row) => row.locale === "es");
  const current = (row: StoredRow) =>
    row.source === "repo" && row.externalId === post.externalId;

  switch (true) {
    case !english && !spanish:
      return 0;
    case !english || !spanish:
      return 1;
    case !(english && current(english) && spanish && current(spanish)):
      return 2;
    default:
      return null;
  }
};

/**
 * What a reconcile tick should do. `slugs` names every post file, valid or
 * not, so an invalid file never reports its live rows as orphaned.
 */
export const plan = ({
  posts,
  slugs,
  rows,
}: {
  posts: readonly Post[];
  slugs: ReadonlySet<string>;
  rows: readonly StoredRow[];
}) => {
  const bySlug = rows.reduce((groups, row) => {
    groups.set(row.slug, [...(groups.get(row.slug) ?? []), row]);
    return groups;
  }, new Map<string, StoredRow[]>());

  const pending = posts
    .filter((post) => !post.draft)
    .map((post) => ({
      post,
      urgency: urgency(post, bySlug.get(post.slug) ?? []),
    }))
    .filter(
      (entry): entry is { post: Post; urgency: number } =>
        entry.urgency !== null,
    )
    .sort(
      (first, second) =>
        first.urgency - second.urgency ||
        second.post.publishedAt.localeCompare(first.post.publishedAt) ||
        first.post.slug.localeCompare(second.post.slug),
    )
    .map((entry) => entry.post);

  const orphaned = [...bySlug]
    .filter(([slug, group]) => isRepoOwned(group) && !slugs.has(slug))
    .map(([slug]) => slug)
    .sort();

  return { pending, orphaned };
};
