"use client";

import { CheckIcon, CopyIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useState } from "react";

export const DocsCopy = ({ source, copy }: DocsCopy.Props) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [write, pending] = useAsyncAction(async () => {
    const result = await resultify(() => navigator.clipboard.writeText(source));
    setCopied(result.success ? source : null);
    setFailed(!result.success);
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {failed && (
        <span role="status" className="text-error text-sm">
          {copy.failed}
        </span>
      )}
      <Button
        type="button"
        color="neutral"
        variant="soft"
        disabled={pending}
        onClick={write}
      >
        {copied === source ? (
          <CheckIcon aria-hidden="true" className="size-4" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-4" />
        )}
        <span aria-live="polite">
          {copied === source ? copy.copied : copy.action.primary}
        </span>
      </Button>
    </div>
  );
};

export namespace DocsCopy {
  export type Props = {
    source: string;
    copy: AppConfig["Messages"]["docsControls"];
  };
}
