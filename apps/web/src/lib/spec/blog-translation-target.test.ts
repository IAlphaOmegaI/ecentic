import { describe, expect, test } from "bun:test";
import {
  absentBlogTranslationTarget,
  blogTranslationTargetHash,
  blogTranslationTargetMatches,
} from "../blog-translation-target";

const target = {
  id: "spanish-post",
  locale: "es",
  status: "published",
  title: "Guía para tu tienda",
  contentHtml: '<p>Consulta <a href="/docs">la guía</a>.</p>',
  tags: ["Catálogo", "Datos de producto"],
  faqs: [{ question: "¿Cómo funciona?", answer: "Conecta tu tienda." }],
  updatedAt: new Date("2026-11-13T12:00:00.000Z"),
};

describe("published translation baseline", () => {
  test("a backup read from JSON matches the same database row", () => {
    const expected = blogTranslationTargetHash(target);
    expect(
      blogTranslationTargetMatches(
        expected,
        JSON.parse(JSON.stringify(target)),
      ),
    ).toBe(true);
    expect(
      blogTranslationTargetHash({
        ...target,
        faqs: [{ answer: "Conecta tu tienda.", question: "¿Cómo funciona?" }],
      }),
    ).toBe(expected);
  });

  test("concurrent changes to copy, metadata, status or timestamp block replacement", () => {
    const expected = blogTranslationTargetHash(target);
    for (const changed of [
      { ...target, title: "Una revisión manual" },
      {
        ...target,
        contentHtml: target.contentHtml.replace("/docs", "/support"),
      },
      { ...target, tags: [...target.tags].reverse() },
      { ...target, status: "draft" },
      { ...target, updatedAt: new Date("2026-11-13T12:00:01.000Z") },
      null,
    ])
      expect(blogTranslationTargetMatches(expected, changed)).toBe(false);
  });

  test("recorded absence never permits overwriting a concurrently inserted target", () => {
    expect(blogTranslationTargetHash(null)).toBe(absentBlogTranslationTarget);
    expect(
      blogTranslationTargetMatches(absentBlogTranslationTarget, null),
    ).toBe(true);
    expect(
      blogTranslationTargetMatches(absentBlogTranslationTarget, target),
    ).toBe(false);
  });

  test("legacy unrecorded baselines keep their existing semantics", () => {
    expect(blogTranslationTargetMatches(null, target)).toBe(true);
    expect(blogTranslationTargetMatches(null, null)).toBe(true);
    // A subsequent source version captures the latest target, not job creation time.
    const current = { ...target, title: "La última versión publicada" };
    const replacementBaseline = blogTranslationTargetHash(current);
    expect(blogTranslationTargetMatches(replacementBaseline, current)).toBe(
      true,
    );
    expect(blogTranslationTargetMatches(replacementBaseline, target)).toBe(
      false,
    );
  });
});
