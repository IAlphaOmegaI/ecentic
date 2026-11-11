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
  <div className="marketing-footer-mobile block px-4 py-6 min-[801px]:hidden">
    <Accordion multiple>
      {columns.map((column) => (
        <AccordionItem value={column.title} key={column.title}>
          <AccordionTrigger className="font-body">
            {column.title}
          </AccordionTrigger>
          <AccordionPanel>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="marketing-mobile-link flex items-center justify-between py-2.5 text-base text-foreground-rich"
                    href={link.href}
                  >
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
