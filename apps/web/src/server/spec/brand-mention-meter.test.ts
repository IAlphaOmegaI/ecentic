import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MentionMeter } from "../../app/[locale]/(main)/dashboard/[store]/brand/_components/mention-meter";

const render = (count: number, total: number) =>
  renderToStaticMarkup(createElement(MentionMeter, { count, total }));

describe("brand mention meter", () => {
  test("uses one shared percentage-scale gradient for all counted answers", () => {
    const markup = render(3, 7);
    expect(markup.match(/<linearGradient /g)).toHaveLength(1);
    expect(markup).toContain('gradientUnits="userSpaceOnUse"');
    expect(markup).toContain('x1="0%" x2="100%"');
    expect(markup.match(/<rect /g)).toHaveLength(7);
    expect(markup.match(/fill="url\(#[^"]+\)"/g)).toHaveLength(3);
    expect(new Set(markup.match(/fill="url\(#[^"]+\)"/g)).size).toBe(1);
    expect(
      markup.match(/fill="var\(--color-accent-foreground\)"/g),
    ).toHaveLength(4);
  });

  test("zero mentions remains entirely neutral and differs from no sample", () => {
    const zero = render(0, 13);
    const missing = render(0, 0);
    expect(zero.match(/<rect /g)).toHaveLength(13);
    expect(zero).not.toContain('fill="url(');
    expect(missing).not.toContain("<rect");
    expect(missing).not.toContain("<linearGradient");
  });

  test("different cohort sizes retain the same color scale and full meter width", () => {
    for (const total of [1, 7, 13, 20]) {
      const markup = render(total, total);
      expect(markup).toContain('class="mt-5 h-4 w-full max-w-80"');
      expect(markup).toContain('x1="0%" x2="100%"');
      expect(markup).toContain('offset="0%" stop-color="var(--color-error)"');
      expect(markup).toContain(
        'offset="50%" stop-color="var(--color-warning)"',
      );
      expect(markup).toContain(
        'offset="100%" stop-color="var(--color-success)"',
      );
      expect(markup.match(/fill="url\(#[^"]+\)"/g)).toHaveLength(total);
    }
  });

  test("segments are decoration, not pretend buttons or duplicate screen-reader values", () => {
    const markup = render(2, 4);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain('tabindex="0"');
  });
});
