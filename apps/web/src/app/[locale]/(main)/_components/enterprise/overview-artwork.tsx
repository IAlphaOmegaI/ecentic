"use client";

import { EvolvingAscii } from "@/components/marketing/evolving-ascii";

export const OverviewArtwork = () => (
  <div
    aria-hidden="true"
    className="enterprise-art pointer-events-none absolute inset-y-0 right-0 left-[30%] text-background-rich opacity-60 [mask-image:linear-gradient(105deg,transparent_10%,black_80%)] max-sm:top-40 max-sm:-right-24 max-sm:left-0 max-sm:opacity-22 max-sm:[mask-image:linear-gradient(180deg,transparent_4%,black_70%,transparent)]"
  >
    <EvolvingAscii cycle={["cart", "commerce", "bag"]} />
  </div>
);
