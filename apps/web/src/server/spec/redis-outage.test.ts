import { expect, test } from "bun:test";

/**
 * The suite needs `withContext` for real, and module mocks outlive a spec file in
 * this process: a module that first loads under another spec's narrower mock of
 * Sentry or the repository keeps it, whichever order the files happen to run in.
 * So it gets a process of its own, the way the no-client case in
 * `rate-limit-fail-open.test.ts` does. The file is not named `.test.ts`, so a plain
 * run does not also load it here.
 */
test("every limiter behaves with Redis up and with Redis gone", async () => {
  const child = Bun.spawn(
    [process.execPath, "test", `${import.meta.dir}/redis-outage.suite.ts`],
    { stdout: "pipe", stderr: "pipe" },
  );

  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (code !== 0) throw new Error(`${stdout}\n${stderr}`);

  // Bun writes its summary to stderr. A suite that loads nothing also exits clean.
  expect(stderr).toMatch(/\b[1-9]\d* pass\b/);
  expect(stderr).toContain(" 0 fail");
}, 30_000);
