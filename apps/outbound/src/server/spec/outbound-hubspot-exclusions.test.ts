import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("HubSpot exclusion pull is explicit, bounded and additive with durable last-good proof", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      resolve(
        import.meta.dir,
        "fixtures/outbound-hubspot-exclusions.fixture.ts",
      ),
    ],
    { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
  );
  const [status, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(output + error).toContain("HubSpot preview/apply lifecycle passed");
  expect(status).toBe(0);
}, 120000);
