/** Destructive fixture tests may only use the dedicated local PostgreSQL server. */
export const requireTestDatabase = (endpoint: string | undefined) => {
  if (!endpoint)
    throw new Error(
      "An isolated test database is required; this suite must not skip its database tests.",
    );
  const url = new URL(endpoint);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432" ||
    !/^\/outbound_(?:test|conversations_test|smoke_[a-f0-9]{12})$/.test(
      url.pathname,
    ) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Fixture tests require a dedicated outbound test database on localhost:55432, without URL overrides.",
    );
  return endpoint;
};
