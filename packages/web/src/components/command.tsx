"use client";

import { CheckIcon, SearchIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import { Command as CommandPrimitive } from "cmdk";
import type { ComponentProps, JSX, ReactNode } from "react";
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "./dialog";
import { TextField } from "./text-field";

export const Command = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive>): JSX.Element => {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-lg! bg-background-rich p-1 text-foreground",
        className,
      )}
      {...props}
    />
  );
};

export const CommandDialog = ({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Dialog>, "children"> & {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}): JSX.Element => {
  return (
    <Dialog {...props}>
      <DialogPopup
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-lg! p-0",
          className,
        )}
      >
        <div className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        {children}
      </DialogPopup>
    </Dialog>
  );
};

export const CommandInput = ({
  className,
  classList,
  ...props
}: CommandInput.Props): JSX.Element => {
  return (
    <div
      className={cn("p-1 pb-0", classList?.root)}
      data-slot="command-input-wrapper"
    >
      <TextField
        className={cn(
          "h-8 justify-start gap-2 rounded-lg border-accent-foreground bg-background-rich px-2",
          classList?.field,
        )}
      >
        <SearchIcon
          className={cn("size-4 shrink-0 opacity-50", classList?.icon)}
        />
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full bg-transparent text-sm outline-hidden placeholder:text-foreground-dimmed disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </TextField>
    </div>
  );
};
export namespace CommandInput {
  export type Props = ComponentProps<typeof CommandPrimitive.Input> & {
    classList?: ClassList<"root" | "field" | "icon">;
  };
}

export const CommandList = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>): JSX.Element => {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-y-auto overflow-x-hidden outline-none",
        className,
      )}
      {...props}
    />
  );
};

export const CommandEmpty = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>): JSX.Element => {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  );
};

export const CommandGroup = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>): JSX.Element => {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-foreground-dimmed **:[[cmdk-group-heading]]:text-xs",
        className,
      )}
      {...props}
    />
  );
};

export const CommandSeparator = ({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Separator>): JSX.Element => {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-accent-foreground", className)}
      {...props}
    />
  );
};

export const CommandItem = ({
  className,
  children,
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>): JSX.Element => {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default select-none items-center gap-2 in-data-[slot=dialog-content]:rounded-lg! rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-background-dimmed data-[selected=true]:text-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[selected=true]:*:[svg]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  );
};

export const CommandShortcut = ({
  className,
  ...props
}: ComponentProps<"span">): JSX.Element => {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-foreground-dimmed text-xs tracking-widest group-data-[selected=true]/command-item:text-foreground",
        className,
      )}
      {...props}
    />
  );
};
