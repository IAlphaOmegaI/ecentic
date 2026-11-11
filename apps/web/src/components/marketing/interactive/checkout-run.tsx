import { getMessages } from "next-intl/server";
import { CheckoutRunClient } from "./checkout-run-client";

export const CheckoutRun = async () => {
  const { interactiveCheckout } = await getMessages();
  return <CheckoutRunClient copy={interactiveCheckout} />;
};
