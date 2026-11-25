import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("async actions preserve completion, failures and pending state", async () => {
  // Bun module mocks are global: keep the hook scheduler in its own process.
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "test",
      resolve(import.meta.dir, "fixtures/async-action.fixture.ts"),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [status, output, error] = await Promise.all([
    execution.exited,
    new Response(execution.stdout).text(),
    new Response(execution.stderr).text(),
  ]);
  expect({ status, output, error }, error).toMatchObject({ status: 0 });
}, 15_000);
