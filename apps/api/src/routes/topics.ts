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
import type { Next } from "hono";
import { requireAuth } from "../auth/require-auth.js";
import { zValidator } from "@hono/zod-validator";
import { getTopicById, updateTopic } from "../services/topic-service.js";
import { TopicIdParamSchema, UpdateTopicSchema } from "../schemas/topic.js";

type Variables = {
  token: string;
};

const topicsRouter = new Hono<{ Variables: Variables }>();

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

    const { token } = await requireAuth(c);

    const data = await getTopicById(token, id);
    return c.json(data, 200);
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
  async (c, next: Next) => {
    const { token } = await requireAuth(c);
    c.set("token", token);
    return next();
  },
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

    const token = c.get("token");

    const data = await updateTopic(token, id, body);
    return c.json(data, 200);
  },
);

export default topicsRouter;
