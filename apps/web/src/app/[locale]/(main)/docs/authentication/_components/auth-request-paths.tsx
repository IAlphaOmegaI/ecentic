"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";

export const AuthRequestPaths = ({
  copy,
  open,
  authenticated,
}: AuthRequestPaths.Props) => (
  <Tabs defaultValue="open" className="min-w-0">
    <div className="relative border-accent-foreground border-b px-4 py-4 sm:px-8">
      <MarketingEdgeCrosses />
      <MarketingEdgeCrosses edge="bottom" />
      <div className="overflow-x-auto overscroll-x-contain">
        <TabsList aria-label={copy.label} className="min-w-max">
          <TabsIndicator />
          <Tab value="open" className="text-sm">
            {copy.open}
          </Tab>
          <Tab value="authenticated" className="text-sm">
            {copy.authenticated}
          </Tab>
        </TabsList>
      </div>
    </div>
    <TabsPanel value="open" keepMounted className="min-w-0 outline-primary">
      {open}
    </TabsPanel>
    <TabsPanel
      value="authenticated"
      keepMounted
      className="min-w-0 outline-primary"
    >
      {authenticated}
    </TabsPanel>
  </Tabs>
);

export namespace AuthRequestPaths {
  export type Props = {
    copy: AppConfig["Messages"]["docsAuthenticationPage"]["paths"];
    open: ReactNode;
    authenticated: ReactNode;
  };
}

export const AuthPathDetails = ({ label, children }: AuthPathDetails.Props) => (
  <Accordion>
    <AccordionItem value="details" className="border-0">
      <AccordionTrigger
        className="min-h-12 py-4 focus-visible:outline-primary"
        classList={{ trigger: { icon: "size-4 transition-none" } }}
      >
        {label}
      </AccordionTrigger>
      <AccordionPanel keepMounted className="transition-none">
        <div className="pb-4">{children}</div>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export namespace AuthPathDetails {
  export type Props = {
    label: string;
    children: ReactNode;
  };
}
