import express from "express";

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "flowforge-api"
  });
});

app.listen(PORT, () => {
  console.log(`FlowForge API running on port ${PORT}`);
});