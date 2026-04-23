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
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "../auth/auth.js";
import {
  getCurricula,
  getCurriculaById,
  getTopicsByCurriculumId,
  saveCurriculumAndTopics,
} from "../services/curriculum-service.js";
import { AppError } from "../lib/errors.js";
import { HTTPException } from "hono/http-exception";
import {
  CurriculumIdParamSchema,
  SaveCurriculumSchema,
} from "../schemas/curriculum.js";
import { zValidator } from "@hono/zod-validator";

const curriculaRouter = new Hono();

// 一覧は新しい作成順で返す（画面上で最近の学習を先に確認しやすくするため）
curriculaRouter.get("/", async (c) => {
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid token error" });
  }
  try {
    const data = await getCurricula(token);
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

    const token = await getAccessTokenFromHeader(c);
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getCurrentUserFromToken(token);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid token error" });
    }

    try {
      const data = await getCurriculaById(token, id);
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

// 業務ルール: topics は order_index で順序管理するため ASC（昇順） で返す。
curriculaRouter.get("/:id/topics", async (c) => {
  const id = c.req.param("id");

  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid token error" });
  }
  try {
    const data = await getTopicsByCurriculumId(token, id);
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
});

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
      const result = await saveCurriculumAndTopics(token, user, body);

      return c.json(
        {
          message: "Curriculum created successfully",
          curriculum: result.curriculum,
          topics: result.topics,
        },
        201,
      );
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

export default curriculaRouter;
