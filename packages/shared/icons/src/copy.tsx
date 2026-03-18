import type { JSX } from "react";
import type { IconProps } from "./types";

export const CopyIcon = ({ title, ...props }: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      <g fill="currentColor">
        <rect
          x="6.75"
          y="6.75"
          width="9.5"
          height="9.5"
          rx="1"
          fill="currentColor"
          opacity=".4"
        />
        <path
          d="M4.25 11.25H3.75C2.645 11.25 1.75 10.355 1.75 9.25V3.75C1.75 2.645 2.645 1.75 3.75 1.75H9.25C10.355 1.75 11.25 2.645 11.25 3.75V4.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
