import { describe, expect, test } from "bun:test";
import {
  hasFreshSession,
  storeDisconnectBlocker,
} from "../utils/account-lifecycle";

describe("destructive account operations", () => {
  test("require a session younger than five minutes and reject invalid/future timestamps", () => {
    const now = Date.UTC(2026, 10, 12);
    expect(hasFreshSession(new Date(now - 299_999), now)).toBe(true);
    expect(hasFreshSession(new Date(now - 300_000), now)).toBe(false);
    expect(hasFreshSession("invalid", now)).toBe(false);
    expect(hasFreshSession(new Date(now + 1), now)).toBe(false);
  });
  test("never expose another owner's connection state", () => {
    expect(
      storeDisconnectBlocker({
        actor: "attacker",
        owner: "owner",
        googleConnected: true,
        shopifyUsageLine: "usage",
      }),
    ).toBe("notFound");
    expect(
      storeDisconnectBlocker({ actor: "attacker", googleConnected: false }),
    ).toBe("notFound");
  });
  test("keeps Shopify billing credentials and Google cleanup reachable until disconnected properly", () => {
    expect(
      storeDisconnectBlocker({
        actor: "owner",
        owner: "owner",
        googleConnected: false,
        shopifyUsageLine: "usage",
      }),
    ).toBe("shopifyBilling");
    expect(
      storeDisconnectBlocker({
        actor: "owner",
        owner: "owner",
        googleConnected: true,
      }),
    ).toBe("googleConnected");
    expect(
      storeDisconnectBlocker({
        actor: "owner",
        owner: "owner",
        googleConnected: false,
      }),
    ).toBeNull();
  });
});
