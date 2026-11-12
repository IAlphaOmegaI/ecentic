import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · book · outline-duo · 18px.
// Adapted from BookOutlineDuo18; original geometry and soft layers retained.
export const BookIcon = ({
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
        opacity={duoOpacity}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.25 4.75V15.25C15.25 15.802 14.802 16.25 14.25 16.25H5.75V3.75H14.25C14.802 3.75 15.25 4.198 15.25 4.75Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
      />{" "}
      <path
        d="M2.75 5.50002C2.75 3.76702 3.999 2.28701 5.707 1.99501L11.721 0.903015"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M15.25 4.75V15.25C15.25 15.802 14.802 16.25 14.25 16.25H4.75C3.645 16.25 2.75 15.355 2.75 14.25V5.75C2.75 4.645 3.645 3.75 4.75 3.75H14.25C14.802 3.75 15.25 4.198 15.25 4.75Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M5.75 3.75V16.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.25 7.25H8.75V9.25H12.25V7.25Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
