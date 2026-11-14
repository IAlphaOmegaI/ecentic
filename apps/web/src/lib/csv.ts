import type * as CsvIntegration from "@/server/app/integration/csv";

/** Reads quoted cells, escaped quotes and multiline descriptions as one record. */
const csvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  const cursor = { cell: "", row: [] as string[], quoted: false, skip: false };
  const finishCell = () => {
    cursor.row.push(cursor.cell.trim());
    cursor.cell = "";
  };
  Array.from(text).forEach((character, index, characters) => {
    if (cursor.skip) {
      cursor.skip = false;
      return;
    }
    switch (true) {
      case character === '"' && cursor.quoted && characters[index + 1] === '"':
        cursor.cell += '"';
        cursor.skip = true;
        break;
      case character === '"':
        cursor.quoted = !cursor.quoted;
        break;
      case character === "," && !cursor.quoted:
        finishCell();
        break;
      case (character === "\n" || character === "\r") && !cursor.quoted:
        finishCell();
        rows.push(cursor.row);
        cursor.row = [];
        cursor.skip = character === "\r" && characters[index + 1] === "\n";
        break;
      default:
        cursor.cell += character;
    }
  });
  finishCell();
  rows.push(cursor.row);
  return rows;
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
  const lines = csvRows(text.trim().replace(/^\uFEFF/, ""));
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? []).map((header) =>
    header.toLowerCase().replace(/['"]/g, ""),
  );

  return lines.slice(1).flatMap((values) => {
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
        currency: row.currency,
        image: row.image ?? row.image_link ?? row.image_url,
        url: row.url ?? row.link,
        sku: row.sku,
        id: row.id,
      },
    ];
  });
};

/** CSV currency is explicit data. A currency symbol alone is ambiguous. */
export const csvPrice = (raw?: string, explicitCurrency?: string) => {
  const amount = raw?.trim() ?? "";
  const leading = amount.match(/^([A-Z]{3})\s+([\d.,]+)$/i);
  const trailing = amount.match(/^([\d.,]+)\s+([A-Z]{3})$/i);
  const supplied = explicitCurrency?.trim().toUpperCase();
  const embedded = leading?.[1] ?? trailing?.[2];
  const currency =
    supplied && /^[A-Z]{3}$/.test(supplied)
      ? supplied
      : (embedded?.toUpperCase() ?? null);
  return {
    price: amount
      ? (leading?.[2] ??
        trailing?.[1] ??
        (amount.replace(/^[^\d]*/, "") || amount))
      : null,
    currency,
  };
};
