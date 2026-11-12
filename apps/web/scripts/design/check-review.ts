import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { resultify } from "@zenncore/utils";
import {
  evaluateReviews,
  manifestSchema,
  receiptsSchema,
  reviewDigest,
} from "./review";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const run = async () => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      records: { type: "string" },
      out: { type: "string" },
      template: { type: "string" },
      strict: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "bun scripts/design/check-review.ts [--records receipts.json] [--out report.json] [--template new-receipts.json] [--strict]",
    );
    return;
  }
  const manifest = manifestSchema.parse(
    JSON.parse(
      await readFile(new URL("./visual-review.json", import.meta.url), "utf8"),
    ),
  );
  const identifiers = manifest.checks.flatMap((check) =>
    check.states.map((state) => `${check.id}/${state.id}`),
  );
  if (
    new Set(manifest.checks.map((check) => check.id)).size !==
      manifest.checks.length ||
    new Set(identifiers).size !== identifiers.length
  )
    throw new Error(
      "Visual review registry contains duplicate check/state identifiers.",
    );
  const digests = Object.fromEntries(
    await Promise.all(
      manifest.checks.map(async (check) => {
        const sources = Object.fromEntries(
          await Promise.all(
            check.sources.map(async (path) => [
              path,
              await readFile(resolve(root, path)),
            ]),
          ),
        );
        return [check.id, reviewDigest(check, sources)];
      }),
    ),
  );
  const receipts = values.records
    ? receiptsSchema.parse(
        JSON.parse(await readFile(resolve(values.records), "utf8")),
      )
    : receiptsSchema.parse({ schemaVersion: 1, reviews: [] });
  const evidence = [
    ...new Set(receipts.reviews.flatMap((receipt) => receipt.evidence)),
  ];
  const availableEvidence = new Set(
    (
      await Promise.all(
        evidence.map(async (path) =>
          (await Bun.file(resolve(root, path)).exists()) ? path : null,
        ),
      )
    ).filter((path): path is string => path !== null),
  );
  const report = evaluateReviews(
    manifest,
    receipts,
    digests,
    availableEvidence,
  );
  if (values.template) {
    const template = {
      schemaVersion: 1,
      reviews: manifest.checks.flatMap((check) =>
        check.states.map((state) => ({
          check: check.id,
          state: state.id,
          sourceDigest: digests[check.id],
          verdict: "notChecked",
          reviewer: "",
          reviewedAt: "",
          observation: "",
          evidence: [],
        })),
      ),
    };
    if (await Bun.file(resolve(values.template)).exists())
      throw new Error(
        "Refusing to overwrite an existing review receipt template.",
      );
    await Bun.write(
      resolve(values.template),
      `${JSON.stringify(template, null, 2)}\n`,
    );
  }
  if (values.out)
    await Bun.write(
      resolve(values.out),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  console.log(JSON.stringify(report.summary));
  if (report.errors.length) console.error(report.errors.join("\n"));
  if (
    report.errors.length ||
    (values.strict && (report.summary.failed || report.summary.notChecked))
  )
    process.exitCode = 1;
};

const execution = await resultify(run);
if (!execution.success) {
  console.error(execution.error);
  process.exitCode = 1;
}
