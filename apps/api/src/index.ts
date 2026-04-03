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

const app = new Hono();

// CORSミドルウェアの実装。
// ブラウザからの cross-origin リクエスト用。Preflight は OPTIONS。

app.use(
  "*",
  cors({
    origin: "http://localhost:3000", // Next の dev URL（本番は別ドメインに変更）
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// routes
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/curricula", curriculaRouter);
app.route("/topics", topicsRouter);
app.route("/summaries", summariesRouter);

serve(
  {
    fetch: app.fetch,
    port: 8080,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
