"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "./interactive/use-interactive";

/** A complete dotted extrusion is present at rest; a single sweep draws it in. */
export const FooterWordmark = () => {
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInView(stage, { amount: 0.3 });
  const { ready, reduced } = useInteractive();
  const [complete, setComplete] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const { document } = useDocument();
  useEffect(() => {
    if (!document) return;
    const update = () =>
      setDocumentVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [document]);
  const drawing = ready && !reduced && visible && documentVisible && !complete;

  return (
    <div
      ref={stage}
      role="img"
      aria-label="écentic"
      data-footer-wordmark
      data-artwork-renderer="tonal-dots"
      data-wordmark-motion={drawing ? "drawing" : "static"}
      className="relative isolate w-full overflow-hidden px-2 py-7 text-primary-text sm:px-4 sm:py-10"
    >
      <div className="relative aspect-[880/272] w-full [mask-image:url('/images/ascii/tonal/wordmark.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] max-sm:[mask-image:url('/images/ascii/tonal/wordmark-mobile.svg')]">
        <div aria-hidden className="absolute inset-0 bg-current opacity-25" />
        <Motion.Item
          aria-hidden
          initial={false}
          animate={{
            clipPath: drawing
              ? ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
              : "inset(0 0% 0 0)",
          }}
          transition={{ duration: drawing ? 1.8 : 0, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => {
            if (drawing) setComplete(true);
          }}
          className="absolute inset-0 bg-current"
        />
      </div>
    </div>
  );
};
