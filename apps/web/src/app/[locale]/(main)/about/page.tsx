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
          <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
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
          <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
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
