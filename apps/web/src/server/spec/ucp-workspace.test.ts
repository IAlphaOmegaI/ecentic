import { expect, test } from "bun:test";

// Exercise the server page assembly with isolated store/repository responses.
test("the UCP workspace keeps publishing attached to the requested store", async () => {
  const process = Bun.spawn(
    ["bun", "test", "./src/server/spec/fixtures/ucp-workspace.fixture.ts"],
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
