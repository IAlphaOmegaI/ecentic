"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Cal's embed is 2.1MB and sets every third-party cookie the page gets flagged
// for, and it sits at the very bottom of the homepage — nobody has scrolled to
// it by the time it has finished loading. Mounting it on approach costs a
// visitor nothing: the surrounding `h-[620px]` box already reserves the space,
// so this cannot move layout, and 400px of margin means the calendar is ready
// before a scrolling reader arrives.
const BookingEmbed = dynamic(() =>
  import("@/components/cal").then((module) => module.BookingEmbed),
);

export const DeferredBookingEmbed = ({
  margin = "400px",
}: DeferredBookingEmbed.Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [approached, setApproached] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    // No IntersectionObserver (old Safari, some in-app webviews) means the
    // calendar must still exist — degrade to mounting it straight away.
    if (!("IntersectionObserver" in window)) {
      setApproached(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setApproached(true);
        observer.disconnect();
      },
      { rootMargin: margin },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [margin]);

  return (
    <div ref={container} className="size-full">
      {approached && <BookingEmbed />}
    </div>
  );
};

export namespace DeferredBookingEmbed {
  export type Props = {
    /**
     * How far outside the viewport the calendar starts loading. The homepage
     * gives it a head start; `/demo`, where it sits right under a
     * full-viewport banner, loads it only once it is actually on screen, so
     * the 2MB embed never counts against a visit that doesn't scroll to it.
     */
    margin?: string;
  };
}
