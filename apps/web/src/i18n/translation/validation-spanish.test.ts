import { expect, test } from "bun:test";
import { monetaryMagnitudeFacts } from "./numeric-facts";
import { validateTranslationUnit } from "./validation";

const check = (source: string, target: string) =>
  validateTranslationUnit(
    { id: "fact", text: source, context: "Spanish editorial numeric fact" },
    target,
    "es",
  );

test("Spanish written quarters retain the exact quarter and year", () => {
  expect(
    check(
      "16.9% of retail sales in Q1 2026",
      "El 16,9 % de las ventas minoristas en el primer trimestre de 2026",
    ),
  ).toEqual([]);
  expect(check("Q4 2026", "cuarto trimestre de 2026")).toEqual([]);
  expect(check("Q1 2026", "tercer trimestre de 2026").length).toBeGreaterThan(
    0,
  );
  expect(check("Q1 2026", "primer trimestre de 2025").length).toBeGreaterThan(
    0,
  );
  expect(
    check("Q1 and Q2", "primer trimestre y primer trimestre").length,
  ).toBeGreaterThan(0);
});

test("Spanish large-count groupings preserve quantity and the long scale", () => {
  for (const target of [
    "2500 millones de usuarios",
    "2,5 mil millones de usuarios",
    "2.500 millones de usuarios",
  ])
    expect(check("2.5 billion users", target)).toEqual([]);
  expect(check("1 trillion records", "1 billón de registros")).toEqual([]);
  for (const target of [
    "2,5 billones de usuarios",
    "250 millones de usuarios",
    "2500000 millones de usuarios",
  ])
    expect(check("2.5 billion users", target).length).toBeGreaterThan(0);
  expect(
    check("-2.5 billion records", "2500 millones de registros").length,
  ).toBeGreaterThan(0);
});

test("Spanish numeric normalization does not relax currency, code or ordinary versions", () => {
  expect(check("€2.5 billion", "2500 millones USD").length).toBeGreaterThan(0);
  expect(check("Version 2.5", "Versión 2500").length).toBeGreaterThan(0);
  expect(
    check("Run `Q1 2026`", "Ejecuta `primer trimestre de 2026`").length,
  ).toBeGreaterThan(0);
  expect(
    check("Read https://example.com/Q1", "Lee https://example.com/Q2").length,
  ).toBeGreaterThan(0);
});

test("Spanish monetary magnitudes preserve native grouping and long-scale values", () => {
  for (const target of [
    "2500 millones de $",
    "2.500 millones $",
    "2 500 millones de $",
    "2\u00a0500 millones de $",
    "2\u202f500 millones de $",
    "2,5 mil millones de $",
    "$2,5 mil\u00a0millones",
  ])
    expect(check("$2.5 billion", target)).toEqual([]);
  expect(check("$1 trillion", "1 billón de $")).toEqual([]);
  expect(check("$15 trillion", "15 billones $")).toEqual([]);
  expect(check("€1.5 trillion", "1,5 billones de €")).toEqual([]);
  expect(check("USD 1.25 billion", "1250 millones de USD")).toEqual([]);
  expect(check("$20M", "20 M$")).toEqual([]);
  expect(check("€250K", "250 k€")).toEqual([]);
  expect(check("$20M", "$20M")).toEqual([]);
});

test("Spanish monetary matching keeps amount and currency paired", () => {
  const source = "$1 billion and €2 billion";
  expect(check(source, "1000 millones $ y 2000 millones €")).toEqual([]);
  expect(check(source, "2000 millones € y 1000 millones $")).toEqual([]);
  for (const target of [
    "2000 millones $ y 1000 millones €",
    "1000 millones $ y 2000 millones $",
    "1000 millones $ y 2000 millones",
    "1000 millones $ y 2001 millones €",
  ])
    expect(check(source, target).length).toBeGreaterThan(0);
  for (const target of [
    "2,5 billones $",
    "250 millones $",
    "2500 millones €",
    "2500 millones",
    "2501 millones $",
  ])
    expect(check("$2.5 billion", target).length).toBeGreaterThan(0);
  expect(check("$1 trillion", "1 millón de $").length).toBeGreaterThan(0);
});

test("Spanish monetary ranges can repeat the source's shared trailing magnitude", () => {
  const source = "$3 to $5 trillion globally by 2030";
  const target = "entre 3 billones $ y 5 billones $ a nivel global para 2030";
  expect(check(source, target)).toEqual([]);
  expect(monetaryMagnitudeFacts(source, "en").values).toEqual([
    "$:3000000000000",
    "$:5000000000000",
  ]);
  expect(
    check("€1.5 through €2 billion", "entre 1500 millones € y 2000 millones €"),
  ).toEqual([]);
  expect(
    check("USD 3 – USD 5 million", "de 3 millones USD a 5 millones USD"),
  ).toEqual([]);
  expect(
    check("-$3 to $5 trillion", "de -3 billones $ a 5 billones $"),
  ).toEqual([]);
  for (const changed of [
    target.replace("3 billones", "3 millones"),
    target.replace("5 billones", "6 billones"),
    target.replace("5 billones $", "5 billones €"),
    target.replace("3 billones $", "3 billones"),
    target.replace("3 billones", "-3 billones"),
    target.replace("2030", "2031"),
  ])
    expect(check(source, changed).length).toBeGreaterThan(0);
  expect(
    check("$3 to €5 trillion", "de 3 billones $ a 5 billones €").length,
  ).toBeGreaterThan(0);
  expect(
    check(
      "3 to 5 trillion records",
      "de 3 billones de registros a 5 billones de registros",
    ).length,
  ).toBeGreaterThan(0);
});

