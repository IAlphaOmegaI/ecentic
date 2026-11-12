import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HairlineFigure } from "./figure";
import { stockRestPoses } from "./stock-rest";

describe("stock Hairline progressive enhancement", () => {
  test("every stock subject renders labelled geometry without mounting its interactive code", () => {
    const names = Object.keys(stockRestPoses) as Array<
      keyof typeof stockRestPoses
    >;
    for (const name of names) {
      const markup = renderToStaticMarkup(
        <HairlineFigure
          name={name}
          label={`Illustration: ${name}`}
          figure={() => {
            throw new Error("Interactive artwork must not mount during SSR");
          }}
        />,
      );
      expect(markup).toContain(`aria-label="Illustration: ${name}"`);
      expect(markup).toContain('data-hairline-rest=""');
      expect(markup).toContain('viewBox="0 0 400 320"');
      expect(markup).toMatch(/<(path|circle|ellipse|polygon|line)\b/);
      expect(markup).not.toMatch(/NaN|Infinity|<script|\son[a-z]+=/);
    }
  });

  test("multiple catalog drawings use separate mask IDs with valid local references", () => {
    const markup = renderToStaticMarkup(
      <>
        <HairlineFigure name="riffle" label="Catalog one" figure={() => null} />
        <HairlineFigure name="riffle" label="Catalog two" figure={() => null} />
      </>,
    );
    const ids = Array.from(
      markup.matchAll(/\sid="([^"]+)"/g),
      (match) => match[1],
    );
    const references = Array.from(
      markup.matchAll(/url\(#([^)]*)\)/g),
      (match) => match[1],
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(references.every((reference) => ids.includes(reference))).toBe(true);
    expect(markup).not.toContain("__REST_ID__");
  });
});
