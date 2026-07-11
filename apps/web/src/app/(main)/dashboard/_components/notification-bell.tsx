"use client";

import { BellIcon } from "@zenncore/icons";
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
} from "@zenncore/web/components/popover";

const notifications: {
  id: number;
  title: string;
  body: string;
  time: string;
}[] = [];

export const NotificationBell = () => (
  <Popover>
    <PopoverTrigger
      className="relative flex size-8 items-center justify-center border-none bg-transparent text-foreground-dimmed transition-colors hover:bg-transparent hover:text-foreground"
      aria-label="Notifications"
    >
      <BellIcon className="size-6" />
      {notifications.length > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] items-center justify-center bg-primary px-1 font-medium text-[10px] text-background-rich leading-4">
          {notifications.length}
        </span>
      )}
    </PopoverTrigger>

    <PopoverPositioner side="bottom" align="end" sideOffset={8}>
      <PopoverPopup className="w-80 border border-accent-foreground bg-background-rich p-0 shadow-xl">
        <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
          <span className="font-medium text-foreground text-sm">
            Notifications
          </span>
          {notifications.length > 0 && (
            <span className="flex size-5 items-center justify-center bg-primary font-medium text-[10px] text-background-rich">
              {notifications.length}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellIcon className="size-8 text-foreground-dimmed/40" />
            <p className="font-medium text-foreground-dimmed text-sm">
              No notifications
            </p>
            <p className="font-light text-foreground-dimmed/70 text-xs">
              You're all caught up. We'll let you know when something needs
              attention.
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex cursor-pointer flex-col gap-0.5 border-accent-foreground border-b px-4 py-3 transition-colors last:border-0 hover:bg-background"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm">
                    {notification.title}
                  </span>
                  <span className="font-light text-foreground-dimmed text-xs">
                    {notification.time}
                  </span>
                </div>
                <span className="font-light text-foreground-dimmed text-xs">
                  {notification.body}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverPopup>
    </PopoverPositioner>
  </Popover>
);
