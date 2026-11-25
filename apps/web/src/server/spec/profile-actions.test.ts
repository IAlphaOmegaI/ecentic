import { expect, test } from "bun:test";

// Isolate auth/repository mocks from the other Bun suites.
test("profile actions preserve privileges and validate merchant details", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/profile-actions.fixture.ts"],
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
