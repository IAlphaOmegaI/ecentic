"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";

export const AuthRequestPaths = ({
  copy,
  open,
  authenticated,
}: AuthRequestPaths.Props) => (
  <Tabs defaultValue="open" className="min-w-0">
    <TabsList
      aria-label={copy.label}
      className="grid w-full grid-cols-2 rounded-none border-x-0 border-t-0 bg-background-dimmed"
    >
      <Tab
        value="open"
        className="h-auto min-h-16 whitespace-normal px-4 py-4 text-base data-[active]:bg-primary data-[active]:text-background-rich"
      >
        {copy.open}
      </Tab>
      <Tab
        value="authenticated"
        className="h-auto min-h-16 whitespace-normal px-4 py-4 text-base data-[active]:bg-primary data-[active]:text-background-rich"
      >
        {copy.authenticated}
      </Tab>
    </TabsList>
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
