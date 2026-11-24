import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  configuration,
  RechargeLifecycleError,
} from "../app/integration/recharge/types";

const VARIABLES = [
  "NODE_ENV",
  "APP_HOST",
  "RECHARGE_CLIENT_ID",
  "RECHARGE_CLIENT_SECRET",
  "RECHARGE_REDIRECT_URI",
] as const;
const environment = process.env as Record<string, string | undefined>;
const original = { ...process.env };
const CALLBACK = "https://www.ecentic.ai/api/integrations/recharge/callback";

const setVariable = (name: string, value: string | undefined) => {
  if (value === undefined) delete environment[name];
  else environment[name] = value;
};

beforeEach(() => {
  setVariable("NODE_ENV", "production");
  setVariable("APP_HOST", "https://ecentic.ai");
  setVariable("RECHARGE_CLIENT_ID", "recharge-test-client");
  setVariable("RECHARGE_CLIENT_SECRET", "recharge-test-secret");
  setVariable("RECHARGE_REDIRECT_URI", CALLBACK);
});

afterEach(() => {
  for (const name of VARIABLES) setVariable(name, original[name]);
});

describe("Recharge callback configuration", () => {
  test("uses the canonical app host for webhooks while preserving the registered OAuth callback", () => {
    const settings = configuration();

    // www redirects to the apex host in production; webhook POSTs must reach
    // their handler directly, while OAuth requires its registered exact URI.
    expect(settings.origin).toBe("https://ecentic.ai");
    expect(settings.redirectUri).toBe(CALLBACK);
  });

  test("falls back to the registered callback origin when APP_HOST is absent", () => {
    setVariable("APP_HOST", undefined);

    const settings = configuration();
    expect(settings.origin).toBe("https://www.ecentic.ai");
    expect(settings.redirectUri).toBe(CALLBACK);
  });

  test("rejects an insecure production app host even with a secure OAuth callback", () => {
    setVariable("APP_HOST", "http://ecentic.ai");

    expect(configuration).toThrow(RechargeLifecycleError);
  });
});
