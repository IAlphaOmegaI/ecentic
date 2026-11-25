import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("sequence failures retain definitive and uncertain dispositions", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      "test",
      resolve(
        import.meta.dir,
        "fixtures/outbound-sequence-failures.fixture.ts",
      ),
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

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "sequence refresh checkpoints providers and renews only unchanged automatic approvals",
  async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "run",
        resolve(
          import.meta.dir,
          "fixtures/outbound-sequence-refresh.fixture.ts",
        ),
      ],
      { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
    );
    const [status, output, error] = await Promise.all([
      execution.exited,
      new Response(execution.stdout).text(),
      new Response(execution.stderr).text(),
    ]);
    expect(error).toBe("");
    expect(status).toBe(0);
    expect(output).toContain("Sequence refresh coordinator contracts passed");
  },
  30000,
);

test("sequence product refresh checks the original raw product and respects denied access", async () => {
  const execution = Bun.spawn(
    [
      process.execPath,
      "run",
      resolve(import.meta.dir, "fixtures/outbound-sequence-product.fixture.ts"),
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
  expect(output).toContain("Sequence product refresh contracts passed");
}, 30000);
