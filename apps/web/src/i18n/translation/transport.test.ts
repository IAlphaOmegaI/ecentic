import { expect, test } from "bun:test";
import { z } from "zod";
import { compactTranslationTransport } from "./transport";

test("compact transport preserves prose and restores every review envelope ID", () => {
  const original = "enterprisePlatform.pages.connect.title";
  const transport = compactTranslationTransport({
    phase: "review",
    system: "Review all six passes.",
    prompt: `Review.\n${JSON.stringify({
      units: [
        { id: original, text: original, context: `Heading: ${original}` },
      ],
      requestedIds: [original],
    })}`,
    schemaName: "review",
    schema: z.object({}),
  });
  const payload = JSON.parse(
    transport.request.prompt.split("\n").at(-1) ?? "null",
  );
  const alias = payload.units[0].id;
  expect(alias.length).toBeLessThan(original.length);
  expect(payload.units[0].text).toBe(original);
  expect(payload.units[0].context).toBe(`Heading: ${original}`);
  expect(payload.units[0].originalId).toBe(original);
  expect(payload.requestedIds).toEqual([alias]);
  expect(
    transport.decode({
      reviewedIds: [alias],
      issues: [{ id: alias, message: `Text mentioning ${alias}` }],
    }),
  ).toEqual({
    reviewedIds: [original],
    issues: [{ id: original, message: `Text mentioning ${alias}` }],
  });
});

test("nested finding IDs and their unit IDs round trip independently", () => {
  const transport = compactTranslationTransport({
    phase: "adjudicate",
    system: "",
    prompt: JSON.stringify({
      units: [{ id: "body.1", text: "a" }],
      findings: [
        { id: "finding-0", finding: { id: "body.1", message: "Check" } },
      ],
    }),
    schemaName: "adjudication",
    schema: z.object({}),
  });
  const payload = JSON.parse(transport.request.prompt);
  expect(payload.findings[0].finding.id).toBe(payload.units[0].id);
  expect(
    transport.decode({ decisions: [{ id: payload.findings[0].id }] }),
  ).toEqual({
    decisions: [{ id: "finding-0" }],
  });
  expect(
    transport.decode({ units: [{ id: "unknown", text: "Keep" }] }),
  ).toEqual({
    units: [{ id: "unknown", text: "Keep" }],
  });
});

test("aliases cannot collide with a real source ID", () => {
  const transport = compactTranslationTransport({
    phase: "draft",
    system: "",
    prompt: JSON.stringify({
      units: [
        { id: "_t0", text: "One" },
        { id: "full.key", text: "Two" },
      ],
    }),
    schemaName: "draft",
    schema: z.object({}),
  });
  const payload = JSON.parse(transport.request.prompt);
  expect(payload.units.map((unit: { id: string }) => unit.id)).not.toContain(
    "_t0",
  );
  expect(
    transport.decode({
      units: payload.units.map(
        ({ id, text }: { id: string; text: string }) => ({ id, text }),
      ),
    }),
  ).toEqual({
    units: [
      { id: "_t0", text: "One" },
      { id: "full.key", text: "Two" },
    ],
  });
});
