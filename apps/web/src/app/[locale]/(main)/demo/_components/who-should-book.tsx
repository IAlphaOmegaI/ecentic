import { ArrowRightIcon, FaceSearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IndexSection } from "@/app/[locale]/(main)/_components/index-section";

export const WhoShouldBook = async () => {
  const translate = await getTranslations("demo");
  const body = translate.raw("whoShouldBook.body") as readonly string[];
  const items = translate.raw("whoShouldBook.items") as readonly {
    title: string;
    description: string;
  }[];

  return (
    <IndexSection
      number={translate("whoShouldBook.number")}
      icon={FaceSearchIcon}
      title={translate("whoShouldBook.title")}
      description={translate("whoShouldBook.description")}
      body={body}
      label={translate("whoShouldBook.label")}
      items={items}
      accent={
        <Button
          color="accent"
          className="w-fit"
          render={<Link href="/sign-up" />}
        >
          {translate("whoShouldBook.action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    />
  );
};
