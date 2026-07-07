import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";

type Partner = {
  id: string;
  name: string;
  href: string;
  logo: string;
  caption: string;
};

const partners: Partner[] = [
  {
    id: "shopify",
    name: "Shopify App Store",
    href: "https://apps.shopify.com/",
    logo: "/partners/shopify.svg",
    caption: "Shopify App Store partner",
  },
  {
    id: "plug-and-play",
    name: "Plug and Play Tirana",
    href: "https://www.plugandplaytechcenter.com/locations/tirana/",
    logo: "/partners/plug-and-play.svg",
    caption: "Plug and Play — Tirana Batch 2",
  },
  {
    id: "red-bull-basement",
    name: "Red Bull Basement",
    href: "https://basement.redbull.com/",
    logo: "/partners/red-bull-basement.svg",
    caption: "Red Bull Basement — Albania national winner",
  },
  {
    id: "the-founder-games",
    name: "The Founder Game",
    href: "https://www.foundergames.com/",
    logo: "/partners/the-founder-games.png",
    caption: "The Founder Games — Part of season 2",
  },
  {
    id: "microsoft-for-startups",
    name: "Microsoft for Startups",
    href: "https://www.microsoft.com/en-us/startups/",
    logo: "/partners/microsoft-for-startups.png",
    caption: "Microsoft for Startups",
  },
];

export const PartnersStrip = () => (
  <section
    aria-label="Backed by and built for"
    className="relative border-accent-foreground border-y py-10"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    <p className="text-center font-light text-primary text-xl">
      Backed by and built for
    </p>
    <ul className="mt-8 flex flex-wrap items-center justify-center gap-10 md:gap-16">
      {partners.map((partner) => (
        <li key={partner.name}>
          <Link
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
            aria-label={partner.caption}
            title={partner.caption}
          >
            <Image
              src={partner.logo}
              alt={partner.name}
              width={160}
              height={40}
              className={`${partner.id === "plug-and-play" ? "h-7" : "h-11"} w-auto`}
            />
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
