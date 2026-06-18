import type { JSX } from "react";
import type { IconProps } from "../types";

export const AwardIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.25 6.25C3.25 3.07435 5.82483 0.5 9 0.5C12.1752 0.5 14.75 3.07435 14.75 6.25C14.75 9.42565 12.1752 12 9 12C5.82483 12 3.25 9.42565 3.25 6.25Z"
          fill="currentColor"
          fillOpacity=".4"
        />
        <path
          d="M5 10.3805V16.75C5 17.0357 5.16235 17.2966 5.41869 17.4229C5.67502 17.5491 5.98081 17.5187 6.20728 17.3445L9 15.1962L11.7927 17.3445C12.0192 17.5187 12.325 17.5491 12.5813 17.4229C12.8377 17.2966 13 17.0357 13 16.75V10.3805C11.965 11.383 10.5544 12 9 12C7.44556 12 6.035 11.383 5 10.3805Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
