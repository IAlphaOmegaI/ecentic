import { expect, test } from "bun:test";

test("Shopify checkout enforces ownership, exact variant plans and signed receipts", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "test",
      "./src/server/spec/fixtures/recharge-checkout.fixture.ts",
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
