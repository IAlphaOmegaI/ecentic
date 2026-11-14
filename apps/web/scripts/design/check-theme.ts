import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dir, "../../../..");
const parameters = process.argv.slice(2);
const output = parameters[parameters.indexOf("--out") + 1];
const patterns = [
  "apps/web/src/**/*.{ts,tsx,css}",
  "packages/web/src/**/*.{ts,tsx,css}",
];
const files = (
  await Promise.all(
    patterns.map(async (pattern) =>
      Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: root })),
    ),
  )
)
  .flat()
  .sort();
const exclusions = [
  {
    path: "apps/web/src/lib/og.tsx",
    reason: "Social image renderer does not use the browser Tailwind cascade.",
  },
  {
    path: "apps/web/src/components/hairline/kernel-style.css",
    reason:
      "Bundled drawing-engine defaults; rendered ecentic figures receive semantic theme inputs.",
  },
];
const excluded = (file: string) =>
  exclusions.some((entry) => entry.path === file) ||
  file.includes("/server/") ||
  file.includes("/spec/") ||
  /(?:opengraph|twitter)-image\./.test(file);
const issues: { file: string; line: number; rule: string; value: string }[] =
  [];
const geometry: {
  file: string;
  line: number;
  value: string;
  reason: string;
}[] = [];
const rawColor =
  /\b(?:bg|text|border|ring|outline|shadow|fill|stroke|from|via|to)-(?:\[(?:#[\da-fA-F]+|rgba?\(|hsla?\(|oklch\()[^\]]*\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|white\b|black\b)/g;
const rawRadius =
  /\brounded(?:-[trblse]{1,2})?-(?:xs|md|xl|2xl|3xl|4xl|\[[^\]]+\])/g;
const appearance =
  /\b(?:text|tracking|leading|shadow|drop-shadow|p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?)-\[(?!var\(|length:--)[^\]]+\]/g;
const theme = await readFile(
  resolve(root, "packages/shared/config/src/tailwind/globals.css"),
  "utf8",
);
const colors = new Set(
  [...theme.matchAll(/--color-([\w-]+)\s*:/g)].map((match) => match[1]),
);
// Semantic names do not generate CSS unless the theme declares them. In
// particular, the legacy bg-popover left dropdowns transparent over table rows.
const semanticSurface =
  /(?<![\w/-])(?:bg|text|border|ring|outline|shadow|fill|stroke|from|via|to)-((?:popover|card|muted|destructive|input|border|ring|background|foreground|primary|secondary|emphasis|accent|success|warning|error|info|neutral)(?:-[a-z]+)*)\b/g;

for (const file of files.filter((candidate) => !excluded(candidate))) {
  const source = await readFile(resolve(root, file), "utf8");
  const check = (value: string, offset: number) => {
    const line = source.slice(0, offset).split("\n").length;
    for (const [rule, pattern] of [
      ["semantic-color", rawColor],
      ["four-radii", rawRadius],
    ] as const)
      for (const match of value.matchAll(pattern))
        issues.push({ file, line, rule, value: match[0] });
    for (const match of value.matchAll(semanticSurface))
      if (!colors.has(match[1]))
        issues.push({
          file,
          line,
          rule: "undefined-surface-token",
          value: match[0],
        });
    for (const match of value.matchAll(appearance)) {
      const reason = (() => {
        if (file.includes("/(stage)/") && /clamp|v[wh]/.test(match[0]))
          return "Viewport-fit projector presentation geometry; same formulas are shared by its skeleton.";
        if (
          file ===
            "apps/web/src/app/[locale]/(main)/pricing/_components/fee-walkthrough.tsx" &&
          match[0] === "text-[min(16px,calc(100cqw/25))]"
        )
          return "Fits a fixed 25-column ASCII illustration to its container without wrapping its drawing.";
        return null;
      })();
      if (reason) geometry.push({ file, line, value: match[0], reason });
      else
        issues.push({ file, line, rule: "theme-appearance", value: match[0] });
    }
  };
  if (file.endsWith(".css")) {
    for (const match of source.matchAll(
      /--color-[\w-]+:\s*(#[\da-fA-F]+|(?:rgb|hsl|oklch)a?\([^;]+)/g,
    ))
      issues.push({
        file,
        line: source.slice(0, match.index).split("\n").length,
        rule: "local-palette",
        value: match[0],
      });
    continue;
  }
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      check(node.text, node.getStart(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree);
}
const foundations = [
  ...theme.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]+);/g),
].map((match) => ({ token: match[1], value: match[2] }));
if (foundations.length > 7)
  issues.push({
    file: "packages/shared/config/src/tailwind/globals.css",
    line: 1,
    rule: "seven-foundations",
    value: `${foundations.length} literal color foundations`,
  });
const report = {
  files: files.filter((file) => !excluded(file)).length,
  foundations,
  radii: ["none", "sm", "lg", "full"],
  issues,
  geometryExceptions: geometry,
  exclusions,
  limitations: [
    "Checks literal source classes; does not count raster/artwork pixels, transparent compositing or authentic third-party logos.",
    "Viewport-fit projector compositions and ASCII drawing cell geometry have explicit path-and-pattern exceptions. Ordinary interface typography, tracking, line-height, spacing and shadows must use named theme utilities.",
    "Data-driven chart/SVG coordinates, structural rail formulas, generated classes and external embedded UI require separate runtime review.",
    "Semantic and legacy surface color families are checked against declared theme colors; this is not a complete Tailwind utility validator.",
  ],
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (parameters.includes("--out") && output)
  await writeFile(resolve(process.cwd(), output), serialized);
console.log(
  `Theme: ${foundations.length}/7 foundations, four radius treatments, ${report.files} source files. ${issues.length} violations; ${geometry.length} documented geometry exceptions.`,
);
if (issues.length) console.log(JSON.stringify(issues, null, 2));
if (!parameters.includes("--out"))
  console.log("Run with --out <path> for the complete source inventory.");
if (parameters.includes("--strict") && issues.length) process.exitCode = 1;
