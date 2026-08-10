export function databaseUrl() {
  const value=process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL;
  return value&&/^postgres(?:ql)?:\/\//.test(value)?value:undefined;
}

export function requireDatabaseUrl() {
  const url = databaseUrl();
  if (!url) throw new Error("TelMax database connection sozlanmagan");
  return url;
}
