import { describe, expect, test } from "bun:test";
import {
  analyzeSources,
  artworkBindings,
  checkAsset,
  checkGlyphRamps,
  checkPatterns,
  checkSeams,
  checkVisualContracts,
  consumerGraph,
  consumersOf,
  parseSource,
  type Registry,
  type Renderer,
  readProvenance,
  sha256,
  syntaxFindings,
  type Target,
  type VisualContract,
} from "./source";

const source = (text: string) => parseSource("fixture.tsx", text);
const target = (
  role: Target["role"],
  overrides: Partial<Target> = {},
): Target => ({
  id: "fixture",
  file: "fixture.tsx",
  component: "Example",
  role,
  purpose: "A registered component fixture.",
  ...overrides,
});
const renderer: Renderer = {
  id: "path",
  file: "fixture.tsx",
  component: "Example",
  kind: "procedural-path",
  subject: "A meaningful route.",
};

describe("C1 terminal row selector", () => {
  test("finds the trailing decorative sibling and reports its real line", () => {
    const findings = checkSeams(
      source(`const Example = () => (
      <ol>{items.map((item) => <li className="border-b last:border-b-0">{item}</li>)}
        <Plus />
      </ol>);`),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(2);
    expect(findings[0]?.evidence[0]).toContain("line 3");
    expect(findings[0]?.severity).toBe("advisory");
  });

  test("optional map, cn and responsive last selectors stay observable", () => {
    expect(
      checkSeams(
        source(`const Example = () => <ol>{items?.map((item) => {
      return <li className={cn("md:last:border-b-0", "border-b")}>{item}</li>;
    })}<Plus /></ol>;`),
      ),
    ).toHaveLength(1);
  });

  test("last-of-type selects the final row despite decoration", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item) => <li className="border-b last-of-type:border-b-0">{item}</li>)}<Plus /></ol>;`,
        ),
      ),
    ).toEqual([]);
  });

  test("an explicit last index override removes the broken edge", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item, index) => <li className={cn("border-b last:border-b-0", index === items.length - 1 && "border-b-0")}>{item}</li>)}<Plus /></ol>;`,
        ),
      ),
    ).toEqual([]);
  });

  test("a non-terminal index override does not suppress the finding", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item, index) => <li className={cn("border-b last:border-b-0", index === 0 && "border-b-0")}>{item}</li>)}<Plus /></ol>;`,
        ),
      ),
    ).toHaveLength(1);
  });

  test("self-closing rows are checked and another collection's length is not an override", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item, index) => <li className={cn("last:border-b-0", index === otherItems.length - 1 && "border-b-0")} />)}<Plus /></ol>;`,
        ),
      ),
    ).toHaveLength(1);
  });

  test("a final mapped row with only a comment after it is valid", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item) => <li className="last:border-b-0">{item}</li>)}{/* decoration removed */}</ol>;`,
        ),
      ),
    ).toEqual([]);
  });

  test("decorations inside the row do not change its sibling position", () => {
    expect(
      checkSeams(
        source(
          `const Example = () => <ol>{items.map((item) => <li className="last:border-b-0"><Plus />{item}</li>)}</ol>;`,
        ),
      ),
    ).toEqual([]);
  });

  test("comments, strings and unrelated non-list markup are not parsed as rows", () => {
    expect(
      checkSeams(
        source(`// <ol>{items.map(item => <li className="last:border-b-0" />)}<Plus /></ol>
    const text = "last:border-b-0";
    const Example = () => <div><li className="last:border-b-0" /><Plus /></div>;`),
      ),
    ).toEqual([]);
  });
});

describe("C6 registered component roles", () => {
  const tabs = `import { Tabs as NativeTabs, Tab, TabsPanel } from "@zenncore/web/components/tabs";
    const exchanges = [{method: "initialize"}, {method: "notifications/initialized"}];
    const Example = () => <NativeTabs>{exchanges.map(exchange => <Tab value={exchange.method}>{exchange.method}</Tab>)}{exchanges.map(exchange => <TabsPanel value={exchange.method}><p>Required step</p></TabsPanel>)}</NativeTabs>;`;

  test("sequential narrative tabs are advisory, including import aliases", () => {
    const result = checkPatterns(source(tabs), target("ordered-narrative"));
    expect(result.findings.map((finding) => finding.check)).toEqual([
      "sequential-narrative-tabs",
    ]);
    expect(result.coverage.observed).toBe(1);
    expect(result.coverage.matched).toBe(true);
  });

  test.each([
    "HTTP headers",
    "API endpoints",
    "input records",
    "source formats",
  ])("genuine %s selection remains valid", (selection) => {
    const result = checkPatterns(
      source(tabs),
      target("selector", { selection }),
    );
    expect(result.findings).toEqual([]);
    expect(result.coverage.notes.join(" ")).toContain(selection);
  });

  test("switch-case scoping excludes an unrelated selector in the same file", () => {
    const result = checkPatterns(
      source(`const Example = ({mode}) => {
      switch(mode) {
        case "endpoint": return <Tabs><Tab value="GET"/><TabsPanel /></Tabs>;
        case "setup": return <ConnectedJourney items={steps}/>;
      }
    };`),
      target("ordered-workflow", { case: "setup" }),
    );
    expect(result.findings).toEqual([]);
    expect(result.coverage.observed).toBe(0);
  });

  test("connected native stage selectors are not plain narrative tabs", () => {
    const connected = `const Example = () => <Tabs><TabsList className="before:absolute before:border-l"><Tab value="one">One</Tab></TabsList><TabsPanel value="one"/></Tabs>;`;
    expect(
      checkPatterns(source(connected), target("connected-pattern")).findings,
    ).toEqual([]);
  });

  test("handwritten disconnected setup rows are advisory", () => {
    const result = checkPatterns(
      source(
        "const Example = () => <ol>{steps.map((item,index) => <li><span>{index+1}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol>;",
      ),
      target("ordered-workflow"),
    );
    expect(result.findings.map((finding) => finding.check)).toEqual([
      "disconnected-workflow-list",
    ]);
  });

  test("adding a visible connector removes the workflow finding", () => {
    const result = checkPatterns(
      source(
        `const Example = () => <ol>{steps.map((item,index) => <li><span aria-hidden className="absolute inset-y-0 w-px"/><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol>;`,
      ),
      target("ordered-workflow"),
    );
    expect(result.findings).toEqual([]);
  });

  test("shared journey replacement removes the old renderer finding", () => {
    expect(
      checkPatterns(
        source("const Example = () => <ConnectedJourney items={steps}/>;"),
        target("ordered-workflow"),
      ).findings,
    ).toEqual([]);
  });

  test("record display tabs are detected, but selecting records is allowed", () => {
    const comparison = source(
      `const Example = () => <Tabs><Tab value="before">Before</Tab><Tab value="after">After</Tab><TabsPanel value="before"/><TabsPanel value="after"/></Tabs>;`,
    );
    expect(
      checkPatterns(comparison, target("record-comparison")).findings[0]?.check,
    ).toBe("display-before-after-tabs");
    expect(
      checkPatterns(
        comparison,
        target("selector", { selection: "actual input records" }),
      ).findings,
    ).toEqual([]);
  });

  test("missing registered component is an error, not a passing zero", () => {
    const result = checkPatterns(
      source("const Renamed = () => <div/>;"),
      target("ordered-workflow"),
    );
    expect(result.coverage.matched).toBe(false);
    expect(result.findings[0]?.severity).toBe("error");
  });
});

describe("C6 scoped typography, headings and icons", () => {
  const contract = (
    overrides: Partial<VisualContract> = {},
  ): VisualContract => ({
    id: "visual-fixture",
    file: "fixture.tsx",
    component: "Example",
    purpose: "A registered ordinary public section.",
    typography: {
      tags: ["h2", "h3", "p", "dd"],
      technicalExpressions: ["item.header", "exchange.method"],
    },
    ...overrides,
  });

  test("ordinary headings and prose with literal or cn monospace are advisory", () => {
    const result = checkVisualContracts(
      source(
        `const Example = () => <section><h2 className="font-mono">Setup instructions</h2><p className={cn("text-sm", active && "md:font-mono")}>Get started</p></section>;`,
      ),
      contract(),
    );
    expect(result.findings.map((finding) => finding.check)).toEqual([
      "ordinary-copy-monospace",
      "ordinary-copy-monospace",
    ]);
    expect(
      result.coverage.checks?.some(
        (check) =>
          check.check === "computed-or-inherited-typography" &&
          check.status === "not-checked",
      ),
    ).toBe(true);
  });

  test("code-only content, actual HTTP paths and registered header expressions are technical", () => {
    const result = checkVisualContracts(
      source(
        `const Example = () => <section><p className="font-mono"><code>GET /api/v1</code></p><p className="font-mono">GET /api/v1</p><dd className="font-mono">{item.header}</dd><h3 className="font-mono">{exchange.method}</h3></section>;`,
      ),
      contract(),
    );
    expect(result.findings).toEqual([]);
  });

  test("a code span does not excuse monospace surrounding ordinary prose", () => {
    const result = checkVisualContracts(
      source(
        `const Example = () => <p className="font-mono">Send <code>GET</code> to read your catalog.</p>;`,
      ),
      contract(),
    );
    expect(result.findings[0]?.check).toBe("ordinary-copy-monospace");
  });

  test("opaque class expressions explicitly remain not checked", () => {
    const result = checkVisualContracts(
      source(
        "const Example = () => <p className={runtimeClasses}>{copy.body}</p>;",
      ),
      contract(),
    );
    expect(result.findings).toEqual([]);
    expect(
      result.coverage.checks?.find(
        (check) => check.check === "computed-or-inherited-typography",
      )?.observed,
    ).toBe(1);
  });

  test("shared-heading replacement removes the local section-heading advisory", () => {
    const heading = contract({
      heading: { component: "MarketingHeading", tag: "h2" },
    });
    expect(
      checkVisualContracts(
        source("const Example = () => <section><h2>{title}</h2></section>;"),
        heading,
      ).findings[0]?.check,
    ).toBe("unshared-section-heading");
    expect(
      checkVisualContracts(
        source(
          `import { MarketingHeading as Heading } from "./primitives"; const Example = () => <Heading title={title}/>;`,
        ),
        heading,
      ).findings,
    ).toEqual([]);
    const delegated = checkVisualContracts(
      source("const Example = () => <OtherSection/>;"),
      heading,
    );
    expect(
      delegated.coverage.checks?.find(
        (check) => check.check === "shared-section-heading",
      )?.status,
    ).toBe("not-checked");
  });

  const iconContract = contract({
    typography: undefined,
    rowIcons: {
      containerTag: "ol",
      rowTag: "li",
      importSource: "@zenncore/icons",
    },
  });
  test("canonical icon aliases and local indexed arrays retain their import provenance", () => {
    const result = checkVisualContracts(
      source(
        `import { CommerceCodeIcon as CodeIcon, CommerceFileIcon } from "@zenncore/icons"; const icons = [CodeIcon, CommerceFileIcon] as const; const Example = () => <ol>{items.map((item,index) => { const Icon = icons[index] ?? CodeIcon; return <li><Icon/><h3>{item.title}</h3></li>; })}</ol>;`,
      ),
      iconContract,
    );
    expect(result.findings).toEqual([]);
    expect(
      result.coverage.checks?.find(
        (check) => check.check === "canonical-row-icon-binding",
      )?.status,
    ).toBe("checked");
    expect(
      result.coverage.checks?.find(
        (check) => check.check === "icon-subject-and-alignment",
      )?.status,
    ).toBe("not-checked");
  });

  test("a bare numbered subject row or inline SVG needs review", () => {
    expect(
      checkVisualContracts(
        source(
          "const Example = () => <ol>{items.map((item,index) => <li><span>{index+1}</span><h3>{item.title}</h3></li>)}</ol>;",
        ),
        iconContract,
      ).findings[0]?.check,
    ).toBe("missing-canonical-row-icon");
    expect(
      checkVisualContracts(
        source(
          "const Example = () => <ol>{items.map(item => <li><svg/><h3>{item.title}</h3></li>)}</ol>;",
        ),
        iconContract,
      ).findings[0]?.check,
    ).toBe("missing-canonical-row-icon");
  });

  test("an opaque delegated icon is not silently considered compliant or missing", () => {
    const result = checkVisualContracts(
      source(
        `import { UnknownIcon } from "./custom"; const Example = () => <ol>{items.map(item => <li><UnknownIcon/><h3>{item.title}</h3></li>)}</ol>;`,
      ),
      iconContract,
    );
    expect(result.findings).toEqual([]);
    expect(
      result.coverage.checks?.find(
        (check) => check.check === "canonical-row-icon-binding",
      )?.status,
    ).toBe("not-checked");
  });

  test("unregistered components in the same file remain outside the contract", () => {
    const result = checkVisualContracts(
      source(
        `const Other = () => <p className="font-mono">Unrelated</p>; const Example = () => <p>Registered copy</p>;`,
      ),
      contract(),
    );
    expect(result.findings).toEqual([]);
  });
});

describe("C4 active artwork bindings", () => {
  test("finds a mixed density ramp only when the renderer indexes it", () => {
    expect(
      checkGlyphRamps(
        source(
          `const ramp = " -=+xX%#@"; const Example = () => <pre>{values.map(value => ramp[value])}</pre>;`,
        ),
        renderer,
      )[0]?.check,
    ).toBe("legacy-glyph-ramp");
    expect(
      checkGlyphRamps(
        source(
          `const ramp = " -=+xX%#@"; const Example = () => <div data-artwork-renderer="tonal-dots"/>;`,
        ),
        renderer,
      ),
    ).toEqual([]);
  });

  test("tonal dot glyphs and genuine protocol text are not legacy artwork", () => {
    const text = source(
      `const ramp = " -=+xX%#@"; const Example = () => <pre>{ramp[index]}</pre>;`,
    );
    expect(
      checkGlyphRamps(text, { ...renderer, kind: "protocol-text" }),
    ).toEqual([]);
    expect(
      checkGlyphRamps(
        source(
          `const ramp = " .·•●"; const Example = () => <pre>{ramp[index]}</pre>;`,
        ),
        renderer,
      ),
    ).toEqual([]);
  });

  test("discovers class mask URLs and data-map assets from AST strings, not comments", () => {
    const parsed = source(`// /images/ascii/comment.svg
      const assets = { bag: "/images/ascii/tonal/bag.svg" };
      const Example = () => <div className="[mask-image:url('/images/ascii/tonal/wordmark.svg')]"/>;`);
    expect(
      artworkBindings(parsed, "/images/ascii/").map((binding) => binding.asset),
    ).toEqual([
      "/images/ascii/tonal/bag.svg",
      "/images/ascii/tonal/wordmark.svg",
    ]);
  });

  test("normalizes main, typography and mobile provenance", () => {
    expect(
      readProvenance("manifest.json", {
        method: "Tonal dots",
        text: "404",
        source: "/source.png",
        asset: "/images/ascii/tonal/404.svg",
        mobileAsset: "/images/ascii/tonal/404-mobile.svg",
      }),
    ).toHaveLength(2);
    expect(
      readProvenance("manifest.json", {
        wordmark: {
          source: "paths.json",
          method: "extruded dots",
          assets: ["/images/ascii/tonal/wordmark.svg"],
        },
      })[0]?.subject,
    ).toBe("ecentic wordmark");
  });

  const pixels = new TextEncoder().encode("clean image fixture");
  const dots = new TextEncoder().encode(
    '<svg><circle cx="1" cy="1" r="0.4"/></svg>',
  );
  const provenance = {
    file: "manifest.json",
    subject: "Bag",
    method: "Tonal dots",
    source: "/source.png",
    asset: "/art.svg",
    sourceSha256: sha256(pixels),
    assetSha256: sha256(dots),
  };
  const files = new Map([
    ["apps/web/public/source.png", pixels],
    ["apps/web/public/art.svg", dots],
  ]);

  test("valid clean provenance and circle output passes", () => {
    expect(checkAsset(provenance, files)).toEqual([]);
  });

  test("source deletion, hash drift and changed SVG renderer fail", () => {
    expect(
      checkAsset(provenance, new Map([["apps/web/public/art.svg", dots]])).some(
        (finding) => finding.message.includes("Source is missing"),
      ),
    ).toBe(true);
    const changed = new Map(files);
    changed.set(
      "apps/web/public/art.svg",
      new TextEncoder().encode("<svg><text>-=+@</text></svg>"),
    );
    const findings = checkAsset(provenance, changed);
    expect(
      findings.some((finding) => finding.message.includes("SHA-256 differs")),
    ).toBe(true);
    expect(
      findings.some((finding) => finding.message.includes("circle-based")),
    ).toBe(true);
  });

  test("a raster embedded in an SVG is not mistaken for circle output", () => {
    const raster = new Map(files);
    raster.set(
      "apps/web/public/art.svg",
      new TextEncoder().encode(
        '<svg><circle r="1"/><image href="old.png"/></svg>',
      ),
    );
    expect(
      checkAsset({ ...provenance, assetSha256: undefined }, raster).some(
        (finding) => finding.message.includes("embedded"),
      ),
    ).toBe(true);
  });

  test("optimized two-arc circles pass while arbitrary outline paths fail", () => {
    const optimized = new Map(files);
    optimized.set(
      "apps/web/public/art.svg",
      new TextEncoder().encode(
        '<svg><path d="M1 2a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0"/></svg>',
      ),
    );
    expect(
      checkAsset({ ...provenance, assetSha256: undefined }, optimized),
    ).toEqual([]);
    optimized.set(
      "apps/web/public/art.svg",
      new TextEncoder().encode('<svg><path d="M1 2L4 5Z"/></svg>'),
    );
    expect(
      checkAsset({ ...provenance, assetSha256: undefined }, optimized).some(
        (finding) => finding.message.includes("non-dot geometry"),
      ),
    ).toBe(true);
  });
});

describe("coverage and parser failures", () => {
  test("syntax errors are returned from the installed TypeScript parser", () => {
    expect(
      syntaxFindings([source("const Example = () => <ol><li></ol>;")]).every(
        (finding) => finding.severity === "error",
      ),
    ).toBe(true);
    expect(
      syntaxFindings([source("const Example = () => <ol><li/></ol>;")]),
    ).toEqual([]);
    expect(
      syntaxFindings([source("const Example = () => <ol><li></ol>;")]).length,
    ).toBeGreaterThan(0);
  });

  test("consumer graph follows value imports and reexports, excluding type imports", () => {
    const graph = consumerGraph([
      parseSource("apps/web/src/road.tsx", "export const Road = () => <div/>;"),
      parseSource(
        "apps/web/src/timeline.tsx",
        'import { Road } from "./road"; export const Timeline = Road;',
      ),
      parseSource(
        "apps/web/src/index.ts",
        'export { Timeline } from "./timeline";',
      ),
      parseSource(
        "apps/web/src/page.tsx",
        'import { Timeline } from "@/index"; export default Timeline;',
      ),
      parseSource(
        "apps/web/src/types.ts",
        'import type { Road } from "./road";',
      ),
      parseSource(
        "apps/web/src/more-types.ts",
        'import { type Road } from "./road";',
      ),
    ]);
    expect(consumersOf("apps/web/src/road.tsx", graph)).toEqual([
      "apps/web/src/index.ts",
      "apps/web/src/page.tsx",
      "apps/web/src/timeline.tsx",
    ]);
  });

  test("an unregistered public artwork binding appears in coverage findings", () => {
    const registry: Registry = {
      version: 1,
      sourceRoot: "apps/web/src",
      publicRoots: ["apps/web/src/public/"],
      exclude: [],
      seams: [],
      processes: [],
      artwork: { assetPrefix: "/images/ascii/", provenance: [], renderers: [] },
    };
    const result = analyzeSources(
      [
        parseSource(
          "apps/web/src/public/new.tsx",
          'const Art = () => <img src="/images/ascii/new.svg"/>;',
        ),
      ],
      registry,
    );
    expect(result.findings[0]?.check).toBe("unregistered-artwork-binding");
    expect(result.bindings).toHaveLength(1);
  });

  test("retired image text is allowed on disk but warns when re-imported", () => {
    const legacy = parseSource(
      "apps/web/src/old.ts",
      `export const art = ${JSON.stringify(`\n${" -=+@".repeat(60)}\n`)};`,
    );
    const registry: Registry = {
      version: 1,
      sourceRoot: "apps/web/src",
      publicRoots: ["apps/web/src/public/"],
      exclude: [],
      seams: [],
      processes: [],
      artwork: {
        assetPrefix: "/images/ascii/",
        provenance: [],
        renderers: [],
        legacySources: [{ file: legacy.file, subject: "Retired bag." }],
      },
    };
    expect(analyzeSources([legacy], registry).findings).toEqual([]);
    const result = analyzeSources(
      [
        legacy,
        parseSource(
          "apps/web/src/public/art.tsx",
          'import { art } from "../old"; const Art = () => <pre>{art}</pre>;',
        ),
      ],
      registry,
    );
    expect(result.findings[0]?.check).toBe("legacy-artwork-text-binding");
  });
});
