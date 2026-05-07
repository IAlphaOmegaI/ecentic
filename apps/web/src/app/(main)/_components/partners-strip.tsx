import Image from "next/image";
import Link from "next/link";

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
];

export const PartnersStrip = () => (
  <section
    aria-label="Backed by and selected by"
    className="border-accent-foreground border-y py-10"
  >
    <p className="text-center font-light text-primary text-xl">
      Backed by and selected by
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
