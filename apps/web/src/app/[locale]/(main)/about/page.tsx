import Image from "next/image";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { Link } from "@/i18n/navigation";
import Microsoft from "@/public/partners/microsoft-for-startups.png";
import PlugAndPlay from "@/public/partners/plug-and-play.webp";
import RedBull from "@/public/partners/red-bull-basement.svg";
import FounderGames from "@/public/partners/the-founder-games.png";

const programImages = [PlugAndPlay, Microsoft, RedBull, FounderGames] as const;

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.about.meta, "/about");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.about;

  return (
    <MarketingPage
      content={content}
      path="/about"
      sectionChildren={{
        team: (
          <div className="marketing-grid">
            {content.people.map((person) => (
              <article key={person.name}>
                <h3>{person.name}</h3>
                <p className="font-medium text-primary">{person.role}</p>
                <p>{person.body}</p>
                <Link className="marketing-item-link" href={person.href}>
                  {person.linkLabel}
                </Link>
              </article>
            ))}
          </div>
        ),
        programs: (
          <div className="marketing-grid">
            {content.programs.map((program, index) => {
              const image = programImages[index];
              return (
                <article key={program.name}>
                  {image && (
                    <Image
                      src={image}
                      alt={program.name}
                      className="mb-8 h-12 w-auto max-w-full object-contain object-left"
                    />
                  )}
                  <h3>{program.name}</h3>
                  <p>{program.description}</p>
                </article>
              );
            })}
          </div>
        ),
      }}
    />
  );
};
