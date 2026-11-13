"use client";

import { type ComponentProps, useState } from "react";
import { Link } from "@/i18n/navigation";

/** Keep marketing navigation ready on intent without downloading unseen forms. */
export const IntentLink = ({
  onMouseEnter,
  onFocus,
  prefetch,
  ...props
}: IntentLink.Props) => {
  const [active, setActive] = useState(false);

  return (
    <Link
      {...props}
      prefetch={prefetch === undefined ? active : prefetch}
      onMouseEnter={(event) => {
        setActive(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
    />
  );
};

export namespace IntentLink {
  export type Props = ComponentProps<typeof Link>;
}
