import { describe, expect, test } from "bun:test";

// Use the installed Flight codec in a separate React-server runtime. Mocking a
// Server Action as a normal function cannot detect arguments changed in transit.
const roundtrip = () => {
  const child = Bun.spawnSync(
    [
      process.execPath,
      "--conditions",
      "react-server",
      "-e",
      `
        import { Environment } from "./src/server/utils/environment";
        import { conversationStageSchema } from "./src/lib/outbound-conversations";
        import { mock } from "bun:test";
        // Next's navigation entry imports client contexts outside its bundler.
        // The fixture never redirects, so only that control-flow hook is inert.
        mock.module("next/navigation", () => ({ unstable_rethrow: () => {} }));
        const { withInstrumentation } = await import("./src/server/utils/context");
        const client = require("next/dist/compiled/react-server-dom-webpack/client.edge");
        const server = require("next/dist/compiled/react-server-dom-webpack/server.edge");
        const input = {
          id: "286434b7-f9ac-4e81-ae64-473c2ea52601",
          stage: "interested",
          expectedRevision: 7,
        };
        let calls = 0;
        const action = withInstrumentation(async (_, payload) => {
          const parsed = conversationStageSchema.parse(payload);
          calls += 1;
          return { success: true, data: parsed };
        });
        const invoke = async (args) => {
          const encoded = await client.encodeReply(args, {
            temporaryReferences: client.createTemporaryReferenceSet(),
          });
          const decoded = await server.decodeReply(encoded, {}, {
            temporaryReferences: server.createTemporaryReferenceSet(),
          });
          return {
            result: await action(...decoded),
            argumentType: typeof decoded[0],
          };
        };
        const legacySymbol = await invoke([Symbol("client"), input]);
        const explicit = await invoke([Environment.CLIENT, input]);
        const implicit = await invoke([input]);
        console.log(JSON.stringify({ input, legacySymbol, explicit, implicit, calls }));
      `,
    ],
    {
      cwd: new URL("../../..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  if (child.exitCode !== 0)
    throw new Error(new TextDecoder().decode(child.stderr));
  return JSON.parse(new TextDecoder().decode(child.stdout)) as {
    input: { id: string; stage: string; expectedRevision: number };
    legacySymbol: { result: { success: boolean }; argumentType: string };
    explicit: {
      result: { success: boolean; data: unknown };
      argumentType: string;
    };
    implicit: {
      result: { success: boolean; data: unknown };
      argumentType: string;
    };
    calls: number;
  };
};

describe("Outbound Server Action transport", () => {
  test("the client marker survives real Flight transport without shifting the stage payload", () => {
    const result = roundtrip();
    // This is the original failure: Flight restores symbols as opaque functions.
    expect(result.legacySymbol.argumentType).toBe("function");
    expect(result.legacySymbol.result.success).toBe(false);
    expect(result.explicit.argumentType).toBe("string");
    expect(result.explicit.result).toEqual({
      success: true,
      data: result.input,
    });
    expect(result.implicit.result).toEqual({
      success: true,
      data: result.input,
    });
    expect(result.calls).toBe(2);
  });
});
