import type { useMessages } from "next-intl";
import type { MarketingPage } from "@/components/marketing/page";
import { SolutionRoadmap } from "../solution-roadmap";

export const RetailersCatalogRoutes = ({
  items,
  content,
}: RetailersCatalogRoutes.Props) => (
  <SolutionRoadmap
    label={content.capability}
    items={items.map((item, index) => ({
      title: item.title,
      body: item.body,
      href: item.href,
      action: item.label,
      path: [
        `${content.dataLabel}: ${content.routes[index]?.data ?? ""}`,
        `${content.decisionLabel}: ${content.routes[index]?.decision ?? ""}`,
      ],
      figure: index === 0 ? "drawer" : index === 1 ? "format" : "hub",
    }))}
  />
);

export namespace RetailersCatalogRoutes {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    content: ReturnType<typeof useMessages>["retailersPage"]["catalog"];
  };
}
