/**
 * Role:
 * - summary 保存APIを提供するルーター。
 *
 * Scope (MVP):
 * - POST /summaries
 *
 * Business Rule:
 * - 最新summaryは topic ごとに1件のみ（is_latest=true）。
 * - summary 保存時に、対応 topic の status を completed に更新する。
 *
 * Note:
 * - 複数更新の整合性を保つため、DB側のRPCに処理を集約する。
 */

import { Hono } from "hono";
import type { Next } from "hono";
import { requireAuth } from "../auth/require-auth.js";
import { zValidator } from "@hono/zod-validator";
import { SaveSummarySchema } from "../schemas/summary.js";
import { saveSummary } from "../services/summary-service.js";

type Variables = {
  token: string;
};

const summariesRouter = new Hono<{ Variables: Variables }>();

// Save a new summary for a topic
summariesRouter.post(
  "/",
  async (c, next: Next) => {
    const { token } = await requireAuth(c);
    c.set("token", token);
    return next();
  },
  zValidator("json", SaveSummarySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Invalid request body",
          issues: result.error.issues,
        },
        400,
      );
    }
  }),
  async (c) => {
    const token = c.get("token");

    const body = c.req.valid("json");

    const saved = await saveSummary(token, body);
    return c.json(saved, 201);
  },
);

export default summariesRouter;
