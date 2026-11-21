import { describe, expect, test } from "bun:test";
import { readSmokeReport, smokeEnvironment } from "../../../scripts/test/smoke";
import { requireTestDatabase } from "./helpers/database";

describe("smoke execution stays isolated and reports missing coverage", () => {
  test("accepts only the disposable local test server and known fixture names", () => {
    expect(
      requireTestDatabase(
        "postgres://fixture@127.0.0.1:55432/outbound_smoke_123456abcdef",
      ),
    ).toContain("55432");
    for (const endpoint of [
      undefined,
      "postgres://example.com:55432/outbound_test",
      "postgres://localhost:5432/outbound_test",
      "postgres://localhost:55432/production",
      "postgres://localhost:55432/outbound_test?host=example.com",
      "postgres://localhost:55432/outbound_test#override",
      "https://localhost:55432/outbound_test",
    ])
      expect(() => requireTestDatabase(endpoint)).toThrow();
  });

  test("child fixtures inherit only synthetic credentials and offline settings", () => {
    const endpoint =
      "postgres://fixture@127.0.0.1:55432/outbound_smoke_123456abcdef";
    const environment = smokeEnvironment(endpoint, {
      PATH: "/bin",
      DATABASE_URL: "production-database",
      AZURE_API_KEY: "live-model-key",
      OUTBOUND_APOLLO_API_KEY: "live-provider-key",
      CREDENTIAL_ENCRYPTION_KEY: "live-encryption-key",
      NODE_OPTIONS: "--require=unsafe.js",
      BUN_OPTIONS: "--env-file=production.env",
    });
    expect(JSON.stringify(environment)).not.toMatch(/production|live-|unsafe/);
    expect(environment.DATABASE_URL).toBe(endpoint);
    expect(environment.OUTBOUND_TEST_DATABASE_URL).toBe(endpoint);
    expect(environment.BUN_OPTIONS).toContain("--no-env-file --preload=");
    expect(environment.PATH).toBe("/bin");
  });

  test("a skipped, empty or missing JUnit suite cannot pass smoke", () => {
    expect(
      readSmokeReport(
        '<testsuites tests="2" failures="0" skipped="0"><testsuite /></testsuites>',
      ).valid,
    ).toBe(true);
    expect(
      readSmokeReport(
        '<testsuites tests="2" failures="0" skipped="1"><testsuite><skipped /></testsuite></testsuites>',
      ).valid,
    ).toBe(false);
    expect(
      readSmokeReport(
        '<testsuites tests="2" failures="1" skipped="0"><testsuite /></testsuites>',
      ).valid,
    ).toBe(false);
    expect(() =>
      readSmokeReport('<testsuites tests="0" failures="0" skipped="0" />'),
    ).toThrow();
    expect(() => readSmokeReport("No tests found")).toThrow();
  });

  test("fixture subprocesses inherit HTTP and non-database socket guards", async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        "-e",
        `
      import { Socket } from "node:net";
      const http = await fetch("http://127.0.0.1:1").then(() => false, (error) => error.message.includes("cannot call live HTTP"));
      const tcp = (() => { try { new Socket().connect({ host: "127.0.0.1", port: 1 }); return false; } catch (error) { return error.message.includes("cannot open network sockets"); } })();
      console.log(JSON.stringify({ http, tcp }));
    `,
      ],
      {
        env: smokeEnvironment(
          "postgres://fixture@127.0.0.1:55432/outbound_smoke_123456abcdef",
          process.env,
        ),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [status, output, error] = await Promise.all([
      execution.exited,
      new Response(execution.stdout).text(),
      new Response(execution.stderr).text(),
    ]);
    expect(status).toBe(0);
    expect(error).toBe("");
    expect(JSON.parse(output)).toEqual({ http: true, tcp: true });
  });
});
