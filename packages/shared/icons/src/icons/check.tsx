import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · check · outline-duo · 18px.
// Adapted from CheckOutlineDuo18; original geometry and soft layers retained.
export const CheckIcon = ({
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
        d="M2.75 9.25L6.75 14.25L15.25 3.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
