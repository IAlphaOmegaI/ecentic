"use client";

import type { AppConfig } from "next-intl";
import { lazy, Suspense } from "react";
import "./lead.css";

const LazyLeadForm = lazy(() =>
  import("./lead-form").then((module) => ({ default: module.LeadForm })),
);

export const InlineLead = (props: {
  kind: "integration" | "partner";
  topic: string;
  title?: string;
  locale: "en" | "es";
  copy: AppConfig["Messages"]["enterpriseLead"];
}) => (
  <Suspense
    fallback={
      <p role="status" className="marketing-lead-loading">
        {props.copy.dialog.loading}
      </p>
    }
  >
    <LazyLeadForm {...props} />
  </Suspense>
);
