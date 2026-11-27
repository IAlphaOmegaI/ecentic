import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { type DefaultTreeAdapterTypes, parseFragment } from "parse5";

export const SHOPPING_ANSWER_CARDS_FORMAT = "scrapellm-product-cards-v1";
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
export type AnswerCardSource = { start: number; end: number; raw: string };
export type ShoppingAnswerCard = AnswerCardSource & {
  id: string;
  sectionId: string;
  rawHash: string;
  title: string;
  seller: string;
  price: string;
  originalPrice: string | null;
  rating: string | null;
  href: string;
  fields: {
    title: AnswerCardSource;
    seller: AnswerCardSource;
    price: AnswerCardSource;
    originalPrice: AnswerCardSource | null;
    rating: AnswerCardSource | null;
    href: AnswerCardSource;
  };
};
export type ShoppingAnswerCardSection = {
  id: string;
  heading: string | null;
  headingRaw: string | null;
  start: number;
  end: number;
  cards: ShoppingAnswerCard[];
};
export type ShoppingAnswerCards =
  | {
      status: "parsed";
      format: typeof SHOPPING_ANSWER_CARDS_FORMAT;
      answerHash: string;
      sections: ShoppingAnswerCardSection[];
    }
  | { status: "not-present" | "invalid"; reason: string };

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const fail = (reason: string): never => {
  throw new Error(reason);
};
const attribute = (node: Element, name: string) =>
  node.attrs.find((entry) => entry.name === name)?.value;
const element = (node: Node | undefined, tag: string): Element =>
  node && "tagName" in node && node.tagName === tag
    ? node
    : fail("A product card has an unexpected element structure.");
const children = (node: Element) =>
  node.childNodes.flatMap((child) => {
    if ("tagName" in child) return [child];
    if ("value" in child && !child.value.trim()) return [];
    return fail("A product card contains unexplained text or markup.");
  });
const plainText = (node: Element, maximum: number, empty = false) => {
  const value = node.childNodes
    .map((child) =>
      "value" in child
        ? child.value
        : fail("A product card label contains unexpected nested markup."),
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if ((!empty && !value) || value.length > maximum)
    fail("A product card label is empty or exceeds its supported length.");
  return value;
};
const attributes = (node: Element, names: string[]) => {
  if (
    node.attrs.length !== names.length ||
    node.attrs.some((entry) => !names.includes(entry.name))
  )
    fail("A product card contains unsupported or missing attributes.");
};
const style = (node: Element, expected: string) => {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "")
      .split(";")
      .filter(Boolean)
      .sort()
      .join(";");
  if (normalize(attribute(node, "style") ?? "") !== normalize(expected))
    fail("A product card's visibility or presentation is unsupported.");
};
const source = (
  answer: string,
  start: number,
  end: number,
): AnswerCardSource => ({
  start,
  end,
  raw: answer.slice(start, end),
});
const innerSource = (answer: string, node: Element) => {
  const location = node.sourceCodeLocation;
  if (!location?.startTag || !location.endTag)
    return fail("A product card is missing an explicit closing tag.");
  return source(
    answer,
    location.startTag.endOffset,
    location.endTag.startOffset,
  );
};
const httpsHref = (value: string) => {
  const parsed = resultify(() => new URL(value));
  if (
    !parsed.success ||
    parsed.data.protocol !== "https:" ||
    parsed.data.username ||
    parsed.data.password ||
    /\s/.test(value) ||
    value.length > 4096
  )
    fail("A product card has an unsupported link.");
  return value;
};

