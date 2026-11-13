import { getMessages } from "next-intl/server";
import { BlogArticleSkeleton } from "./_components/skeletons";

export default async () => {
  const { blogIndexPage } = await getMessages();
  return <BlogArticleSkeleton label={blogIndexPage.loading} />;
};
