import { mock } from "bun:test";
import assert from "node:assert/strict";
import type { z } from "zod";
import {
  defaultPlaybook,
  prospectSchema,
  renderHistoricalMessages as renderMessages,
} from "@/lib/outbound";

mock.module("server-only", () => ({}));
const state = {
  calls: 0,
  fail: false,
  blocked: false,
  edits: {
    subject: "Linen tote question",
    opening: "Your linen tote caught my eye.",
  },
};
mock.module("@/server/utils/ai", () => ({
  generate: async ({ output }: { output: z.ZodType }) => {
    state.calls += 1;
    if (state.fail) throw new Error("Interrupted fixture request");
    return output.parse(state.edits);
  },
}));
mock.module("@/server/utils/outbound/shopping-research", () => ({
  evidenceForDraft: async () =>
    state.blocked
      ? { success: false, error: new Error("Research not valid") }
      : { success: true, data: null },
}));
const { generateDraft } = await import("@/server/utils/outbound/draft");
const prospect = prospectSchema.parse({
  company: "Sample Goods",
  name: "Jane Smith",
  first: "Jane",
  domain: "samplegoods.com",
  country: "US",
  product: "Linen tote",
  finding: "The product page lists one size without dimensions.",
  evidence: "Visible product capture.",
});
const settings = {
  ...defaultPlaybook,
  subjectTemplate: "Linen tote details",
  maxBodyWords: 200,
};
const original = renderMessages(prospect, settings);
const result = await generateDraft(prospect, settings);
if (!result.success) throw result.error;
assert.equal(result.success, true);
assert.deepEqual(result.data.issues, []);
assert.equal(
  result.data.messages[0]!.body.replace(`${state.edits.opening}\n\n`, ""),
  original[0]!.body,
);
assert.equal(state.calls, 1);

const held = await generateDraft(
  { ...prospect, finding: "Protected observed product facts ".repeat(80) },
  { ...settings, maxBodyWords: 99 },
);
if (!held.success) throw held.error;
assert.equal(held.success, true);
assert.ok(held.data.issues.some((issue) => issue.code === "wordLimit"));
assert.equal(
  state.calls,
  1,
  "Invalid immutable body must not spend a model call",
);

state.blocked = true;
assert.equal((await generateDraft(prospect, settings)).success, false);
assert.equal(state.calls, 1, "Evidence gate must still precede drafting");
state.blocked = false;
state.fail = true;
assert.equal((await generateDraft(prospect, settings)).success, false);
assert.equal(
  state.calls,
  2,
  "Interrupted model request must not retry or manufacture a draft",
);
console.info("Controlled draft contracts passed");