const parseCard = (answer: string, root: Element) => {
  attributes(root, ["html-index", "style"]);
  style(root, "display:flex;align-items:center;gap:12px;padding:10px");
  const location = root.sourceCodeLocation;
  if (!location?.startTag || !location.endTag)
    return fail("A product card is incomplete.");
  const nodes = children(root);
  if (nodes.length !== 3) return fail("A product card has an ambiguous body.");
  const image = element(nodes[0], "img");
  const body = element(nodes[1], "div");
  const hidden = element(nodes[2], "div");
  attributes(image, ["src", "alt", "width", "height", "style"]);
  style(image, "object-fit:cover;border-radius:0.5rem");
  if (
    attribute(image, "width") !== "120" ||
    attribute(image, "height") !== "auto"
  )
    fail("A product card has an unsupported image layout.");
  const imageUrl = attribute(image, "src") ?? "";
  if (
    !/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      imageUrl,
    )
  )
    httpsHref(imageUrl);
  attributes(body, ["style"]);
  style(body, "flex:1");
  attributes(hidden, ["style"]);
  style(hidden, "display:none");
  if (!/^[a-f0-9]{32}$/i.test(plainText(hidden, 32)))
    fail("A product card has an unrecognized hidden token.");
  const fields = children(body);
  if (fields.length !== 4)
    return fail("A product card has ambiguous title, price or seller fields.");
  const titleBlock = element(fields[0], "div");
  const priceBlock = element(fields[1], "div");
  const sellerBlock = element(fields[2], "div");
  const ratingBlock = element(fields[3], "div");
  attributes(titleBlock, ["style"]);
  style(titleBlock, "font-weight:bold");
  const anchors = children(titleBlock);
  if (anchors.length !== 1)
    return fail("A product card needs exactly one title link.");
  const anchor = element(anchors[0], "a");
  attributes(anchor, ["href"]);
  const title = plainText(anchor, 300);
  if ((attribute(image, "alt") ?? "").replace(/\s+/g, " ").trim() !== title)
    fail("The product image label and title identify different products.");
  const href = httpsHref(attribute(anchor, "href") ?? "");
  // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket access on this attribute record.
  const hrefLocation = anchor.sourceCodeLocation?.attrs?.["href"];
  if (!hrefLocation) return fail("The product link has no raw provenance.");
  attributes(sellerBlock, []);
  const seller = plainText(sellerBlock, 300);
  attributes(ratingBlock, []);
  const rating = plainText(ratingBlock, 100, true) || null;
  if (
    rating &&
    !/^(?:[0-4](?:\.\d+)?|5(?:\.0+)?) \(\d+(?:[.,]\d+)*[KM]?\)$/i.test(rating)
  )
    fail("A product card contains an unrecognized rating field.");
  attributes(priceBlock, ["style"]);
  style(priceBlock, "margin-top:4px;font-size:18px");
  const priceChildren = priceBlock.childNodes.filter(
    (node) => "tagName" in node,
  );
  if (priceChildren.length !== 1)
    return fail("A product card needs one explicit original-price field.");
  const original = element(priceChildren[0], "span");
  attributes(original, ["style"]);
  style(original, "text-decoration:line-through");
  const priceInner = innerSource(answer, priceBlock);
  const originalLocation = original.sourceCodeLocation;
  if (!originalLocation?.endTag)
    return fail("The original-price field is incomplete.");
  const priceSource = source(
    answer,
    priceInner.start,
    originalLocation.startOffset,
  );
  const afterPrice = answer.slice(originalLocation.endOffset, priceInner.end);
  if (
    afterPrice.trim() ||
    priceBlock.childNodes.some(
      (node) => !("value" in node) && node !== original,
    )
  )
    return fail("A product card has ambiguous price terms.");
  const currentText = priceBlock.childNodes
    .filter((node): node is DefaultTreeAdapterTypes.TextNode => "value" in node)
    .map((node) => node.value)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!currentText || currentText.length > 100)
    return fail("The product card price is missing or too long.");
  const originalPrice = plainText(original, 100, true) || null;
  const raw = source(answer, location.startOffset, location.endOffset);
  return {
    ...raw,
    rawHash: hash(raw.raw),
    title,
    seller,
    price: currentText,
    originalPrice,
    rating,
    href,
    fields: {
      title: innerSource(answer, anchor),
      seller: innerSource(answer, sellerBlock),
      price: priceSource,
      originalPrice: originalPrice ? innerSource(answer, original) : null,
      rating: rating ? innerSource(answer, ratingBlock) : null,
      href: source(answer, hrefLocation.startOffset, hrefLocation.endOffset),
    },
  };
};

