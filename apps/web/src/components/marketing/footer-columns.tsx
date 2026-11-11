"use client";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { CookieSettings } from "@/components/cookie-settings";
import { Link } from "@/i18n/navigation";

export const FooterColumns = ({ columns, cookies }: FooterColumns.Props) => (
  <div className="marketing-footer-mobile block min-[801px]:hidden">
    <Accordion multiple>
      {columns.map((column, index) => (
        <AccordionItem
          value={column.title}
          key={column.title}
          className="border-accent-foreground last:border-b-0"
        >
          <AccordionTrigger
            classList={{
              trigger: {
                root: "px-4 py-5 font-body text-foreground-rich hover:text-primary-text",
                icon: "mr-0 size-4 text-primary-text group-data-panel-open:rotate-180",
              },
            }}
          >
            {column.title}
          </AccordionTrigger>
          <AccordionPanel>
            <ul className="px-4 pb-6">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="marketing-mobile-link flex py-3 text-base text-foreground-dimmed transition-colors hover:text-primary-text"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {index === columns.length - 1 && (
                <li>
                  <CookieSettings label={cookies} appearance="link" />
                </li>
              )}
            </ul>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export namespace FooterColumns {
  export type Props = {
    cookies: string;
    columns: readonly {
      title: string;
      links: readonly { href: string; label: string }[];
    }[];
  };
}
