import { getLocale, getMessages } from "next-intl/server";
import { StoreCheckForm } from "./form";

export const StoreCheck = async ({
  secondaryAction,
}: StoreCheck.Props = {}) => {
  const [locale, { interactiveStore }] = await Promise.all([
    getLocale(),
    getMessages(),
  ]);
  return (
    <StoreCheckForm
      copy={interactiveStore}
      locale={locale}
      secondaryAction={secondaryAction}
    />
  );
};

export namespace StoreCheck {
  export type Props = Pick<StoreCheckForm.Props, "secondaryAction">;
}
