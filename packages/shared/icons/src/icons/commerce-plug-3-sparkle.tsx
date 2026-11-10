import type { JSX } from "react";
import type { IconProps } from "../types";

export const CommercePlug_3SparkleIcon = ({
  title,
  ...props
}: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      <path
        d="m15.3964,10.0281L7.9718,2.6035c-.3903-.3904-1.0239-.3904-1.4142,0l-1.2374,1.2375c-.7564.7563-1.2748,1.6594-1.5607,2.618-.0738.2473.1038.6396.2503.6034.1589-.0393.3232-.0615.4922-.0615.3262,0,.6416.0688.9385.2046,1.0215.4741,1.5391,1.6357,1.21,2.7051l-.0361.1191c.6768.1108,1.2734.5269,1.6094,1.1401.3965.7231.3652,1.603-.0811,2.2969l-.3031.4716s.3162.365.5497.4166c2.0141.445,4.2048-.1101,5.7699-1.6753l1.2374-1.2373c.3903-.3904.3903-1.0239,0-1.4143Z"
        fill="currentColor"
        opacity=".3"
        strokeWidth="0"
      />
      <path
        d="m8.4521,14.3718c1.9966.418,4.1583-.1436,5.7068-1.6921l1.2374-1.2373c.3903-.3904.3903-1.0239,0-1.4143L7.9718,2.6035c-.3903-.3904-1.0239-.3904-1.4142,0l-1.2374,1.2375c-.7239.7239-1.2276,1.5833-1.5217,2.4958"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <line
        x1="9.7396"
        y1="4.3713"
        x2="11.8609"
        y2="2.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <line
        x1="13.6287"
        y1="8.2604"
        x2="15.75"
        y2="6.1391"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
      />
      <polygon
        points="4.9167 12.75 2.25 12.75 4.5 9.25 3.5833 12.25 6.25 12.25 4 15.75 4.9167 12.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        fill="currentColor"
      />
    </svg>
  );
};
