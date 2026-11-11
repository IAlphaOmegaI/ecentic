import { getMessages } from "next-intl/server";
import {
  AnnotatedCodeComparison,
  type CodeRecord,
} from "@/components/marketing/interactive/code-comparison";

export const ProductExample = async ({
  content,
  kind,
}: ProductExample.Props) => {
  const { reviewCode } = await getMessages();
  const annotations = reviewCode.platform[kind];
  const rows = content.rows.map((row, index) => ({
    key: annotations[index]?.key ?? row.label,
    before: row.before,
    after: row.after,
    note: annotations[index]?.note ?? row.label,
  }));
  const connectRows = rows.map((row, index): CodeRecord.Row => {
    if (index === 0)
      return {
        ...row,
        key: "product",
        before: {
          title: row.before,
          description: null,
          identifiers: { gtin: null },
        },
        after: {
          title: row.after,
          description: null,
          identifiers: { gtin: null },
        },
      };
    if (index === 1)
      return {
        ...row,
        key: "source",
        before: { format: "CSV", location: row.before, imported: false },
        after: { format: "CSV", location: row.after, imported: true },
      };
    return {
      ...row,
      key: "write_access",
      before: { connector: null, publish: false, store_listing_changed: false },
      after: { connector: null, publish: false, store_listing_changed: false },
    };
  });
  return (
    <AnnotatedCodeComparison
      title={content.product}
      sampleLabel={content.label}
      before={content.before}
      after={content.after}
      filename={`${kind}-example.json`}
      note={`${content.note} ${reviewCode.recordNote}`}
      rows={kind === "connect" ? connectRows : rows}
    />
  );
};

export namespace ProductExample {
  export type Props = {
    kind: "connect" | "simulate" | "fix" | "track";
    content: {
      label: string;
      product: string;
      before: string;
      after: string;
      note: string;
      rows: readonly { label: string; before: string; after: string }[];
    };
  };
}
