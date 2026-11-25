import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("discovery route distinguishes validation and engine failures", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "test",
      resolve(import.meta.dir, "fixtures/discovery-route.fixture.ts"),
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
