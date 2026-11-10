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

  if (posts.length === 0) return <p className="marketing-cell">{copy.empty}</p>;

  return (
    <div className="marketing-grid">
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
