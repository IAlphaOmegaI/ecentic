import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · circle-bolt · outline-duo · 18px.
// Adapted from CircleBoltOutlineDuo18; original geometry and soft layers retained.
export const CircleBoltIcon = ({
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
        r="7.25"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <path
        d="m8.437,13.5l3.2659-4.75h-2.9525l.8128-4.25-3.266,4.75h2.9527l-.8128,4.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        fill="currentColor"
      />
      <circle
        cx="9"
        cy="9"
        r="7.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
