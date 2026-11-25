import { expect, test } from "bun:test";

// Integration coverage needs local PostgreSQL binaries, never DATABASE_URL.
const available = Boolean(Bun.which("initdb") && Bun.which("pg_ctl"));

test.skipIf(!available)(
  "storefront state adopts legacy rows and keeps atomic storage semantics",
  async () => {
    const process = Bun.spawn(
      ["bun", "test", "./src/server/spec/fixtures/storefront-state.fixture.ts"],
      {
        cwd: new URL("../../..", import.meta.url).pathname,
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    expect({ code, output: code === 0 ? "passed" : stdout + stderr }).toEqual({
      code: 0,
      output: "passed",
    });
  },
  45_000,
);
