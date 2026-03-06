import type { useRender } from "@base-ui/react";
import type {
  DistributiveOmit,
  DistributiveOverride,
  EmptyObject,
  Prettify,
} from "@zenncore/utils/types";
import type { ElementType, HTMLProps } from "react";
import type { State as StateShape } from "./component-state";

export type RenderComponentProps<
  T extends ElementType,
  State extends StateShape = EmptyObject, // extends State | undefined = undefined
  // biome-ignore lint/suspicious/noExplicitAny: any for Component.Props to work
  Props extends Record<PropertyKey, any> = EmptyObject,
  // biome-ignore lint/suspicious/noExplicitAny: any component props
  RenderProps = HTMLProps<any>,
> = Prettify<
  DistributiveOverride<
    useRender.ComponentProps<T, State, RenderProps>,
    DistributiveOverride<
      DistributiveOmit<Props, "render">,
      {
        className?:
          | string
          | (EmptyObject extends State ? never : (state: State) => string);
        //   className?: string | (S extends State ? (state: S) => string : never);
      }
      //TODO: add classList with state support
      //  & (Props extends { classList?: infer CL }
      //     ? {
      //         classList?: CL extends
      //           | string
      //           | ((state: State) => string)
      //           | undefined
      //           ? CL
      //           : never;
      //       }
      //     : EmptyObject)
    >
  >
>;
