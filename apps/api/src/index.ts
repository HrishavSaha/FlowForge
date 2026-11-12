import express from "express";

import {
  connectDatabase,
  closeDatabase,
  checkDatabaseHealth
} from "@flowforge/database";

import dotenv from "dotenv";

dotenv.config({
  path: "../../.env"
});

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(express.json());

app.get("/health", async (_req, res) => {
  const databaseHealthy = await checkDatabaseHealth();

  res.status(databaseHealthy ? 200 : 503).json({
    status: databaseHealthy ? "ok" : "degraded",
    service: "flowforge-api",
    database: databaseHealthy ? "connected" : "unavailable"
  });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`flowforge API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start flowforge API:", error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log("Shutting down flowforge API...");

  await closeDatabase();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();