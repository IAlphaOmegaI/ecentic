import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · share-all-right · outline-duo · 18px.
// Adapted from ShareAllRightOutlineDuo18; original geometry and soft layers retained.
export const ShareIcon = ({
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
        d="M7.75 6.776V3.543L13.25 8.428L7.75 13.457V10.224C3.224 10.224 0.75 13.457 0.75 13.457C0.75 13.457 0.853 6.776 7.75 6.776Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M7.75 6.776V3.543L13.25 8.428L7.75 13.457V10.224C3.224 10.224 0.75 13.457 0.75 13.457C0.75 13.457 0.853 6.776 7.75 6.776Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M11.75 3.543L17.25 8.428L11.75 13.457"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
