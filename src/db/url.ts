export function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL;
}

export function requireDatabaseUrl() {
  const url = databaseUrl();
  if (!url) throw new Error("TelMax database connection sozlanmagan");
  return url;
}
