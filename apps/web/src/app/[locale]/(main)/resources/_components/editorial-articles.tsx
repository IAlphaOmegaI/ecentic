import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getLocale, getMessages } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Blog from "@/server/app/blog";

export const EditorialArticles = async () => {
  const locale = await getLocale();
  const { enterpriseCompany } = await getMessages();
  const copy = enterpriseCompany.resources.editorial;
  const posts = (await Blog.listPublished(locale))
    .filter((post) => post.source === "local")
    .slice(0, 3);

  if (posts.length === 0)
    return (
      <p className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]">
        {copy.empty}
      </p>
    );

  return (
    <div
      className="marketing-grid marketing-section-grid grid grid-cols-3 border-[var(--rail-color)] border-b max-sm:grid-cols-1"
      data-columns="3"
    >
      {posts.map((post) => (
        <article
          key={post.slug}
          className="flex min-w-0 flex-col border-[var(--rail-color)] border-t border-r last:border-r-0 max-sm:border-r-0"
        >
          <div className="flex flex-1 flex-col px-7 py-8 max-sm:px-4">
            <h3>{post.title}</h3>
            <p className="mt-4 text-foreground-dimmed">{post.description}</p>
          </div>
          <Button
            variant="flat"
            color="primary"
            className="w-full justify-between rounded-none px-7 py-4 max-sm:px-4"
            render={<Link href={`/blog/${post.slug}`} />}
          >
            {copy.read}
            <ArrowRightIcon className="size-4" />
          </Button>
        </article>
      ))}
    </div>
  );
};
