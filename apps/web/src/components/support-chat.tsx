"use client";

import { CommerceHeadphonesIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { openSupportChat } from "@/lib/support-chat";

export const SupportChat = () => {
  const locale = useLocale();
  const translate = useTranslations("cookieConsent.support");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
  const token = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN;
  if (!baseUrl || !token) return null;

  return (
    <div className="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-2">
      {failed && (
        <p role="status">
          <a
            className="rounded-sm border border-accent-foreground bg-background px-4 py-3 text-foreground text-sm shadow-md"
            href="mailto:support@ecentic.ai"
          >
            {translate("unavailable")}
          </a>
        </p>
      )}
      <Button
        type="button"
        color="primary"
        className="size-14 rounded-full p-0 shadow-lg"
        aria-label={translate(pending ? "pending" : "action.primary")}
        title={translate("action.primary")}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            await openSupportChat(baseUrl, token, locale);
          } catch {
            setFailed(true);
          } finally {
            setPending(false);
          }
        }}
      >
        <CommerceHeadphonesIcon className="size-6" aria-hidden="true" />
      </Button>
    </div>
  );
};
