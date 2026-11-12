import { getDatabase } from "./connection.js";

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = await getDatabase();

    await db.command({
      ping: 1
    });

    return true;
  } catch {
    return false;
  }
}