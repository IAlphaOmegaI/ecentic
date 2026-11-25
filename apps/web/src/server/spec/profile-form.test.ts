import { expect, test } from "bun:test";

// Keep UI routing/action mocks isolated from the action-boundary suites.
test("account forms retain stable job titles in localized controls", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/profile-form.fixture.tsx"],
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
