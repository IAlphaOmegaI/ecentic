import type { JSX } from "react";
import type { IconProps } from "../types";

export const CommercePawIcon = ({
  title,
  ...props
}: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      <ellipse
        cx="6.25"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <ellipse
        cx="2.75"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <ellipse
        cx="11.75"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <ellipse
        cx="15.25"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <path
        d="m4.75,13.625c0,.4309.1919.8443.5335,1.149.3416.3048.8049.476,1.2879.476,1.2143,0,1.2143-.75,2.4286-.75s1.2143.75,2.4286.75c.483,0,.9464-.1712,1.2879-.476.3416-.3047.5335-.7181.5335-1.149,0-2.1667-2.4286-4.875-4.25-4.875s-4.25,2.7083-4.25,4.875Z"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <ellipse
        cx="6.25"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <ellipse
        cx="2.75"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <ellipse
        cx="11.75"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <ellipse
        cx="15.25"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <path
        d="m4.75,13.625c0,.4309.1919.8443.5335,1.149.3416.3048.8049.476,1.2879.476,1.2143,0,1.2143-.75,2.4286-.75s1.2143.75,2.4286.75c.483,0,.9464-.1712,1.2879-.476.3416-.3047.5335-.7181.5335-1.149,0-2.1667-2.4286-4.875-4.25-4.875s-4.25,2.7083-4.25,4.875Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
    </svg>
  );
};
