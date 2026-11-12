import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · chevron-right · outline-duo · 18px.
// Adapted from ChevronRightOutlineDuo18; original geometry and soft layers retained.
export const ChevronRightIcon = ({
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
        d="M6.5 2.75L12.75 9L6.5 15.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
