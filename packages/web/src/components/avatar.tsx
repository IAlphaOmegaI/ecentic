import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Avatar = ({ className, ...props }: Avatar.Props): JSX.Element => {
  return (
    <AvatarPrimitive.Root
      className={createClassName(
        "inline-flex size-12 select-none items-center justify-center overflow-hidden rounded-full bg-gray-100 align-middle font-medium text-base text-black",
        className,
      )}
      {...props}
    />
  );
};
export namespace Avatar {
  export type Props = ComponentProps<typeof AvatarPrimitive.Root>;
  export type State = AvatarPrimitive.Root.State;
}

export const AvatarImage = ({
  className,
  ...props
}: AvatarImage.Props): JSX.Element => {
  return (
    <AvatarPrimitive.Image
      width="48"
      height="48"
      className={createClassName("size-full object-cover", className)}
      {...props}
    />
  );
};
export namespace AvatarImage {
  export type Props = ComponentProps<typeof AvatarPrimitive.Image>;
}

export const AvatarFallback = ({
  className,
  ...props
}: AvatarFallback.Props): JSX.Element => {
  return (
    <AvatarPrimitive.Fallback
      className={createClassName(
        "flex size-full items-center justify-center text-base",
        className,
      )}
      {...props}
    />
  );
};
export namespace AvatarFallback {
  export type Props = ComponentProps<typeof AvatarPrimitive.Fallback>;
}
