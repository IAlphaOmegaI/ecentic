import * as Revalidation from "@/server/app/revalidation";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

export const POST = async () =>
  respond(await Revalidation.revalidateBlog(Environment.SERVER));
