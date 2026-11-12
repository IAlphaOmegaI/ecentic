import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · city-building · outline-duo · 18px.
// Adapted from CityBuildingOutlineDuo18; original geometry and soft layers retained.
export const CommerceCityBuildingIcon = ({
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
        d="m10.75,10.25c0-1.2095.8589-2.2178,2-2.4497V2.75c0-.5522-.4477-1-1-1h-7c-.5522,0-1,.4478-1,1v13h9v-3.0503c-1.1411-.2319-2-1.2402-2-2.4497Z"
        fill="currentColor"
        opacity={duoOpacity}
        strokeWidth={0}
        data-color="color-2"
      />
      <circle
        cx="13.25"
        cy="10.25"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <line
        x1="13.25"
        y1="15.75"
        x2="13.25"
        y2="12.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m1.75,15.75h14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m3.75,15.75V2.75c0-.5523.4477-1,1-1h7c.5523,0,1,.4477,1,1v2.0238"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m6.75,5.5v-.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m6.75,8.5v-.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m6.75,11.5v-.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m9.75,5.5v-.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
