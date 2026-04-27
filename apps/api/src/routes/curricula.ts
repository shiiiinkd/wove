/**
 * Role:
 * - curricula に関する読み取りAPIを提供するルーター。
 *
 * Scope (MVP):
 * - GET /curricula
 * - GET /curricula/:id
 * - GET /curricula/:id/topics
 *
 * Security:
 * - 全エンドポイントで Bearer token を検証し、
 *   ユーザーJWT付きSupabase clientでRLSを前提にアクセスする。
 */

import { Hono } from "hono";
import { requireAuth } from "../auth/require-auth.js";
import {
  getCurricula,
  getCurriculaById,
  getTopicsByCurriculumId,
  saveCurriculumAndTopics,
} from "../services/curriculum-service.js";
import {
  CurriculumIdParamSchema,
  SaveCurriculumSchema,
} from "../schemas/curriculum.js";
import { zValidator } from "@hono/zod-validator";

const curriculaRouter = new Hono();

// 一覧は新しい作成順で返す（画面上で最近の学習を先に確認しやすくするため）
curriculaRouter.get("/", async (c) => {
  const { token } = await requireAuth(c);
  const data = await getCurricula(token);
  return c.json(data, 200);
});

// Get a single curriculum
curriculaRouter.get(
  "/:id",
  zValidator("param", CurriculumIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Invalid curriculum id",
          issues: result.error.issues,
        },
        400,
      );
    }
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const { token } = await requireAuth(c);

    const data = await getCurriculaById(token, id);
    return c.json(data, 200);
  },
);

// 業務ルール: topics は order_index で順序管理するため ASC（昇順） で返す。
curriculaRouter.get(
  "/:id/topics",
  zValidator("param", CurriculumIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Invalid curriculum id",
          issues: result.error.issues,
        },
        400,
      );
    }
  }),
  async (c) => {
    const { id } = c.req.valid("param");

    const { token } = await requireAuth(c);

    const data = await getTopicsByCurriculumId(token, id);
    return c.json(data, 200);
  },
);

// curriculum,topicsを保存する
curriculaRouter.post(
  "/",
  zValidator("json", SaveCurriculumSchema, (result, c) => {
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
    const { token, user } = await requireAuth(c);

    const body = c.req.valid("json");

    const result = await saveCurriculumAndTopics(token, user, body);

    return c.json(
      {
        message: "Curriculum created successfully",
        curriculum: result.curriculum,
        topics: result.topics,
      },
      201,
    );
  },
);

export default curriculaRouter;
