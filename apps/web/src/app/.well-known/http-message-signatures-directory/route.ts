import { webBotAuthPublicJwk } from "@/server/utils/web-bot-auth";

const directory = {
  keys: [webBotAuthPublicJwk],
};

export const GET = () =>
  Response.json(directory, {
    headers: {
      "Content-Type": "application/http-message-signatures-directory+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
