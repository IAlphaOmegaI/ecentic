import { describe, expect, test } from "bun:test";
import { sourceDiff } from "../interactive/source-diff";

const reconstruct = (before: string, after: string) => {
  const lines = sourceDiff(before, after);
  expect(
    lines
      .filter((line) => line.kind !== "added")
      .map((line) => line.source)
      .join("\n"),
  ).toBe(before);
  expect(
    lines
      .filter((line) => line.kind !== "removed")
      .map((line) => line.source)
      .join("\n"),
  ).toBe(after);
  expect(
    lines
      .filter((line) => line.before !== undefined)
      .map((line) => line.before),
  ).toEqual(before.split("\n").map((_, index) => index + 1));
  expect(
    lines.filter((line) => line.after !== undefined).map((line) => line.after),
  ).toEqual(after.split("\n").map((_, index) => index + 1));
  return lines;
};

describe("sourceDiff", () => {
  test("keeps identical records as context", () => {
    const source = '{\n  "title": "Headphones",\n  "description": null\n}';
    expect(
      reconstruct(source, source).every((line) => line.kind === "context"),
    ).toBe(true);
  });
  test("preserves repeated nested closing lines and unchanged source facts", () => {
    const before = JSON.stringify(
      {
        product: { title: "Headphones", identifiers: { gtin: null } },
        source: { imported: false },
        access: { publish: false },
      },
      null,
      2,
    );
    const after = JSON.stringify(
      {
        product: { title: "Headphones", identifiers: { gtin: null } },
        source: { imported: true },
        access: { publish: false },
      },
      null,
      2,
    );
    const lines = reconstruct(before, after);
    expect(
      lines
        .filter((line) => line.kind === "removed")
        .map((line) => line.source),
    ).toEqual(['    "imported": false']);
    expect(
      lines.filter((line) => line.kind === "added").map((line) => line.source),
    ).toEqual(['    "imported": true']);
  });
  test("handles insertions, deletions, duplicate lines and escaped source values", () => {
    for (const [before, after] of [
      ["same\nrepeat\nrepeat\ntail", "same\nrepeat\nadded\nrepeat\ntail"],
      ["start\nremoved\nremoved\nend", "start\nremoved\nend"],
      [
        '{\n  "text": "<script> & \\"quoted\\""\n}',
        '{\n  "text": "<b>sample</b>"\n}',
      ],
      ["", "a\nb"],
      ["a\nb", ""],
    ])
      reconstruct(before ?? "", after ?? "");
  });
});
