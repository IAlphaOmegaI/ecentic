export type Row = readonly (string | number | null | undefined)[];

const escapeCell = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const serialize = (headers: readonly string[], rows: readonly Row[]) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
