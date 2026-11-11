import { getMessages } from "next-intl/server";
import { AnnotatedCodeComparison } from "@/components/marketing/interactive/code-comparison";

export const ProductExample = async ({
  content,
  kind,
}: ProductExample.Props) => {
  const { reviewCode } = await getMessages();
  const annotations = reviewCode.platform[kind];
  return (
    <AnnotatedCodeComparison
      title={content.product}
      sampleLabel={content.label}
      before={content.before}
      after={content.after}
      filename={`${kind}-example.json`}
      note={`${content.note} ${reviewCode.recordNote}`}
      rows={content.rows.map((row, index) => ({
        key: annotations[index]?.key ?? row.label,
        before: row.before,
        after: row.after,
        note: annotations[index]?.note ?? row.label,
      }))}
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
