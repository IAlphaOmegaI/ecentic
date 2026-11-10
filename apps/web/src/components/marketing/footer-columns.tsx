"use client";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Link } from "@/i18n/navigation";

export const FooterColumns = ({
  columns,
}: {
  columns: readonly {
    title: string;
    links: readonly { href: string; label: string }[];
  }[];
}) => (
  <div className="marketing-footer-mobile">
    <Accordion multiple>
      {columns.map((column) => (
        <AccordionItem value={column.title} key={column.title}>
          <AccordionTrigger>{column.title}</AccordionTrigger>
          <AccordionPanel>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="marketing-mobile-link" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);
