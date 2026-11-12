import { expect, test } from "bun:test";

// Bun's module mocks are process-global. Keep auth/database mocks in their own
// runner so this regression test cannot replace dependencies of other suites.
test("lifecycle actions enforce authorization and transaction boundaries", async () => {
  const process = Bun.spawn(
    [
      "bun",
      "test",
      "./src/server/spec/fixtures/account-lifecycle-actions.fixture.ts",
    ],
    {
      cwd: new URL("../../..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  expect({ code, output: code === 0 ? "passed" : stdout + stderr }).toEqual({
    code: 0,
    output: "passed",
  });
}, 15_000);
