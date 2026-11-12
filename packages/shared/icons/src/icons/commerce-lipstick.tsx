import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · lipstick · outline-duo · 18px.
// Adapted from LipstickOutlineDuo18; original geometry and soft layers retained.
export const CommerceLipstickIcon = ({
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
        d="M7.25 7.75001V3.29001C7.25 3.11101 7.346 2.94501 7.502 2.85601L10.002 1.42701C10.335 1.23701 10.75 1.47701 10.75 1.86101V7.75001"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M5.75 10.75H12.25C12.802 10.75 13.25 11.198 13.25 11.75V14.25C13.25 15.354 12.354 16.25 11.25 16.25H6.75C5.646 16.25 4.75 15.354 4.75 14.25V11.75C4.75 11.198 5.198 10.75 5.75 10.75Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M7.25 7.75001V3.29001C7.25 3.11101 7.346 2.94501 7.502 2.85601L10.002 1.42701C10.335 1.23701 10.75 1.47701 10.75 1.86101V7.75001"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M5.75 10.75V8.75C5.75 8.198 6.198 7.75 6.75 7.75H11.25C11.802 7.75 12.25 8.198 12.25 8.75V10.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M5.75 10.75H12.25C12.802 10.75 13.25 11.198 13.25 11.75V14.25C13.25 15.354 12.354 16.25 11.25 16.25H6.75C5.646 16.25 4.75 15.354 4.75 14.25V11.75C4.75 11.198 5.198 10.75 5.75 10.75Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
