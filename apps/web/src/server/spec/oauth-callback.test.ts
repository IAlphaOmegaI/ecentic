import { expect, test } from "bun:test";

// Keep mocked auth, cookies and mail isolated from the other server suites.
test("auth callbacks and sign-out preserve localized destinations and safe failure handling", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/oauth-callback.fixture.tsx"],
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
