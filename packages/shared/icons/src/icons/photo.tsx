import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · photo · outline-duo · 18px.
// Adapted from PhotoOutlineDuo18; original geometry and soft layers retained.
export const PhotoIcon = ({
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.99214 14.75H3.75C2.64543 14.75 1.75 13.8546 1.75 12.75V5.25C1.75 4.14543 2.64543 3.25 3.75 3.25H14.25C15.3546 3.25 16.25 4.14543 16.25 5.25V12.4833L12.664 8.914C11.883 8.133 10.617 8.133 9.83599 8.914L3.99214 14.75Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M4 14.75L9.836 8.914C10.617 8.133 11.883 8.133 12.664 8.914L16.25 12.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M3.75 14.75L14.25 14.75C15.3546 14.75 16.25 13.8546 16.25 12.75V5.25C16.25 4.14543 15.3546 3.25 14.25 3.25L3.75 3.25C2.64543 3.25 1.75 4.14543 1.75 5.25L1.75 12.75C1.75 13.8546 2.64543 14.75 3.75 14.75Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M5.75 8.5C6.44036 8.5 7 7.94036 7 7.25C7 6.55964 6.44036 6 5.75 6C5.05964 6 4.5 6.55964 4.5 7.25C4.5 7.94036 5.05964 8.5 5.75 8.5Z"
        fill="currentColor"
        data-stroke="none"
      />
    </svg>
  );
};
