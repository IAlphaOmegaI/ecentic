import type { JSX } from "react";
import type { IconProps } from "../types";

export const BookIcon = ({ title, ...props }: IconProps): JSX.Element => {
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
        d="M4.75 3C3.23079 3 2 4.23079 2 5.75V14.25C2 15.7692 3.23079 17 4.75 17H14.25C15.2162 17 16 16.2162 16 15.25V4.75C16 3.78379 15.2162 3 14.25 3H4.75Z"
        fill="currentColor"
        fillOpacity=".4"
      />
      <path
        d="M12.471 0.903014C12.471 0.680652 12.3723 0.469754 12.2016 0.327256C12.0309 0.184758 11.8058 0.125354 11.587 0.16508L5.57663 1.25642C3.51059 1.6116 2 3.40278 2 5.50002C2 5.52866 2.00164 5.5571 2.00485 5.58523C2.09002 4.14278 3.28611 3 4.75 3H12.471V0.903014Z"
        fill="currentColor"
        fillOpacity=".2"
      />
      <path
        d="M4.75 17H5V3H4.75C3.23079 3 2 4.23079 2 5.75V14.25C2 15.7692 3.23079 17 4.75 17Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 7.75C8 7.33579 8.33579 7 8.75 7H12.25C12.6642 7 13 7.33579 13 7.75V9.75C13 10.1642 12.6642 10.5 12.25 10.5H8.75C8.33579 10.5 8 10.1642 8 9.75V7.75Z"
        fill="currentColor"
      />
    </svg>
  );
};
