import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · gauge · outline-duo · 18px.
// Adapted from GaugeOutlineDuo18; original geometry and soft layers retained.
export const GaugeIcon = ({
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
        d="M4.009 15.25H13.991C15.38 13.929 16.25 12.068 16.25 10C16.25 5.996 13.004 2.75 9 2.75C4.996 2.75 1.75 5.996 1.75 10C1.75 12.068 2.62 13.929 4.009 15.25Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
      />{" "}
      <path
        d="M4.009 15.25H13.991C15.38 13.929 16.25 12.068 16.25 10C16.25 5.996 13.004 2.75 9 2.75C4.996 2.75 1.75 5.996 1.75 10C1.75 12.068 2.62 13.929 4.009 15.25Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9.00005 10L5.89404 6.89401"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M4.75 10C4.75 10.81 4.975 11.581 5.398 12.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.603 12.25C13.025 11.581 13.25 10.81 13.25 10C13.25 7.657 11.343 5.75 9 5.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
