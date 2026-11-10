import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { ScrollArea } from "@zenncore/web/components/scroll-area";

export const ApiDefinition = ({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) => (
  <Accordion className="api-definition">
    <AccordionItem value="definition" className="border-b-0">
      <AccordionTrigger>{label}</AccordionTrigger>
      <AccordionPanel>
        <ScrollArea
          className="api-definition-scroll"
          classList={{ viewport: "max-h-128" }}
          aria-label={label}
        >
          <pre>
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        </ScrollArea>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);