/** Card order is serialization only. No returned field establishes a ranking. */
export const parseShoppingAnswerCards = (
  answer: string,
): ShoppingAnswerCards => {
  if (!/<[^>]+\bhtml-index\s*=/i.test(answer))
    return {
      status: "not-present",
      reason: "No provider product cards were found.",
    };
  if (answer.length > 2_000_000)
    return {
      status: "invalid",
      reason: "The card answer exceeds the supported size.",
    };
  const parsed = resultify(() => {
    if (/^[ \t]*(?:`{3,}|~{3,})/m.test(answer))
      fail(
        "Product-card markup inside a code block cannot establish recommendations.",
      );
    const errors: string[] = [];
    const document = parseFragment(answer, {
      sourceCodeLocationInfo: true,
      onParseError: (error) => errors.push(error.code),
    });
    if (errors.length) fail("The product-card HTML is malformed.");
    const roots = document.childNodes.flatMap((node) => {
      if ("value" in node) return [];
      const root = element(node, "div");
      if (!attribute(root, "html-index"))
        fail("Product cards must be separate top-level blocks.");
      return [root];
    });
    if (!roots.length || roots.length > 200)
      fail(
        "The product-card collection is empty or exceeds its supported size.",
      );
    const indexes = roots.map((node) => attribute(node, "html-index") ?? "");
    if (
      indexes.some((value) => !/^[1-9]\d{0,5}$/.test(value)) ||
      new Set(indexes).size !== indexes.length
    )
      fail("The product-card identifiers are missing or duplicated.");
    const cards = roots.map((root) => parseCard(answer, root));
    if (
      cards.some(
        (card) =>
          !/^ {0,3}$/.test(
            answer.slice(
              answer.lastIndexOf("\n", card.start - 1) + 1,
              card.start,
            ),
          ),
      )
    )
      fail("The product cards are quoted or embedded in another structure.");
    const headings = [...answer.matchAll(/^#{1,6}[ \t]+([^\n]+)$/gm)]
      .filter(
        (match) =>
          !cards.some(
            (card) => match.index >= card.start && match.index < card.end,
          ),
      )
      .map((match) => ({
        heading: match[1]?.trim() ?? "",
        headingRaw: match[0],
        start: match.index,
      }));
    const answerHash = hash(answer);
    const boundaries = [
      { heading: null, headingRaw: null, start: 0 },
      ...headings,
    ];
    const sections = boundaries.flatMap(
      (heading, index): ShoppingAnswerCardSection[] => {
        const end = boundaries[index + 1]?.start ?? answer.length;
        const members = cards.filter(
          (card) => card.start >= heading.start && card.start < end,
        );
        if (!members.length) return [];
        const id = `section_${hash(JSON.stringify([SHOPPING_ANSWER_CARDS_FORMAT, answerHash, heading.start, end, heading.headingRaw])).slice(0, 24)}`;
        return [
          {
            id,
            ...heading,
            end,
            cards: members.map((card) => ({
              ...card,
              id: `card_${hash(JSON.stringify([SHOPPING_ANSWER_CARDS_FORMAT, answerHash, card.start, card.end, card.rawHash])).slice(0, 24)}`,
              sectionId: id,
            })),
          },
        ];
      },
    );
    return {
      status: "parsed" as const,
      format: SHOPPING_ANSWER_CARDS_FORMAT,
      answerHash,
      sections,
    } satisfies ShoppingAnswerCards;
  });
  return parsed.success
    ? parsed.data
    : { status: "invalid", reason: parsed.error.message };
};
