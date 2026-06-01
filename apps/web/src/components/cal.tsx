"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { Button } from "@zenncore/web/components/button";
import { useEffect } from "react";

const namespace = "15min";
const link = "ecentic-ai/15min";
const brand = "#1572fa";
const config = '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}';

const useCalInit = () => {
  useEffect(() => {
    void (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", {
        cssVarsPerTheme: {
          light: { "cal-brand": brand },
          dark: { "cal-brand": brand },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);
};

export const BookCall = ({ children, ...props }: BookCall.Props) => {
  useCalInit();

  return (
    <Button
      {...props}
      render={
        <button
          type="button"
          data-cal-namespace={namespace}
          data-cal-link={link}
          data-cal-config={config}
        />
      }
    >
      {children}
    </Button>
  );
};
export namespace BookCall {
  export type Props = Omit<Button.Props, "render">;
}

export const BookingEmbed = () => {
  useCalInit();

  return (
    <Cal
      namespace={namespace}
      calLink={link}
      config={{ layout: "month_view" }}
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
    />
  );
};
