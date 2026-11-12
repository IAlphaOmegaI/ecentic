import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · hammer · outline-duo · 18px.
// Adapted from HammerOutlineDuo18; original geometry and soft layers retained.
export const HammerIcon = ({
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
        d="M2.75 2.75H11.5L16.25 6.5V8.25H2.75C2.198 8.25 1.75 7.802 1.75 7.25V3.75C1.75 3.198 2.198 2.75 2.75 2.75Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M11 8.25L11.5 16.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M6.5 16.25L7 8.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M2.75 2.75H11.5L16.25 6.5V8.25H2.75C2.198 8.25 1.75 7.802 1.75 7.25V3.75C1.75 3.198 2.198 2.75 2.75 2.75Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
