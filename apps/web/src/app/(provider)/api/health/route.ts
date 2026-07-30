export const GET = () =>
  Response.json(
    {
      status: "ok",
      service: "ecentic",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
