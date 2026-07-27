import { ArrowRightIcon, FaceSearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { IndexSection } from "@/app/(main)/_components/index-section";

const fits = [
  {
    title: "Managing competitive catalogs",
    description:
      "Large or competitive categories where missing attributes quietly cost selection.",
  },
  {
    title: "Comparing tool categories",
    description:
      "Weighing agent-commerce optimization against content generators or analytics tools.",
  },
  {
    title: "Running multiple stores",
    description: "Considering a custom Enterprise setup across brands.",
  },
  {
    title: "Short on time",
    description:
      "You want the diagnosis explained in plain language, not another report to read.",
  },
] as const;

const body = [
  "A demo is the fastest path when you want a second set of eyes on the results rather than reading the report alone.",
  "Rather see your numbers first? The free Scan runs the same simulation on your top 10 products in about two minutes.",
] as const;

export const WhoShouldBook = () => (
  <IndexSection
    number="02"
    icon={FaceSearchIcon}
    title="Who should book."
    description="The call is most useful when you have a real catalog to look at and a reason to act on the results."
    body={body}
    label="The call helps most when you are"
    items={fits}
    accent={
      <Button
        color="accent"
        className="w-fit"
        render={<Link href="/sign-up" />}
      >
        Run the free scan
        <ArrowRightIcon className="size-4" />
      </Button>
    }
  />
);
