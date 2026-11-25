import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("shopping models receive request values as prompt data", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "test",
      resolve(import.meta.dir, "fixtures/ai-instructions.fixture.ts"),
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
