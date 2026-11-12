import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · chevron-down · outline-duo · 18px.
// Adapted from ChevronDownOutlineDuo18; original geometry and soft layers retained.
export const ChevronDownIcon = ({
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
      <path
        d="M15.25 6.5L9 12.75L2.75 6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
