import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · magnifier-2 · outline-duo · 18px.
// Adapted from Magnifier2OutlineDuo18; original geometry and soft layers retained.
export const SearchIcon = ({
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
        d="M7.25 12.25C10.0114 12.25 12.25 10.0114 12.25 7.25C12.25 4.4886 10.0114 2.25 7.25 2.25C4.4886 2.25 2.25 4.4886 2.25 7.25C2.25 10.0114 4.4886 12.25 7.25 12.25Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M15.75 15.75L12.9035 12.9035"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M7.25 12.25C10.0114 12.25 12.25 10.0114 12.25 7.25C12.25 4.4886 10.0114 2.25 7.25 2.25C4.4886 2.25 2.25 4.4886 2.25 7.25C2.25 10.0114 4.4886 12.25 7.25 12.25Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
