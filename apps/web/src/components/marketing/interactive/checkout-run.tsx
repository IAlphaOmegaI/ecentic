import { getMessages } from "next-intl/server";
import { CheckoutRunClient } from "./checkout-run-client";

export const CheckoutRun = async ({
  variant = "trace",
}: {
  variant?: "trace" | "code";
} = {}) => {
  const { interactiveCheckout, reviewCode } = await getMessages();
  return (
    <CheckoutRunClient
      copy={interactiveCheckout}
      code={variant === "code" ? reviewCode.checkout : undefined}
    />
  );
};
