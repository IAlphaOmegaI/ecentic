import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · user · outline-duo · 18px.
// Adapted from UserOutlineDuo18; original geometry and soft layers retained.
export const UserIcon = ({
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
        d="M9 7.25C10.5188 7.25 11.75 6.01878 11.75 4.5C11.75 2.98122 10.5188 1.75 9 1.75C7.48122 1.75 6.25 2.98122 6.25 4.5C6.25 6.01878 7.48122 7.25 9 7.25Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M9 7.25C10.5188 7.25 11.75 6.01878 11.75 4.5C11.75 2.98122 10.5188 1.75 9 1.75C7.48122 1.75 6.25 2.98122 6.25 4.5C6.25 6.01878 7.48122 7.25 9 7.25Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M13.762 15.516C14.622 15.245 15.074 14.295 14.709 13.471C13.739 11.28 11.55 9.75 8.99999 9.75C6.44999 9.75 4.26099 11.28 3.29099 13.471C2.92599 14.296 3.37799 15.245 4.23799 15.516C5.46299 15.902 7.08399 16.25 8.99999 16.25C10.916 16.25 12.537 15.902 13.762 15.516Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
