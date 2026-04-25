/**
 * Role:
 * - topic 単体の取得・更新APIを提供するルーター。
 *
 * Scope (MVP):
 * - GET /topics/:id
 * - PATCH /topics/:id
 *
 * Constraint:
 * - PATCH で更新可能なのは title / description のみ。
 * - status や order_index の変更はMVP対象外。
 */

import { Hono } from "hono";
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "../auth/auth.js";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { AppError } from "../lib/errors.js";
import { getTopicById, updateTopic } from "../services/topic-service.js";
import { TopicIdParamSchema, UpdateTopicSchema } from "../schemas/topic.js";

const topicsRouter = new Hono();

// Get a single topic
topicsRouter.get(
  "/:id",
  zValidator("param", TopicIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Invalid topic id",
          issues: result.error.issues,
        },
        400,
      );
    }
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const token = await getAccessTokenFromHeader(c);
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getCurrentUserFromToken(token);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid token error" });
    }

    try {
      const data = await getTopicById(token, id);
      return c.json(data, 200);
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

// MVPでは topic 構造編集を許可しないため、更新対象を title/description に限定する。
topicsRouter.patch(
  "/:id",
  zValidator("param", TopicIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Invalid topic id",
          issues: result.error.issues,
        },
        400,
      );
    }
  }),
  zValidator("json", UpdateTopicSchema, (result, c) => {
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
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const token = await getAccessTokenFromHeader(c);
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getCurrentUserFromToken(token);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid token error" });
    }

    try {
      const data = await updateTopic(token, id, body);
      return c.json(data, 200);
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

export default topicsRouter;
