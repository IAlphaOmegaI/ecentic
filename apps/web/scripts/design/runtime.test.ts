import { describe, expect, test } from "bun:test";
import registry from "./routes.json";
import {
  duplicatedStructuralStroke,
  type Edge,
  findDuplicateEdges,
  inspectSurface,
  localizedPath,
  openLocalizedRoute,
  productionCaption,
  roadmapSourceAdvisories,
  type Surface,
  terminalClipped,
} from "./runtime";

test("each bilingual visit replaces the preceding locale before navigation", async () => {
  const state = { locale: "es" };
  const visits: { locale: string; url: string }[] = [];
  const base = "http://localhost:3000";
  const command = async (arguments_: string[]) => {
    if (arguments_[0] === "cookies") {
      expect(arguments_.slice(0, 3)).toEqual(["cookies", "set", "NEXT_LOCALE"]);
      expect(arguments_[5]).toBe(`${base}/`);
      state.locale = arguments_[3] ?? "";
      return;
    }
    visits.push({ locale: state.locale, url: arguments_[1] ?? "" });
  };
  for (const locale of ["en", "es", "en"])
    await openLocalizedRoute({ route: "/docs/mcp", locale, base }, command);
  expect(visits).toEqual([
    { locale: "en", url: `${base}/docs/mcp` },
    { locale: "es", url: `${base}/es/docs/mcp` },
    { locale: "en", url: `${base}/docs/mcp` },
  ]);
  expect(localizedPath("/", "es")).toBe("/es");
});

const edge = (overrides: Partial<Edge> = {}): Edge => ({
  owner: "#band",
  source: "band.tsx",
  registration: "band",
  side: "bottom",
  x: 28,
  width: 1079,
  strokeCenterY: 800.5,
  visible: true,
  structural: true,
  ...overrides,
});

const surface = (overrides: Partial<Surface> = {}): Surface => ({
  id: "conversation",
  selector: "[data-conversation]",
  source: "conversation.tsx",
  left: 28,
  right: 517.453125,
  bottom: 808.5,
  contentLeft: 28,
  contentRight: 517.453125,
  contentBottom: 808.5,
  paddingLeft: 0,
  paddingRight: 0,
  radius: 0,
  secondShell: false,
  stretch: true,
  clipped: [],
  ...overrides,
});

describe("registered structural geometry", () => {
  test("adjacent one-pixel owners duplicate the same boundary", () => {
    expect(
      duplicatedStructuralStroke(
        edge(),
        edge({ owner: "#next", side: "top", strokeCenterY: 801.5 }),
      ),
    ).toBe(true);
  });

  test("a single-owned edge never duplicates itself", () => {
    expect(findDuplicateEdges([edge()])).toEqual([]);
    expect(duplicatedStructuralStroke(edge(), edge())).toBe(false);
  });

  test("layered illustration and progress fills are not structural", () => {
    expect(
      duplicatedStructuralStroke(
        edge(),
        edge({ owner: "#illustrated-card", structural: false }),
      ),
    ).toBe(false);
    expect(
      duplicatedStructuralStroke(
        edge({ structural: false }),
        edge({ owner: "#progress" }),
      ),
    ).toBe(false);
  });

  test("separated cards and small column overlaps do not share an edge", () => {
    expect(
      duplicatedStructuralStroke(
        edge(),
        edge({ owner: "#card", strokeCenterY: 817.5 }),
      ),
    ).toBe(false);
    expect(
      duplicatedStructuralStroke(edge(), edge({ owner: "#adjacent", x: 1090 })),
    ).toBe(false);
  });

  test("hidden ancestor or transparent computed border is excluded by visibility", () => {
    expect(
      duplicatedStructuralStroke(
        edge(),
        edge({ owner: "#hidden", visible: false }),
      ),
    ).toBe(false);
  });

  test("fractional tolerance and 85% overlap are audit boundaries", () => {
    expect(
      duplicatedStructuralStroke(
        edge(),
        edge({ owner: "#next", strokeCenterY: 801.61 }),
      ),
    ).toBe(false);
    expect(
      duplicatedStructuralStroke(
        edge({ x: 0, width: 1000 }),
        edge({ owner: "#next", x: 150, width: 1000 }),
      ),
    ).toBe(true);
    expect(
      duplicatedStructuralStroke(
        edge({ x: 0, width: 1000 }),
        edge({ owner: "#next", x: 151, width: 1000 }),
      ),
    ).toBe(false);
  });
});

