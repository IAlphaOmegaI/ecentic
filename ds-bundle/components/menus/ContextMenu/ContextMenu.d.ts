import * as React from "react";

/**
 * ContextMenu — from @zenncore/web@0.0.0.
 */
export interface ContextMenuProps {
  /** A ref to imperative actions. - `unmount`: Manually unmounts the menu. Call this after any externally controlled closing  */
  actionsRef?: RefObject<MenuRootActions>;
  /** A handle to associate the menu with a trigger. If specified, allows external triggers to control the menu's open state. */
  handle?: Handle<unknown>;
  /** Whether the menu is currently open. */
  open?: boolean;
  /** Whether the menu is initially open. To render a controlled menu, use the `open` prop instead. */
  defaultOpen?: boolean;
  /** The content of the popover. This can be a regular React node or a render function that receives the `payload` of the act */
  children?: boolean | PayloadChildRenderFunction<unknown> | React.ReactNode;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `open` prop to create a co */
  triggerId?: string;
  /** ID of the trigger that the popover is associated with. This is useful in conjunction with the `defaultOpen` prop to crea */
  defaultTriggerId?: string;
  /** Whether moving the pointer over items should highlight them. Disabling this prop allows CSS `:hover` to be differentiate */
  highlightItemOnHover?: boolean;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether to loop keyboard focus back to the first item when the end of the list is reached while using the arrow keys. */
  loopFocus?: boolean;
  /** The visual orientation of the menu. Controls whether roving focus uses up/down or left/right arrow keys. */
  orientation?: "horizontal" | "vertical";
  /** When in a submenu, determines whether pressing the Escape key closes the entire menu, or only the current child menu. */
  closeParentOnEsc?: boolean;
}

export declare const ContextMenu: React.ComponentType<ContextMenuProps>;
