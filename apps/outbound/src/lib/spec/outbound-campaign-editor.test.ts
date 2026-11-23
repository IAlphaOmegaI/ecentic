import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("campaign forms preserve edits, wait for saved props and reject stale criteria", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "run",
      resolve(import.meta.dir, "fixtures/outbound-campaign-editor.fixture.tsx"),
    ],
    {
      env: {
        ...process.env,
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
  expect(output).toContain("Campaign editor DOM contracts passed");
}, 30000);
