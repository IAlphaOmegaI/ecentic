import { describe, expect, test } from "bun:test";
// Imported through the package's own name, so the export map is what resolves it.
import { typeOptions } from "@zenncore/config/tsdown/presets";
import { createTsdownConfig, type TsdownConfig } from "../tsdown/config.ts";

const resolve = async (options: TsdownConfig) => {
  const config = await createTsdownConfig(options)({}, { ci: false });
  return Array.isArray(config) ? config : [config];
};

describe("createTsdownConfig typeOnly", () => {
  test("emits declarations only when it is true", async () => {
    const [config] = await resolve({ typeOnly: true });

    expect(config).toMatchObject(typeOptions);
  });

  test("builds JavaScript and declarations when it is false", async () => {
    const [config] = await resolve({ typeOnly: false });

    expect(config?.dts).toBe(true);
    expect(config).not.toHaveProperty("minify");
    expect(config).not.toHaveProperty("sourcemap");
  });

  test("builds the same when it is false as when it is left out", async () => {
    const [disabled] = await resolve({ typeOnly: false });
    const [omitted] = await resolve({});

    expect(disabled).toEqual(omitted);
  });

  test("applies to each entry of an array on its own", async () => {
    const [scripts, types] = await resolve([
      { typeOnly: false },
      { typeOnly: true },
    ]);

    expect(scripts?.dts).toBe(true);
    expect(types).toMatchObject(typeOptions);
  });
});

describe("@zenncore/config/tsdown/presets", () => {
  test("is exported and serves the declaration-only preset", () => {
    expect(typeOptions).toEqual({
      minify: false,
      sourcemap: false,
      dts: { emitDtsOnly: true },
    });
  });
});
