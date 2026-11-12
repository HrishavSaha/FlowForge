export interface DatabaseConfig {
  uri: string;
  databaseName: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DATABASE;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!databaseName) {
    throw new Error("MONGODB_DATABASE is not configured");
  }

  return {
    uri,
    databaseName
  };
}