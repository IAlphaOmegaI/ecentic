import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · paw · outline-duo · 18px.
// Adapted from PawOutlineDuo18; original geometry and soft layers retained.
export const CommercePawIcon = ({
  title,
  strokeWidth = 1.5,
  duoOpacity = 0.3,
  ...props
}: IconProps & { duoOpacity?: number | string }): JSX.Element => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 18 18"
      {...props}
    >
      {title && <title>{title}</title>}
      <ellipse
        cx="6.25"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <ellipse
        cx="2.75"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <ellipse
        cx="11.75"
        cy="4.5"
        rx="1.5"
        ry="2.25"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <ellipse
        cx="15.25"
        cy="8.75"
        rx="1"
        ry="1.5"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <path
        d="m4.75,13.625c0,.4309.1919.8443.5335,1.149.3416.3048.8049.476,1.2879.476,1.2143,0,1.2143-.75,2.4286-.75s1.2143.75,2.4286.75c.483,0,.9464-.1712,1.2879-.476.3416-.3047.5335-.7181.5335-1.149,0-2.1667-2.4286-4.875-4.25-4.875s-4.25,2.7083-4.25,4.875Z"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
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
        strokeWidth={strokeWidth}
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
        strokeWidth={strokeWidth}
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
        strokeWidth={strokeWidth}
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
        strokeWidth={strokeWidth}
      />
      <path
        d="m4.75,13.625c0,.4309.1919.8443.5335,1.149.3416.3048.8049.476,1.2879.476,1.2143,0,1.2143-.75,2.4286-.75s1.2143.75,2.4286.75c.483,0,.9464-.1712,1.2879-.476.3416-.3047.5335-.7181.5335-1.149,0-2.1667-2.4286-4.875-4.25-4.875s-4.25,2.7083-4.25,4.875Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
