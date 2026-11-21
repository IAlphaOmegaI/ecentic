import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("page reads keep bounded projections, preparation freshness and staff authorization", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "run",
      resolve(import.meta.dir, "fixtures/outbound-page-reads.fixture.ts"),
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
  expect(output).toContain(
    "Page reads preserve projections and staff authorization",
  );
}, 15000);
