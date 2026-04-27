/**
 * Role:
 * - Hono アプリのエントリポイント。
 * - ルーターのマウントとサーバー起動のみを担当する。
 *
 * Policy:
 * - ビジネスロジックは routes/auth/lib 側に置き、ここには集約しない。
 */

import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import curriculaRouter from "./routes/curricula.js";
import topicsRouter from "./routes/topics.js";
import summariesRouter from "./routes/summaries.js";
import { HTTPException } from "hono/http-exception";
import { AppError } from "./lib/errors.js";

const app = new Hono();

// CORSミドルウェアの実装。
// ブラウザからの cross-origin リクエスト用。Preflight は OPTIONS。
// CORS_ORIGIN 環境変数でカンマ区切りの複数オリジンを指定可能。
// 未設定時は http://localhost:3000 をデフォルトとして使用する。

const rawOrigins = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const normalizedAllowedOrigins =
  allowedOrigins.length > 0 ? allowedOrigins : ["http://localhost:3000"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return undefined;
      }
      return normalizedAllowedOrigins.includes(origin) ? origin : undefined;
    },
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ message: err.message }, err.status);
  }
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status);
  }
  console.error(err);
  return c.json({ message: "Internal server error" }, 500);
});

// routes
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/curricula", curriculaRouter);
app.route("/topics", topicsRouter);
app.route("/summaries", summariesRouter);

const port = Number(process.env.PORT ?? 8080);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
