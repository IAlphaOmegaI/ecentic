import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/i18n/locales";

const fonts = new Map<string, Buffer>();

/** Browser font fallbacks do not exist in Satori; load only the script needed. */
export const cjkOgFont = (text: string, locale?: Locale) => {
  if (!/[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/u.test(text)) return [];
  const japanese = locale === "ja" || /[\u3040-\u30ff]/u.test(text);
  const key = japanese ? "JP" : "SC";
  const cached = fonts.get(key);
  const data =
    cached ??
    readFileSync(
      japanese
        ? join(process.cwd(), "assets/fonts/NotoSansJP-SemiBold.ttf")
        : join(process.cwd(), "assets/fonts/NotoSansSC-SemiBold.ttf"),
    );
  if (!cached) fonts.set(key, data);
  return [
    {
      name: "NotoSansCJK",
      data,
      weight: 600 as const,
      style: "normal" as const,
    },
  ];
};
