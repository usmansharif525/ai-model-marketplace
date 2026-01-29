import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { chainRouter } from "./routes/chain";
import { dashboardRouter } from "./routes/dashboard";
import { metaRouter, modelsRouter } from "./routes/models";
import { getChainStatus } from "./chain/marketplace";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_ORIGIN || "",
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", async (_req, res) => {
  const chain = await getChainStatus();
  res.json({
    name: "NuvyraHub API",
    version: "1.1.0",
    chain,
    docs: {
      health: "GET /api/health",
      models: "GET /api/models",
      model: "GET /api/models/:slug",
      createModel: "POST /api/models",
      acquire: "POST /api/models/:slug/acquire",
      infer: "POST /api/models/:slug/infer",
      chainStatus: "GET /api/chain/status",
      chainConfig: "GET /api/chain/config",
      chainListing: "GET /api/chain/listing/:slug",
      chainList: "POST /api/chain/list/:slug",
      chainAcquire: "POST /api/chain/acquire/:slug",
      categories: "GET /api/categories",
      tags: "GET /api/tags",
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login",
      wallet: "POST /api/auth/wallet",
      me: "GET /api/auth/me",
      dashboard: "GET /api/dashboard",
    },
  });
});

app.use("/api", metaRouter);
app.use("/api/models", modelsRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/chain", chainRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "InternalServerError" });
  },
);

app.listen(PORT, () => {
  console.log(`NuvyraHub API listening on http://localhost:${PORT}`);
});