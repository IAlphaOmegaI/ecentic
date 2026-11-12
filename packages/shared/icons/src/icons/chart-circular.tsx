import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · chart-circular · outline-duo · 18px.
// Adapted from ChartCircularOutlineDuo18; original geometry and soft layers retained.
export const ChartCircularIcon = ({
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
      <circle
        cx="9"
        cy="9"
        r="1.25"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.25 9C16.25 13.0041 13.0041 16.25 9 16.25C4.99594 16.25 1.75 13.0041 1.75 9C1.75 4.99594 4.99594 1.75 9 1.75C13.0041 1.75 16.25 4.99594 16.25 9ZM13.25 9C13.25 11.3472 11.3472 13.25 9 13.25C6.65279 13.25 4.75 11.3472 4.75 9C4.75 6.65279 6.65279 4.75 9 4.75C11.3472 4.75 13.25 6.65279 13.25 9Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M9 1.75C13.004 1.75 16.25 4.996 16.25 9C16.25 13.004 13.004 16.25 9 16.25C4.996 16.25 1.75 13.004 1.75 9C1.75 7.522 2.193 6.146 2.952 5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 4.75C11.347 4.75 13.25 6.653 13.25 9C13.25 11.347 11.347 13.25 9 13.25C6.653 13.25 4.75 11.347 4.75 9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 7.75C9.69 7.75 10.25 8.31 10.25 9C10.25 9.69 9.69 10.25 9 10.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
