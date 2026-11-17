import { expect, test } from "bun:test";
import {
  readClaudeRequestId,
  writeClaudeRequestId,
} from "./claude-request-storage";

const campaignId = "2c43ecf1-d451-4669-877a-dcc41c27d8f1";
const anotherCampaignId = "890fbde5-da78-43bf-ac1c-128862f58f4c";
const requestId = "36dafb21-8c88-488e-ac5c-7ebfbb5b9652";
const anotherRequestId = "7b01339f-71cb-450f-a6c3-e1a18f32637a";

const storage = () => {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
  };
};

test("a new page can recover the exact request UUID for its campaign", () => {
  const saved = storage();
  expect(writeClaudeRequestId(campaignId, requestId, () => saved).success).toBe(
    true,
  );
  expect([...saved.entries.values()]).toEqual([requestId]);

  // A fresh accessor represents a remount without any previous React state.
  const loaded = readClaudeRequestId(campaignId, () => ({
    getItem: saved.getItem,
    setItem: saved.setItem,
  }));
  expect(loaded).toEqual({ success: true, data: requestId });
  expect(readClaudeRequestId(anotherCampaignId, () => saved)).toEqual({
    success: true,
    data: null,
  });
});

test("reading a completed request does not remove it, and explicit replacement stays campaign scoped", () => {
  const saved = storage();
  writeClaudeRequestId(campaignId, requestId, () => saved);
  writeClaudeRequestId(anotherCampaignId, anotherRequestId, () => saved);
  expect(readClaudeRequestId(campaignId, () => saved)).toEqual({
    success: true,
    data: requestId,
  });
  expect(readClaudeRequestId(campaignId, () => saved)).toEqual({
    success: true,
    data: requestId,
  });

  writeClaudeRequestId(campaignId, anotherRequestId, () => saved);
  expect(readClaudeRequestId(campaignId, () => saved)).toEqual({
    success: true,
    data: anotherRequestId,
  });
  expect(readClaudeRequestId(anotherCampaignId, () => saved)).toEqual({
    success: true,
    data: anotherRequestId,
  });
});

test("malformed values are ignored and only UUIDs can be persisted", () => {
  const saved = storage();
  saved.setItem(
    `ecentic:outbound:claude-request:${campaignId}`,
    "not-a-request-id",
  );
  expect(readClaudeRequestId(campaignId, () => saved)).toEqual({
    success: true,
    data: null,
  });
  expect(
    writeClaudeRequestId(campaignId, "context or credentials", () => saved)
      .success,
  ).toBe(false);
  expect(saved.entries.size).toBe(1);
});

test("blocked or full browser storage returns a failure without throwing", () => {
  const blocked = () => {
    throw new Error("Storage blocked");
  };
  expect(readClaudeRequestId(campaignId, blocked).success).toBe(false);
  expect(writeClaudeRequestId(campaignId, requestId, blocked).success).toBe(
    false,
  );
  const full = {
    getItem: () => null,
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  };
  expect(writeClaudeRequestId(campaignId, requestId, () => full).success).toBe(
    false,
  );
});
