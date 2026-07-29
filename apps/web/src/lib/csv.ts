import type * as CsvIntegration from "@/server/app/integration/csv";

/**
 * Splits one CSV line on commas, honouring double-quoted cells so a quoted
 * description containing commas stays a single value.
 */
const splitRow = (line: string): string[] => {
  const values: string[] = [];
  const cursor = { cell: "", quoted: false };

  for (const char of line) {
    switch (true) {
      case char === '"':
        cursor.quoted = !cursor.quoted;
        break;
      case char === "," && !cursor.quoted:
        values.push(cursor.cell.trim());
        cursor.cell = "";
        break;
      default:
        cursor.cell += char;
    }
  }

  values.push(cursor.cell.trim());
  return values;
};

/**
 * Parses a product CSV into the shape `Csv.syncProducts` expects. Shared by the
 * onboarding connect step and the per-store "Add products" import, so both
 * accept the same column aliases — Google Shopping exports use `name`,
 * `image_link`, and `link` where our own template uses `title`, `image`, `url`.
 *
 * Rows without a title are dropped: they can't be scanned or matched against a
 * competitor, so importing them would only pad the catalog.
 */
export const parseCsvProducts = (text: string): CsvIntegration.Type[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitRow(lines[0] ?? "").map((header) =>
    header.toLowerCase().replace(/['"]/g, ""),
  );

  return lines.slice(1).flatMap((line) => {
    const values = splitRow(line);
    if (values.every((value) => value === "")) return [];

    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ) as CsvIntegration.Type & {
      name?: string;
      image_link?: string;
      image_url?: string;
      link?: string;
    };

    const title = row.title ?? row.name;
    if (!title) return [];

    return [
      {
        title,
        description: row.description,
        price: row.price,
        image: row.image ?? row.image_link ?? row.image_url,
        url: row.url ?? row.link,
        sku: row.sku,
        id: row.id,
      },
    ];
  });
};
