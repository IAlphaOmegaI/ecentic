import type { JSX } from "react";
import type { IconProps } from "../types";

export const AlertCircleIcon = ({
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
      <g fill="currentColor">
        <path
          opacity=".4"
          d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
          fill="currentColor"
        />
        <path
          d="M9 4.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0v-4.5A.75.75 0 0 0 9 4.5Z"
          fill="currentColor"
        />
        <path d="M9 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
      </g>
    </svg>
  );
};
