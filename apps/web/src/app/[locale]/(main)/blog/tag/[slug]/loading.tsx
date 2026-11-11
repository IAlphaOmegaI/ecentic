import { getMessages } from "next-intl/server";
import { BlogIndexSkeleton } from "../../_components/blog-index-content";

export default async () => {
  const { blogIndexPage } = await getMessages();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <BlogIndexSkeleton label={blogIndexPage.loading} />
    </main>
  );
};
