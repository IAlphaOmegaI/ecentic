import { expect, test } from "bun:test";
import { resolve } from "node:path";

test.each(["google-merchant-reads", "google-merchant-account"])(
  "%s preserves ownership and read failures",
  async (fixture) => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        "test",
        resolve(import.meta.dir, `fixtures/${fixture}.fixture.ts`),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [status, output, error] = await Promise.all([
      execution.exited,
      new Response(execution.stdout).text(),
      new Response(execution.stderr).text(),
    ]);
    expect({
      status,
      output: status === 0 ? "passed" : output + error,
    }).toEqual({
      status: 0,
      output: "passed",
    });
  },
);
