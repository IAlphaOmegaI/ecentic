"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { Button } from "@zenncore/web/components/button";
import { useEffect } from "react";
import { booking } from "@/lib/booking";

const namespace = "15min";
const brand = "#1572fa";
const config = '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}';

// `embed.js` sets `instance` on the global the moment it runs, in the same pass
// that registers its document click listener. Before that, `window.Cal` is only
// the snippet's queue stub and nothing would open the modal.
const isEmbedReady = () => {
  const cal: { instance?: unknown } | undefined = Reflect.get(window, "Cal");
  return Boolean(cal?.instance);
};

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
        // Cal's listener opens the modal but never cancels the click, so the
        // link only navigates while the embed is not there to catch it.
        <a
          href={booking.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cal-namespace={namespace}
          data-cal-link={booking.link}
          data-cal-config={config}
          onClick={(event) => {
            if (isEmbedReady()) event.preventDefault();
          }}
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
      calLink={booking.link}
      config={{ layout: "column_view", useSlotsViewOnSmallScreen: "true" }}
      style={{ width: "100%", height: "100%", overflow: "auto" }}
    />
  );
};
