import { ArrowRightIcon, FaceSearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IndexSection } from "@/app/[locale]/(main)/_components/index-section";

export const WhoShouldBook = async () => {
  const translate = await getTranslations("demo");
  const messages = await getMessages();
  const body = messages.demo.whoShouldBook.body;
  const items = messages.demo.whoShouldBook.items;

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
