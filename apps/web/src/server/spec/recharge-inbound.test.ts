import { expect, test } from "bun:test";

test("Shopify paid-order and privacy webhooks require signatures and preserve retry failures", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "test",
      "./src/server/spec/fixtures/recharge-inbound.fixture.ts",
    ],
    {
      cwd: new URL("../../..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(execution.stdout).text(),
    new Response(execution.stderr).text(),
    execution.exited,
  ]);
  expect({ code, output: code === 0 ? "passed" : stdout + stderr }).toEqual({
    code: 0,
    output: "passed",
  });
}, 15000);
