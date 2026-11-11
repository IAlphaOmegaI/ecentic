import { getLocale, getMessages } from "next-intl/server";
import { StoreCheckForm } from "./form";

export const StoreCheck = async () => {
  const [locale, { interactiveStore }] = await Promise.all([
    getLocale(),
    getMessages(),
  ]);
  return <StoreCheckForm copy={interactiveStore} locale={locale} />;
};
