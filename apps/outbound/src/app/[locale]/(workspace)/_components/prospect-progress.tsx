"use client";
import { useTranslations } from "next-intl";
import type { Prospect } from "@/lib/outbound";
import {
  type ProspectProgress,
  prospectLifecycles,
} from "@/lib/outbound-prospect-progress";
import { Status } from "./status";
export const ProspectEmailProgress = ({
  prospect,
  progress,
}: {
  prospect: Prospect;
  progress?: ProspectProgress;
}) => {
  const t = useTranslations("outbound.prospect.progress");
  return (
    <div className="space-y-1">
      <Status value={prospect.status} />
      {prospectLifecycles(prospect, progress)
        .filter((value) => !["replied", "held"].includes(value))
        .map((value) => (
          <p key={value} className="text-foreground-dimmed text-xs">
            {t(`lifecycle.${value}`)}
          </p>
        ))}
    </div>
  );
};
