import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("public comparison validates reads and reports real evaluation outcomes", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "test",
      resolve(import.meta.dir, "fixtures/compare-boundary.fixture.ts"),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [status, output, error] = await Promise.all([
    execution.exited,
    new Response(execution.stdout).text(),
    new Response(execution.stderr).text(),
  ]);
  expect({ status, output: status === 0 ? "passed" : output + error }).toEqual({
    status: 0,
    output: "passed",
  });
});
