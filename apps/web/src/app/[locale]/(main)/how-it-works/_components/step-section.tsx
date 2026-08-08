import type { Icon } from "@zenncore/icons";
import type { ReactNode } from "react";
import { IndexSection } from "@/app/[locale]/(main)/_components/index-section";

export const StepSection = ({
  id,
  number,
  icon,
  title,
  subheading,
  paragraph,
  itemsLabel,
  items,
  accent,
}: StepSection.Props) => (
  <IndexSection
    id={id}
    number={number}
    icon={icon}
    title={title}
    description={subheading}
    body={[paragraph]}
    label={itemsLabel}
    items={items}
    accent={accent}
  />
);

export namespace StepSection {
  export type Props = {
    id: string;
    number: string;
    icon: Icon;
    title: string;
    subheading: string;
    paragraph: string;
    itemsLabel: string;
    items: readonly IndexSection.Item[];
    accent?: ReactNode;
  };
}
