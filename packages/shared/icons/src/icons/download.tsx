import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · download · outline-duo · 18px.
// Adapted from DownloadOutlineDuo18; original geometry and soft layers retained.
export const DownloadIcon = ({
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
        d="M11.599 6H12.152C13.064 6 13.845 6.725 14.011 7.724L14.968 13.514C15.182 14.807 14.291 16 13.109 16H4.891C3.709 16 2.81799 14.807 3.03199 13.514L3.98899 7.724C4.15499 6.725 4.936 6 5.848 6H6.40099"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
      />{" "}
      <path
        d="M12 6.25H12.335C13.3 6.25 14.127 6.939 14.302 7.888L15.315 13.388C15.541 14.617 14.598 15.75 13.348 15.75H4.65199C3.40199 15.75 2.45899 14.617 2.68499 13.388L3.69799 7.888C3.87299 6.939 4.69999 6.25 5.66499 6.25H5.99999"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12 9.5L9 12.5L6 9.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 12.5V1.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
