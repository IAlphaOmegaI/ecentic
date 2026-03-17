"use client";

import dynamic from "next/dynamic";
import type { CompetitorManager } from "./competitor-manager";

const CompetitorManagerDynamic = dynamic(
  () =>
    import("./competitor-manager").then((module) => module.CompetitorManager),
  { ssr: false },
);

export const CompetitorManagerClient = (
  props: React.ComponentProps<typeof CompetitorManager>,
) => <CompetitorManagerDynamic {...props} />;
