import type { JSX } from "react";
import type { IconProps } from "./types";

export const SearchIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
          d="M1.5 7.25C1.5 4.07442 4.07442 1.5 7.25 1.5C10.4256 1.5 13 4.07442 13 7.25C13 10.4256 10.4256 13 7.25 13C4.07442 13 1.5 10.4256 1.5 7.25Z"
          fill="currentColor"
          fillOpacity=".4"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.3732 12.3732C12.6661 12.0803 13.1409 12.0803 13.4338 12.3732L16.2803 15.2197C16.5732 15.5126 16.5732 15.9874 16.2803 16.2803C15.9874 16.5732 15.5126 16.5732 15.2197 16.2803L12.3732 13.4338C12.0803 13.1409 12.0803 12.6661 12.3732 12.3732Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
