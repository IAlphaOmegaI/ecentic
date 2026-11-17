import { mock } from "bun:test";
import assert from "node:assert/strict";
import { defaultWarmupPlan } from "@/lib/outbound-warmup";

mock.module("server-only", () => ({}));
const key = `wmbly_${"a".repeat(43)}`;
mock.module("@/server/app/outbound/provider-credentials", () => ({
  resolveKey: async () => ({ success: true, data: key }),
}));
const calls: { url: string; method: string; body: string | null }[] = [];
const id = "40cfcbe9-50e8-4dc8-917b-3b69b961fbeb";
const state = {
  status: 200,
  response: {
    data: [
      {
        id,
        email: "Juri@brand.com",
        warmup: null,
        unexpected_secret: "must-not-escape",
      },
    ],
    pagination: { has_more: false, next_cursor: null },
  } as unknown,
};
globalThis.fetch = mock(async (url, options) => {
  assert.equal(
    new Headers(options?.headers).get("authorization"),
    `Bearer ${key}`,
  );
  calls.push({
    url: String(url),
    method: options?.method ?? "GET",
    body: typeof options?.body === "string" ? options.body : null,
  });
  return Response.json(state.response, { status: state.status });
}) as unknown as typeof fetch;
const Warmbly = await import("@/server/utils/outbound/warmbly");
assert.equal((await Warmbly.validateWarmblyKey(key)).success, true);
assert.equal(calls[0]?.url, "https://api.warmbly.com/v1/emails?limit=1");
const page = await Warmbly.getMailboxes();
assert.equal(page.success, true);
assert.equal(page.data.mailboxes[0]?.email, "juri@brand.com");
assert.equal(page.data.mailboxes[0]?.state, "off");
assert.equal(JSON.stringify(page).includes("must-not-escape"), false);
const count = calls.length;
assert.equal(
  (await Warmbly.getMailboxWarmup({ id: "../secret" })).success,
  false,
);
assert.equal(calls.length, count);
state.response = {
  id,
  email: "juri@brand.com",
  warmup: "2026-11-15T00:00:00Z",
  warmup_paused_at: null,
  warmup_max: 15,
};
const mailbox = await Warmbly.getMailboxWarmup({ id });
assert.equal(mailbox.success && mailbox.data.state, "running");
assert.equal(calls.at(-1)?.url, `https://api.warmbly.com/v1/emails/${id}`);
await Warmbly.configureMailboxWarmup({ id, plan: defaultWarmupPlan });
assert.equal(calls.at(-1)?.method, "PATCH");
assert.deepEqual(JSON.parse(calls.at(-1)?.body ?? "{}"), {
  warmup_base: 2,
  warmup_max: 15,
  warmup_increase: 1,
});
await Warmbly.changeMailboxWarmup({ id, action: "pause" });
assert.equal(
  calls.at(-1)?.url,
  `https://api.warmbly.com/v1/emails/${id}/warmup/pause`,
);
assert.equal(calls.at(-1)?.method, "POST");
state.status = 403;
state.response = {
  code: "permission_denied",
  message: "private-message-must-not-escape",
};
const denied = await Warmbly.changeMailboxWarmup({ id, action: "start" });
assert.equal(denied.success, false);
if (!denied.success) {
  assert.equal("code" in denied.error && denied.error.code, "access");
  assert.equal(denied.error.message.includes("private-message"), false);
}
state.status = 503;
const prior = calls.length;
const uncertain = await Warmbly.changeMailboxWarmup({ id, action: "start" });
assert.equal(uncertain.success, false);
if (!uncertain.success)
  assert.equal("code" in uncertain.error && uncertain.error.code, "uncertain");
assert.equal(calls.length, prior + 1);
console.log("Warmbly adapter contracts passed");
