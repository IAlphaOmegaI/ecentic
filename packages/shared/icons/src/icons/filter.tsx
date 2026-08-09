import type { JSX } from "react";
import type { IconProps } from "../types";

export const FilterIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
          d="M7 9.527 1.677 3.233A.748.748 0 0 1 1.5 2.75c0-.414.336-.75.75-.75h13.5c.414 0 .75.336.75.75a.748.748 0 0 1-.177.483L11 9.527v5.973a.75.75 0 0 1-1.086.67l-2.5-1.25A.75.75 0 0 1 7 14.25V9.527Z"
          fill="currentColor"
        />
        <path
          d="M15.75 2H2.25c-.414 0-.75.336-.75.75 0 .177.063.348.177.483l1.06 1.254h12.526l1.06-1.254a.748.748 0 0 0 .177-.483c0-.414-.336-.75-.75-.75Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
