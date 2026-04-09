import type { JSX } from "react";
import type { IconProps } from "./types";

export const XTwitterIcon = ({ title, ...props }: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      
    </svg>
  );
}; 