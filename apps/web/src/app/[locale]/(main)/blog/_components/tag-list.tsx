import { slugify } from "babylovegrowth-next-js-blog";
import { Link } from "@/i18n/navigation";

export const TagList = ({ keywords }: { keywords: readonly string[] }) => {
  const unique = Array.from(
    new Map(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .map((keyword) => [slugify(keyword), keyword] as const),
    ).entries(),
  ).filter(([slug]) => slug.length > 0);

  if (unique.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {unique.map(([slug, label]) => (
        <Link
          key={slug}
          href={`/blog/tag/${slug}`}
          className="border border-accent-foreground bg-background-dimmed p-2 text-foreground-dimmed text-sm transition hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </div>
  );
};
