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
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "../auth/auth.js";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { AppError } from "../lib/errors.js";
import { SaveSummarySchema } from "../schemas/summary.js";
import { saveSummary } from "../services/summary-service.js";

const summariesRouter = new Hono();

// Save a new summary for a topic
summariesRouter.post(
  "/",
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
    const token = await getAccessTokenFromHeader(c);
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getCurrentUserFromToken(token);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid token error" });
    }

    const body = c.req.valid("json");

    try {
      const saved = await saveSummary(token, body);
      return c.json(saved, 201);
    } catch (err) {
      if (err instanceof AppError) {
        throw new HTTPException(err.status, {
          message: err.message,
          cause: err,
        });
      }
      throw err;
    }
  },
);

export default summariesRouter;
