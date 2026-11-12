"use client";

import { lazy, Suspense, useCallback, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import rest from "./riffle-rest.json";
import "@/components/hairline/kernel-style.css";

const Riffle = lazy(() => import("./riffle-artwork"));

export const RiffleFigure = ({
  label,
  play = false,
  onRead,
}: RiffleFigure.Props) => {
  const { ready, reduced } = useInteractive();
  const [mounted, setMounted] = useState(false);
  const read = useCallback(
    (value: string) => {
      setMounted(true);
      onRead?.(value);
    },
    [onRead],
  );
  return (
    <div
      className="relative isolate aspect-[4/3] overflow-hidden bg-emphasis-dimmed"
      data-riffle-synchronized
    >
      <div
        data-hairline="riffle-rest"
        data-hairline-theme="dark"
        role="img"
        aria-label={label}
        className="absolute inset-0 [--hairline-edge:var(--color-background-rich)] [--hairline-hi:var(--color-primary-rich)] [--hairline-plate:var(--color-emphasis-dimmed)]"
        hidden={mounted && !reduced}
      >
        <svg
          viewBox="0 0 400 320"
          aria-hidden
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Rest paths captured from the installed Hairline Riffle engine.
          dangerouslySetInnerHTML={{ __html: rest }}
        />
      </div>
      {ready && !reduced && (
        <Suspense fallback={null}>
          <Riffle
            theme="dark"
            label={label}
            play={play}
            onRead={read}
            className="absolute inset-0 size-full bg-emphasis-dimmed [--hairline-edge:var(--color-background-rich)] [--hairline-hi:var(--color-primary-rich)] [--hairline-plate:var(--color-emphasis-dimmed)]"
          />
        </Suspense>
      )}
    </div>
  );
};

export namespace RiffleFigure {
  export type Props = {
    label: string;
    play?: boolean;
    onRead?: (value: string) => void;
  };
}
