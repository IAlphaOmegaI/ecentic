import { z } from "zod";
import * as AI from "../utils/ai";

const translationSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  introduction: z.string(),
  contentHtml: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  takeaways: z.array(z.string()),
});

export type Translation = z.infer<typeof translationSchema>;

export type TranslateArticleInput = {
  title: string;
  metaDescription: string;
  contentHtml: string;
  category?: string;
  tags?: readonly string[];
  introduction?: string;
  takeaways?: readonly string[];
};

/**
 * Translate an English blog article into Spanish with Azure (gpt seat).
 * Preserves HTML structure, URLs, and the product name `ecentic`.
 */
export const translateArticle = async (
  input: TranslateArticleInput,
): Promise<Translation> => {
  const tags = input.tags ?? [];
  const takeaways = input.takeaways ?? [];
  const category = input.category ?? "Guide";
  const introduction = input.introduction ?? input.metaDescription;

  return AI.generate({
    label: "Blog.translateArticle",
    model: "gpt",
    output: translationSchema,
    schemaName: "SpanishBlogTranslation",
    instructions: `You translate ecommerce blog content from English to Spanish (es-ES).

Rules:
- Translate visible text only; preserve every HTML tag, attribute, URL, and script/style block exactly.
- Keep the product name "ecentic" untranslated (lowercase as written).
- Keep brand names of AI products (ChatGPT, Claude, Gemini, Perplexity, Shopify, WooCommerce) untranslated.
- Write natural Spanish suitable for merchants; do not invent new sections.
- Return Spanish for title, metaDescription, introduction, contentHtml, category, tags, and takeaways.
- tags and takeaways must keep the same count as the input arrays.`,
    prompt: JSON.stringify({
      title: input.title,
      metaDescription: input.metaDescription,
      introduction,
      contentHtml: input.contentHtml,
      category,
      tags,
      takeaways,
    }),
  });
};

export const estimateReadTime = (html: string) => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
};
