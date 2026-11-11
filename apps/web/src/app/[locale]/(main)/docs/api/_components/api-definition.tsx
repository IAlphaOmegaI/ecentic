import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { ScrollArea } from "@zenncore/web/components/scroll-area";

export const ApiDefinition = ({ label, value }: ApiDefinition.Props) => (
  <Accordion className="mt-6">
    <AccordionItem value="definition" className="border-b-0">
      <AccordionTrigger>{label}</AccordionTrigger>
      <AccordionPanel>
        <ScrollArea classList={{ viewport: "max-h-128" }} aria-label={label}>
          <pre className="mt-6 overflow-visible bg-background-dimmed p-6 text-[13px] leading-[1.7] [tab-size:2]">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        </ScrollArea>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export namespace ApiDefinition {
  export type Props = { label: string; value: unknown };
}
