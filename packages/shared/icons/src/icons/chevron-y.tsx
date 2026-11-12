import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · chevron-expand-y · outline-duo · 18px.
// Adapted from ChevronExpandYOutlineDuo18; original geometry and soft layers retained.
export const ChevronYIcon = ({
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
        d="M12.5 6.25L9 2.75L5.5 6.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.5 11.75L9 15.25L5.5 11.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
