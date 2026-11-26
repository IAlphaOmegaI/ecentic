import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("composeSequence repairs once and preserves research without network or purchases", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      resolve(import.meta.dir, "fixtures/outbound-compose-sequence.fixture.ts"),
    ],
    {
      env: {
        PATH: process.env["PATH"] ?? "/usr/bin:/bin",
        NODE_ENV: "test",
        DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/never_connect",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [status, output, error] = await Promise.all([
    execution.exited,
    new Response(execution.stdout).text(),
    new Response(execution.stderr).text(),
  ]);
  expect(error).toBe("");
  expect(status).toBe(0);
  expect(output).toContain("Synthetic composeSequence contracts passed");
}, 30000);
