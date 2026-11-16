import { expect, test } from "bun:test";

// Auth/action mocks stay in a subprocess and cannot contaminate other suites.
test("CSV imports preserve data and report partial results", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/csv-import.fixture.ts"],
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
