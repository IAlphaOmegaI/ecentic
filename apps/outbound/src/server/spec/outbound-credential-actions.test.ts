import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("credential actions enforce staff access and serialize only safe results", async () => {
  // Keep the imported database module out of this runner's shared module cache.
  const execution = Bun.spawn(
    [
      process.execPath,
      "run",
      resolve(
        import.meta.dir,
        "fixtures/outbound-credential-actions.fixture.ts",
      ),
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
  expect(output).toContain("Credential action authorization passed");
}, 15000);
