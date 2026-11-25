export type Row = readonly (string | number | null | undefined)[];

const encode = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const serialize = (headers: readonly string[], rows: readonly Row[]) =>
  [headers, ...rows].map((row) => row.map(encode).join(",")).join("\r\n");