test("Spanish shared monetary ranges do not rewrite code, links or attributes", () => {
  const source =
    'Use `$3 to $5 trillion`; read [guide](/cost/3-5); <span title="$3 to $5 trillion">range</span>. Version 3.5.';
  const target =
    'Usa `$3 to $5 trillion`; lee [guía](/cost/3-5); <span title="$3 to $5 trillion">intervalo</span>. Versión 3.5.';
  expect(check(source, target)).toEqual([]);
  for (const changed of [
    target.replace("`$3 to $5 trillion`", "`3 billones $ a 5 billones $`"),
    target.replace("/cost/3-5", "/cost/3-6"),
    target.replace(
      'title="$3 to $5 trillion"',
      'title="3 billones $ a 5 billones $"',
    ),
    target.replace("3.5.", "3.6."),
  ])
    expect(check(source, changed).length).toBeGreaterThan(0);
});

test("Spanish monetary conversion preserves signs and precision beyond safe integers", () => {
  for (const source of [
    "-$1 trillion",
    "$-1 trillion",
    "Balance: - $1 trillion",
    "Balance − $1 trillion",
  ]) {
    expect(check(source, "-1 billón de $")).toEqual([]);
    expect(check(source, "1 billón de $").length).toBeGreaterThan(0);
  }
  expect(check("$1 trillion", "-1 billón de $").length).toBeGreaterThan(0);
  expect(
    check("$9007199254.740993 billion", "9.007.199.254,740993 mil millones $"),
  ).toEqual([]);
  expect(
    check("$9007199254.740993 billion", "9.007.199.254,740992 mil millones $")
      .length,
  ).toBeGreaterThan(0);
  expect(
    check("$0.0000000000001 trillion", "0,000000000100 mil millones $"),
  ).toEqual([]);
});

test("Spanish money is extracted before independent count normalization", () => {
  const source = "$2.5 billion; 3 billion records; 5 steps; version 0.5; 40%";
  const target =
    "2500 millones $; 3000 millones de registros; 5 pasos; versión 0.5; 40 %";
  expect(check(source, target)).toEqual([]);
  for (const changed of [
    target
      .replace("2500 millones $", "3000 millones $")
      .replace("3000 millones de registros", "2500 millones de registros"),
    target.replace("3000 millones de registros", "3001 millones de registros"),
    target.replace("5 pasos", "6 pasos"),
    target.replace("versión 0.5", "versión 0.6"),
    target.replace("40 %", "41 %"),
  ])
    expect(check(source, changed).length).toBeGreaterThan(0);
  expect(
    monetaryMagnitudeFacts("2500 millones de productos; versión 0.5", "es"),
  ).toEqual({
    remainder: "2500 millones de productos; versión 0.5",
    values: [],
  });
});

test("Spanish monetary prose leaves code, link destinations and HTML attributes exact", () => {
  const source =
    'Use `$1 trillion`, https://example.com/$1trillion and [guide](/cost/$1trillion); <span title="$1 trillion">amount</span>. Total: $2.5 billion.';
  const target =
    'Usa `$1 trillion`, https://example.com/$1trillion y [guía](/cost/$1trillion); <span title="$1 trillion">importe</span>. Total: 2500 millones $.';
  expect(check(source, target)).toEqual([]);
  for (const changed of [
    target.replace("`$1 trillion`", "`1 billón $`"),
    target.replace("example.com/$1trillion", "example.com/$1billon"),
    target.replace("/cost/$1trillion", "/cost/$1billon"),
    target.replace('title="$1 trillion"', 'title="1 billón $"'),
  ])
    expect(check(source, changed).length).toBeGreaterThan(0);
});

test("Spanish large counts preserve an attached plus before the magnitude", () => {
  expect(
    check(
      "More than 2 billion updates across 50+ billion listings",
      "Más de 2.000 millones de actualizaciones en 50.000 millones de fichas o más",
    ),
  ).toEqual([]);
  expect(
    check("50+ billion listings", "50 millones de fichas o más").length,
  ).toBeGreaterThan(0);
  expect(
    check("50+ billion listings", "50 billones de fichas o más").length,
  ).toBeGreaterThan(0);
  expect(
    check("Use `50+ billion`", "Usa `50.000 millones o más`").length,
  ).toBeGreaterThan(0);
});
