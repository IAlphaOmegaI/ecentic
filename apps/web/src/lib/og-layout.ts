import type { Locale } from "@/i18n/locales";

const glyphWidth = (glyph: string) => {
  if (/\s/u.test(glyph)) return 0.28;
  if (
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}\u3000-\u30ff\uff00-\uffef]/u.test(
      glyph,
    )
  )
    return 1;
  if (/[ilIjtfr.,:;'’!|]/u.test(glyph)) return 0.31;
  if (/[MWmw@%]/u.test(glyph)) return 0.87;
  if (/[A-Z0-9]/u.test(glyph)) return 0.66;
  return 0.56;
};

/** Conservative glyph advances keep both alphabetic and CJK titles inside the image rails. */
const wrap = (
  text: string,
  width: number,
  fontSize: number,
  locale?: Locale,
) => {
  const words = Array.from(
    new Intl.Segmenter(locale, { granularity: "word" }).segment(text),
    ({ segment }) => segment,
  );
  const state = { line: "", width: 0, lines: [] as string[] };
  const append = (segment: string) => {
    const advance = Array.from(segment).reduce(
      (total, glyph) => total + glyphWidth(glyph) * fontSize,
      0,
    );
    const closingPunctuation = /^[、。，．！？.,!?;:）)\]」』】]+$/u.test(
      segment,
    );
    if (state.line && state.width + advance > width && !closingPunctuation) {
      state.lines.push(state.line.trim());
      state.line = "";
      state.width = 0;
    }
    if (state.line || segment.trim()) {
      state.line += segment;
      state.width += advance;
    }
  };
  for (const word of words) {
    const advance = Array.from(word).reduce(
      (total, glyph) => total + glyphWidth(glyph) * fontSize,
      0,
    );
    if (advance <= width) {
      append(word);
      continue;
    }
    for (const { segment } of new Intl.Segmenter(locale, {
      granularity: "grapheme",
    }).segment(word))
      append(segment);
  }
  if (state.line.length) state.lines.push(state.line.trim());
  return state.lines;
};

const limitLines = (lines: string[], limit: number) => {
  if (lines.length <= limit) return lines;
  const last = lines[limit - 1] ?? "";
  const glyphs = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(last),
    ({ segment }) => segment,
  );
  return [
    ...lines.slice(0, limit - 1),
    `${glyphs.slice(0, -1).join("").trimEnd()}…`,
  ];
};

export const ogTextLayout = (
  title: string,
  description: string,
  locale?: Locale,
) => {
  const cleanTitle =
    title
      .replace(/\s*[|–—]\s*[eé]centic(?:\.ai)?\s*$/iu, "")
      .replace(/\s+/gu, " ")
      .trim() || "ecentic";
  const cleanDescription = description.replace(/\s+/gu, " ").trim();
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(
    cleanTitle,
  );
  const lineHeight = cjk ? 1.18 : 1.07;
  const candidates = [76, 72, 68, 64, 60, 56, 52, 48, 44].map((fontSize) => ({
    fontSize,
    lines: wrap(cleanTitle, 664, fontSize, locale),
  }));
  const selected = candidates.find(
    ({ fontSize, lines }) => lines.length * fontSize * lineHeight <= 276,
  ) ?? { fontSize: 44, lines: wrap(cleanTitle, 664, 44, locale) };
  const titleLines = limitLines(
    selected.lines,
    Math.floor(276 / (selected.fontSize * lineHeight)),
  );
  return {
    titleLines,
    titleSize: selected.fontSize,
    titleLineHeight: lineHeight,
    descriptionLines: limitLines(wrap(cleanDescription, 620, 24, locale), 3),
  };
};
