import { ArrowRightIcon } from "@zenncore/icons";
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
    <div className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4">
      {posts.map((post) => (
        <article key={post.slug}>
          <h3>{post.title}</h3>
          <p>{post.description}</p>
          <Link className="marketing-item-link" href={`/blog/${post.slug}`}>
            {copy.read}
            <ArrowRightIcon className="size-4" />
          </Link>
        </article>
      ))}
    </div>
  );
};
