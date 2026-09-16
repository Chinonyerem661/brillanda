import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/router";
import { usersRouter } from "./modules/users/router";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
