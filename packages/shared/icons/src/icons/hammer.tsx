import type { JSX } from "react";
import type { IconProps } from "../types";

export const HammerIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
          d="M9.542 5.50101L2.186 12.857C1.372 13.672 1.372 14.999 2.186 15.814C2.581 16.209 3.106 16.426 3.665 16.426C4.224 16.426 4.749 16.209 5.144 15.814L12.5 8.45801L9.542 5.50101Z"
          fill="currentColor"
          fillOpacity=".4"
        />
        <path
          d="M16.737 6.99898L11.987 2.24898C11.71 1.97198 11.343 1.79398 10.954 1.74898L6.764 1.25598C6.536 1.22598 6.308 1.30798 6.146 1.46998L5.712 1.90398C5.419 2.19698 5.419 2.67198 5.712 2.96498L13.242 10.496C13.583 10.837 14.031 11.008 14.479 11.008C14.927 11.008 15.375 10.838 15.716 10.496L16.737 9.47498C17.067 9.14398 17.25 8.70498 17.25 8.23698C17.25 7.76898 17.068 7.32898 16.737 6.99898Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
