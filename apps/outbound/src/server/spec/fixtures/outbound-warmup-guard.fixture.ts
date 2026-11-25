import { expect, mock, spyOn } from "bun:test";
import { IntegrationError } from "@/server/utils/outbound/http";

mock.module("server-only", () => ({}));
const Credentials = await import("@/server/app/outbound/provider-credentials");
const Jobs = await import("@/server/app/outbound/jobs");
const Warmbly = await import("@/server/utils/outbound/warmbly");
const { assertWarmupPaused } = await import(
  "@/server/utils/outbound/warmup-guard"
);
const metadata = spyOn(Credentials, "metadata");
const pending = spyOn(Jobs, "hasPendingWarmup");
const mailboxes = spyOn(Warmbly, "getMailboxes");
const reset = () => {
  pending.mockReset().mockResolvedValue({ success: true, data: false });
  metadata.mockReset().mockResolvedValue({
    success: true,
    data: {
      configured: true,
      configuration: {},
      credentialStatus: "verified",
    },
  });
  mailboxes.mockReset();
};

const mailbox = (state: "off" | "paused" | "running" | "unknown") => ({
  id: "9cfa11af-741b-4cf7-877a-39a24bde93d1",
  email: "sender@brand.com",
  status: "active",
  warmupStartedAt: null,
  pausedAt: null,
  state,
  initialDailyCap: 2,
  maximumDailyCap: 15,
  dailyIncrease: 1,
  poolType: "shared",
  authState: "unknown",
});
await (async () => {
  reset();
  mailboxes.mockResolvedValueOnce({
    success: true,
    data: { mailboxes: [], hasMore: true, nextCursor: "next" },
  });
  mailboxes.mockResolvedValueOnce({
    success: true,
    data: { mailboxes: [mailbox("running")], hasMore: false, nextCursor: null },
  });
  await expect(assertWarmupPaused("sender@brand.com")).rejects.toThrow("Pause");
  expect(mailboxes).toHaveBeenCalledTimes(2);
})();
await (async () => {
  reset();
  mailboxes.mockResolvedValue({
    success: true,
    data: { mailboxes: [mailbox("paused")], hasMore: false, nextCursor: null },
  });
  await expect(assertWarmupPaused("sender@brand.com")).resolves.toBeUndefined();
  mailboxes.mockResolvedValue({
    success: true,
    data: { mailboxes: [mailbox("unknown")], hasMore: false, nextCursor: null },
  });
  await expect(assertWarmupPaused("sender@brand.com")).rejects.toThrow("Pause");
})();
await (async () => {
  reset();
  metadata.mockResolvedValueOnce({
    success: true,
    data: { configured: false, configuration: {}, credentialStatus: "missing" },
  });
  await assertWarmupPaused("sender@brand.com");
  expect(mailboxes).not.toHaveBeenCalled();
  mailboxes.mockResolvedValue({
    success: false,
    error: new IntegrationError("warmbly", "unavailable", "offline"),
  });
  await expect(assertWarmupPaused("sender@brand.com")).rejects.toThrow(
    "unavailable",
  );
})();
await (async () => {
  reset();
  metadata.mockResolvedValue({
    success: true,
    data: { configured: false, configuration: {}, credentialStatus: "missing" },
  });
  pending.mockResolvedValueOnce({ success: true, data: true });
  await expect(assertWarmupPaused("sender@brand.com")).rejects.toThrow(
    "pending warmup action",
  );
  pending.mockResolvedValueOnce({
    success: false,
    error: new Error("database unavailable"),
  });
  await expect(assertWarmupPaused("sender@brand.com")).rejects.toThrow(
    "pending warmup action",
  );
  expect(metadata).not.toHaveBeenCalled();
  expect(mailboxes).not.toHaveBeenCalled();
})();

console.log("Warmup delivery guards passed");