describe("roadmap source ownership", () => {
  test("a mapped row followed by decorative Plus loses :last-child", () => {
    const source =
      '<ol>{rows.map(row => <li className="border-b last:border-b-0">{row}</li>)}<Plus /></ol>';
    expect(roadmapSourceAdvisories(source, "roadmap.tsx")).toHaveLength(1);
  });

  test("no trailing element, comments, and last-of-type do not trigger", () => {
    expect(
      roadmapSourceAdvisories(
        '<ol>{rows.map(row => <li className="last:border-b-0" />)}{/* comment */}</ol>',
        "roadmap.tsx",
      ),
    ).toEqual([]);
    expect(
      roadmapSourceAdvisories(
        '<ol>{rows.map(row => <li className="last-of-type:border-b-0" />)}<Plus /></ol>',
        "roadmap.tsx",
      ),
    ).toEqual([]);
    expect(
      roadmapSourceAdvisories(
        '<div><li className="last:border-b-0" /><Plus /></div>',
        "unrelated.tsx",
      ),
    ).toEqual([]);
  });
});

describe("embedded documents", () => {
  test("Perplexity-style full column allows internal bubbles and product cards", () => {
    expect(inspectSurface(surface())).toEqual({
      fillsColumn: true,
      decorativeInset: false,
      secondShell: false,
      roundedOuterShell: false,
      fillsStretch: true,
      terminalReachable: true,
    });
  });

  test("MCP's padded column is detected independently of a second border", () => {
    const inspection = inspectSurface(
      surface({
        left: 60,
        right: 485.453125,
        paddingLeft: 32,
        paddingRight: 32,
        bottom: 700,
      }),
    );
    expect(inspection.fillsColumn).toBe(false);
    expect(inspection.decorativeInset).toBe(true);
    expect(inspection.fillsStretch).toBe(false);
  });

  test("natural-height Travel conversation is valid when mobile siblings stack", () => {
    expect(
      inspectSurface(
        surface({
          left: 17,
          right: 373,
          contentLeft: 17,
          contentRight: 373,
          bottom: 811.75,
          contentBottom: 1500,
          stretch: false,
        }),
      ).fillsStretch,
    ).toBe(true);
  });

  test("a redundant framed wrapper and outer rounded shell remain distinct findings", () => {
    const inspection = inspectSurface(
      surface({ secondShell: true, radius: 12 }),
    );
    expect(inspection.secondShell).toBe(true);
    expect(inspection.roundedOuterShell).toBe(true);
  });

  test("terminal content behind a non-scrolling clip is unreachable", () => {
    expect(
      terminalClipped({
        bottom: 850,
        clipBottom: 800,
        overflow: "hidden",
        scrollableBetween: false,
      }),
    ).toBe(true);
    expect(
      terminalClipped({
        bottom: 850,
        clipBottom: 800,
        overflow: "auto",
        scrollableBetween: false,
      }),
    ).toBe(false);
    expect(
      terminalClipped({
        bottom: 850,
        clipBottom: 800,
        overflow: "hidden",
        scrollableBetween: true,
      }),
    ).toBe(false);
    expect(
      inspectSurface(surface({ clipped: ["#fixed-clip"] })).terminalReachable,
    ).toBe(false);
  });
});

describe("visible production captions", () => {
  const visible = {
    visible: true,
    screenReaderOnly: false,
    meaningfulStatus: false,
  };

  test("exact captions, registry names, and engine readouts are flagged", () => {
    expect(productionCaption("At rest", registry.figureNames, visible)).toBe(
      true,
    );
    expect(
      productionCaption(" merchant-folio ", registry.figureNames, visible),
    ).toBe(true);
    expect(productionCaption("FPS: 60", registry.figureNames, visible)).toBe(
      true,
    );
  });

  test("accessible descriptions and useful validation statuses remain allowed", () => {
    expect(
      productionCaption("rest", registry.figureNames, {
        ...visible,
        visible: false,
      }),
    ).toBe(false);
    expect(
      productionCaption("At rest", registry.figureNames, {
        ...visible,
        screenReaderOnly: true,
      }),
    ).toBe(false);
    expect(
      productionCaption("rest", registry.figureNames, {
        ...visible,
        meaningfulStatus: true,
      }),
    ).toBe(false);
    expect(
      productionCaption("Validation passed", registry.figureNames, visible),
    ).toBe(false);
    expect(
      productionCaption(
        "A catalog ready for shopping agents",
        registry.figureNames,
        visible,
      ),
    ).toBe(false);
  });
});

test("registry preserves the bounded audit and explicit Copilot non-applicability", () => {
  expect(registry.defaults.routes).toHaveLength(49);
  expect(new Set(registry.defaults.routes).size).toBe(49);
  expect(registry.additionalRoutes).toContain("/docs/mcp");
  expect(
    registry.embedded.find((entry) => entry.id === "copilot-conversation")
      ?.notApplicable,
  ).toContain("no shopping conversation");
  expect(registry.manual.map((entry) => entry.id)).toContain(
    "seams.cross-ownership",
  );
});
