import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("drafting uses the proven Azure chat wire with bounded output and no retries", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "run",
      resolve(import.meta.dir, "fixtures/outbound-azure-draft.fixture.ts"),
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
  expect(output).toContain("Azure draft wire contracts passed");
}, 30000);
