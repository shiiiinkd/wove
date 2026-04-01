/**
 * Role:
 * - Hono アプリのエントリポイント。
 * - ルーターのマウントとサーバー起動のみを担当する。
 *
 * Policy:
 * - ビジネスロジックは routes/auth/lib 側に置き、ここには集約しない。
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import curriculaRouter from "./routes/curricula.js";
import topicsRouter from "./routes/topics.js";
import summariesRouter from "./routes/summaries.js";
const app = new Hono();
app.get("/", (c) => {
    return c.text("Hello Hono!");
});
app.route("/curricula", curriculaRouter);
app.route("/topics", topicsRouter);
app.route("/summaries", summariesRouter);
serve({
    fetch: app.fetch,
    port: 3000,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
