import type { TranslationGeneration } from "./runner";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const assertDatabaseSafeText = (value: unknown): void => {
  if (typeof value === "string") {
    // PostgreSQL JSONB rejects NUL and lone UTF-16 surrogates. Reject the
    // response, not just the unit: even a rejected target or finding is stored.
    if (value.includes("\0") || /[\uD800-\uDFFF]/u.test(value))
      throw new Error(
        "Translation response contains unsupported Unicode text.",
      );
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) assertDatabaseSafeText(entry);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertDatabaseSafeText(key);
      assertDatabaseSafeText(entry);
    }
  }
};

/** Only envelope identifiers change. Prose, code, contexts and group boundaries do not. */
const mapIdentifiers = (
  value: JsonValue,
  identifiers: ReadonlyMap<string, string>,
  field = "",
  includeOriginalId = false,
): JsonValue => {
  if (typeof value === "string") {
    return ["id", "reviewedIds", "requestedIds"].includes(field)
      ? (identifiers.get(value) ?? value)
      : value;
  }
  if (Array.isArray(value))
    return value.map((entry) =>
      mapIdentifiers(entry, identifiers, field, includeOriginalId),
    );
  if (value && typeof value === "object") {
    const { id } = value;
    return Object.fromEntries([
      ...Object.entries(value).map(([key, entry]) => [
        key,
        mapIdentifiers(entry, identifiers, key, includeOriginalId),
      ]),
      ...(includeOriginalId && typeof id === "string" && identifiers.has(id)
        ? [["originalId", id]]
        : []),
    ]);
  }
  return value;
};

/** Long resource keys need not consume the model's generated text budget. */
export const compactTranslationTransport = (request: TranslationGeneration) => {
  const boundary = request.prompt.lastIndexOf("\n") + 1;
  const payload = (() => {
    try {
      return JSON.parse(request.prompt.slice(boundary)) as JsonValue;
    } catch {
      return null;
    }
  })();
  if (!payload)
    return {
      request,
      decode: (value: unknown) => {
        assertDatabaseSafeText(value);
        return value;
      },
    };

  const originalIds = new Set<string>();
  const collect = (value: JsonValue): void => {
    if (Array.isArray(value)) {
      for (const entry of value) collect(entry);
      return;
    }
    if (!value || typeof value !== "object") return;
    const { id } = value;
    if (typeof id === "string") originalIds.add(id);
    for (const entry of Object.values(value)) collect(entry);
  };
  collect(payload);
  const prefix = (() => {
    const candidates = Array.from(
      { length: originalIds.size + 1 },
      (_, index) => `${"_".repeat(index + 1)}t`,
    );
    return (
      candidates.find(
        (candidate) => ![...originalIds].some((id) => id.startsWith(candidate)),
      ) ?? "_translation"
    );
  })();
  const aliases = new Map(
    [...originalIds].map((id, index) => [id, `${prefix}${index}`]),
  );
  const originals = new Map(
    [...aliases].map(([original, alias]) => [alias, original]),
  );
  return {
    request: {
      ...request,
      prompt: `${request.prompt.slice(0, boundary)}${JSON.stringify(mapIdentifiers(payload, aliases, "", true))}`,
      system: `${request.system}\nTransport: return the short id in each requested row. originalId links that row to source-layout slots and context; it is context only and must not appear as an extra output field.`,
    },
    // Unknown IDs remain unknown, so the runner's exact-coverage gate rejects them.
    decode: (value: unknown) => {
      assertDatabaseSafeText(value);
      return mapIdentifiers(value as JsonValue, originals);
    },
  };
};
