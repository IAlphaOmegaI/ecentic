import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("HubSpot daily history protection is explicitly enabled, bounded, additive and fenced", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      resolve(import.meta.dir, "fixtures/outbound-hubspot-daily.fixture.ts"),
    ],
    {
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [status, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(output + error).toContain("HubSpot daily lifecycle passed");
  expect(status).toBe(0);
}, 120000);
