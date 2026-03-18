import type { JSX } from "react";
import type { IconProps } from "./types";

export const BellIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
        <path
          opacity=".4"
          d="M9 1.75C6.377 1.75 4.25 3.877 4.25 6.5V9.75L2.75 11.25V12.25H15.25V11.25L13.75 9.75V6.5C13.75 3.877 11.623 1.75 9 1.75Z"
          fill="currentColor"
        />
        <path
          d="M2.75 11.25L4.25 9.75V6.5C4.25 3.877 6.377 1.75 9 1.75C11.623 1.75 13.75 3.877 13.75 6.5V9.75L15.25 11.25V12.25H2.75V11.25Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 12.25C7 13.355 7.895 14.25 9 14.25C10.105 14.25 11 13.355 11 12.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
