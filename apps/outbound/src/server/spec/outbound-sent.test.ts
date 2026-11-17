import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { parseSentQuery, sentHref } from "@/lib/outbound-sent";

test("sent filters sanitize search and preserve campaign and prospect links", () => {
  const prospect = "1a7e12aa-358f-40d3-91fa-0d4f9e4eabdd";
  expect(
    parseSentQuery({
      q: "  cream\u0000  ",
      page: "-9",
      kind: "bad",
      status: "delivered",
      prospect,
    }),
  ).toEqual({ q: "cream", page: 1, kind: "all", status: "all", prospect });
  expect(sentHref({ prospect, status: "bounced", kind: "test" })).toBe(
    `/sent?status=bounced&kind=test&prospect=${prospect}`,
  );
});

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "sent queries use immutable content and distinguish outcomes with bounded pagination",
  async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "run",
        resolve(import.meta.dir, "fixtures/outbound-sent.fixture.ts"),
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
    expect(output).toContain("Sent query contracts passed");
  },
  30000,
);
