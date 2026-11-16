import { expect, test } from "bun:test";

// Action/auth mocks remain isolated from the rest of the server test suite.
test("command search matches the full owned catalog with bounded results", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/command-search.fixture.ts"],
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
