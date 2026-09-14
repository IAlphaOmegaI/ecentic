import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export const ScannerShell = async ({ children }: PropsWithChildren) => {
  const translate = await getTranslations("webmcpScanner.dashboard");
  return (
    <div className="mx-4 min-h-full border-accent-foreground border-x sm:mx-8">
      <div className="space-y-4 border-accent-foreground border-b px-6 py-8 sm:px-8">
        <p className="text-primary text-sm">{translate("label")}</p>
        <h1 className="font-semibold text-3xl text-foreground-rich tracking-tight">
          {translate("title")}
        </h1>
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-relaxed">
          {translate("description")}
        </p>
      </div>
      {children}
    </div>
  );
};
