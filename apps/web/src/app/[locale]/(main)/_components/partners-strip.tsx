import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

type Partner = {
  id: string;
  name: string;
  href: string;
  logo: string;
  captionKey:
    | "shopify"
    | "plugAndPlay"
    | "redBullBasement"
    | "founderGames"
    | "microsoftForStartups";
};

const partners: Partner[] = [
  {
    id: "shopify",
    name: "Shopify App Store",
    href: "https://apps.shopify.com/",
    logo: "/partners/shopify.svg",
    captionKey: "shopify",
  },
  {
    id: "plug-and-play",
    name: "Plug and Play Tirana",
    href: "https://www.plugandplaytechcenter.com/locations/tirana/",
    // Not a vector despite the old `.svg`: it was a single 3602x680 raster
    // base64'd into a pattern fill, so `next/image` passed all 177KB of it
    // through untouched. As a real raster it optimises like the others.
    logo: "/partners/plug-and-play.webp",
    captionKey: "plugAndPlay",
  },
  {
    id: "red-bull-basement",
    name: "Red Bull Basement",
    href: "https://basement.redbull.com/",
    logo: "/partners/red-bull-basement.svg",
    captionKey: "redBullBasement",
  },
  {
    id: "the-founder-games",
    name: "The Founder Game",
    href: "https://www.foundergames.com/",
    logo: "/partners/the-founder-games.png",
    captionKey: "founderGames",
  },
  {
    id: "microsoft-for-startups",
    name: "Microsoft for Startups",
    href: "https://www.microsoft.com/en-us/startups/",
    logo: "/partners/microsoft-for-startups.png",
    captionKey: "microsoftForStartups",
  },
];

export const PartnersStrip = async () => {
  const translate = await getTranslations("home");

  return (
    <section
      aria-label={translate("partnersStrip.ariaLabel")}
      className="relative border-accent-foreground border-y py-10"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <p className="text-center font-light text-primary-text text-xl">
        {translate("partnersStrip.title")}
      </p>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-10 md:gap-16">
        {partners.map((partner) => {
          const caption = translate(
            `partnersStrip.partners.${partner.captionKey}.caption`,
          );

          return (
            <li key={partner.name}>
              <Link
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                aria-label={caption}
                title={caption}
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
          );
        })}
      </ul>
    </section>
  );
};
