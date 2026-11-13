type Schema = Record<string, unknown>;

/**
 * JSON for an inline `<script>`. `JSON.stringify` leaves `<` alone, so a
 * string holding `</script>` (a blog FAQ explaining structured data, say) would
 * close the tag and run whatever followed; `\u003c` is the same character to
 * every JSON-LD reader.
 */
export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

// Renders one <script type="application/ld+json"> per schema object instead of
// a single top-level array. Some browsers/extensions run their own structured-data
// parsers over the page and assume each ld+json script is a single object with
// "@context" at the top — a top-level array crashes that external code.
export const JsonLd = ({ schemas }: JsonLd.Props) => (
  <>
    {schemas.map((schema) => (
      <script
        // Stable and unique: identical to the content rendered, so two schemas
        // never collide unless their JSON-LD payloads are byte-for-byte the same.
        key={JSON.stringify(schema)}
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
    ))}
  </>
);

export namespace JsonLd {
  export type Props = {
    schemas: Schema[];
  };
}
