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
import type { CurriculumInput } from "../schemas/curriculum.js";

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
curriculaRouter.get("/:id", async (c) => {
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
});

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
curriculaRouter.post("/", async (c) => {
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid token error" });
  }
  let body: CurriculumInput;
  try {
    body = await c.req.json<CurriculumInput>();
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new HTTPException(400, { message: "Invalid JSON body" });
    }
    throw err;
  }
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
});

export default curriculaRouter;
