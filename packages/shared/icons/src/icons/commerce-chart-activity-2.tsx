import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · chart-activity-2 · outline-duo · 18px.
// Adapted from ChartActivity2OutlineDuo18; original geometry and soft layers retained.
export const CommerceChartActivity_2Icon = ({
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
        d="M16.25 8.75H13.953C13.531 8.75 13.155 9.015 13.012 9.411L11.365 13.986C11.245 14.32 10.771 14.314 10.659 13.978L7.341 4.022C7.229 3.686 6.755 3.68 6.635 4.014L4.988 8.589C4.845 8.986 4.469 9.25 4.047 9.25H1.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
