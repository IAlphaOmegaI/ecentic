import { mock } from "bun:test";
import assert from "node:assert/strict";
import {
  passingCopyJudge,
  writerFixture,
} from "../helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const { composeSequence } = await import("@/server/utils/outbound/draft");
const fixture = writerFixture();
const generate = mock(async () => fixture.parts);
const judge = mock(passingCopyJudge);
const result = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  fixture.policy,
  { generate, judge },
);
if (!result.success) throw result.error;
assert.deepEqual(result.data.issues, []);
assert.equal(result.data.messages.length, 3);
assert.ok(result.data.messages[0]?.body.includes(fixture.parts.opening));
assert.ok(result.data.messages[0]?.body.includes(fixture.parts.result));
assert.ok(
  result.data.messages[0]?.body.includes(fixture.policy.productCheckIntro),
);
assert.ok(result.data.messages[0]?.writing?.quality?.passed);
assert.equal(generate.mock.calls.length, 1);
assert.equal(judge.mock.calls.length, 1);

const held = await composeSequence(
  fixture.prospect,
  fixture.receipt,
  {
    ...fixture.policy,
    productCheckIntro: "Immutable founder text ".repeat(80),
  },
  { generate, judge },
);
assert.equal(held.success, false);
assert.equal(
  generate.mock.calls.length,
  1,
  "Fixed controls that leave no writing budget must hold before a model call",
);
assert.equal(
  (
    await composeSequence(fixture.prospect, null, fixture.policy, {
      generate,
      judge,
    })
  ).success,
  false,
);
assert.equal(
  generate.mock.calls.length,
  1,
  "A missing receipt must hold before drafting",
);
const interrupted = mock(async () => {
  throw new Error("Interrupted fixture request");
});
assert.equal(
  (
    await composeSequence(fixture.prospect, fixture.receipt, fixture.policy, {
      generate: interrupted,
      judge,
    })
  ).success,
  false,
);
assert.equal(
  interrupted.mock.calls.length,
  1,
  "An uncertain writer request is not retried",
);
assert.equal(
  judge.mock.calls.length,
  1,
  "A failed writer must not purchase copy review",
);
console.info("Controlled draft contracts passed");
