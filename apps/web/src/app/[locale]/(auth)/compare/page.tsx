"use client";

import { useTranslations } from "next-intl";
import { Navbar } from "@/components/navbar";
import { CompareForm } from "./_components/compare-form";

export default () => {
  const translate = useTranslations("compareTool.page");

  return (
    <main className="flex size-full min-h-full flex-1 flex-1 flex-col overflow-hidden">
      <Navbar />
      <div className="w-full border-accent-foreground border-b px-8">
        <div className="flex flex-col border-accent-foreground border-x p-6 pt-16">
          <h2 className="font-medium text-4xl text-foreground">
            {translate("title")}
          </h2>
          <p className="font-light text-2xl text-foreground-dimmed">
            {translate("description")}
          </p>
        </div>
      </div>

      <div className="w-full flex-1 flex-1 overflow-hidden border-accent-foreground border-b">
        <div className="flex size-full h-full flex-col border-accent-foreground border-x">
          <CompareForm />
        </div>
      </div>
    </main>
  );
};
