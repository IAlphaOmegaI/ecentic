import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · cursor-rays · outline-duo · 18px.
// Adapted from CursorRaysOutlineDuo18; original geometry and soft layers retained.
export const CursorRaysIcon = ({
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
        d="M8.09499 7.77801L15.409 10.288C15.631 10.364 15.635 10.676 15.416 10.758L12.137 11.991C12.07 12.016 12.016 12.07 11.991 12.137L10.758 15.416C10.675 15.635 10.364 15.631 10.288 15.409L7.77799 8.09501C7.70999 7.89801 7.89899 7.71001 8.09599 7.77701L8.09499 7.77801Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M8.09499 7.77801L15.409 10.288C15.631 10.364 15.635 10.676 15.416 10.758L12.137 11.991C12.07 12.016 12.016 12.07 11.991 12.137L10.758 15.416C10.675 15.635 10.364 15.631 10.288 15.409L7.77799 8.09501C7.70999 7.89801 7.89899 7.71001 8.09599 7.77701L8.09499 7.77801Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.031 12.031L16.243 16.243"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M7.75 1.75V3.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M11.993 3.507L10.578 4.922"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M3.50699 11.993L4.92199 10.578"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M1.75 7.75H3.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M3.50699 3.507L4.92199 4.922"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
