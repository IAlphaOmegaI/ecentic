"use client";

import type { AppConfig } from "next-intl";
import { lazy, Suspense } from "react";

const LazyLeadForm = lazy(() =>
  import("./lead-form").then((module) => ({ default: module.LeadForm })),
);

export const InlineLead = (props: InlineLead.Props) => (
  <Suspense
    fallback={
      <p
        role="status"
        className="marketing-lead-loading min-h-[280px] py-6 text-foreground-dimmed"
      >
        {props.copy.dialog.loading}
      </p>
    }
  >
    <LazyLeadForm {...props} />
  </Suspense>
);

export namespace InlineLead {
  export type Props = {
    kind: "integration" | "partner";
    topic: string;
    title?: string;
    locale: "en" | "es";
    copy: AppConfig["Messages"]["enterpriseLead"];
  };
}
