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
import { createSupabaseClientWithToken } from "../lib/supabase.js";
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "../auth/auth.js";
import { generateBaseSlug, resolveUniqueSlug } from "../lib/slug.js";
const curriculaRouter = new Hono();

// 一覧は新しい作成順で返す（画面上で最近の学習を先に確認しやすくするため）
curriculaRouter.get("/", async (c) => {
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    return c.json({ message: "Invalid token" }, 401);
  }
  const supabaseForUser = createSupabaseClientWithToken(token);
  const { data, error } = await supabaseForUser
    .from("curricula")
    .select("id,title,slug,description,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return c.json({ message: "Failed to fetch curricula" }, 500);
  }
  return c.json(data, 200);
});

// Get a single curriculum
curriculaRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    return c.json({ message: "Invalid token" }, 401);
  }
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("curricula")
    .select("id,title,slug,description,created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    if (error.code === "PGRST116") {
      return c.json({ message: "Curriculum not found" }, 404);
    }
    if (error.code === "22P02") {
      return c.json({ message: "Invalid curriculum id" }, 400);
    }
    return c.json({ message: "Failed to fetch curriculum" }, 500);
  }
  return c.json(data, 200);
});

// 業務ルール: topics は order_index で順序管理するため ASC（昇順） で返す。
curriculaRouter.get("/:id/topics", async (c) => {
  const id = c.req.param("id");
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    return c.json({ message: "Invalid token" }, 401);
  }
  const supabaseForUser = createSupabaseClientWithToken(token);

  // まず topics を取得する（通常ケースでは1クエリで完結）
  const { data, error } = await supabaseForUser
    .from("topics")
    .select("id,title,description,order_index,status")
    .eq("curriculum_id", id)
    .order("order_index", { ascending: true });
  if (error) {
    console.error(error);
    return c.json({ message: "Failed to fetch topics" }, 500);
  }

  // topics が空の場合のみ、curriculum の存在確認を行う（404 セマンティクスのため）
  if (data.length === 0) {
    const { error: curriculumError } = await supabaseForUser
      .from("curricula")
      .select("id")
      .eq("id", id)
      .single();

    if (curriculumError) {
      console.error(curriculumError);
      if (curriculumError.code === "PGRST116") {
        return c.json({ message: "Curriculum not found" }, 404);
      }
      if (curriculumError.code === "22P02") {
        return c.json({ message: "Invalid curriculum id" }, 400);
      }
      return c.json({ message: "Failed to fetch curriculum" }, 500);
    }
  }

  return c.json(data, 200);
});

// curriculum,topicsを保存する
curriculaRouter.post("/", async (c) => {
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    return c.json({ message: "Invalid token" }, 401);
  }
  const supabaseForUser = createSupabaseClientWithToken(token);
  const body = await c.req.json<{
    title: string;
    description: string;
    topics: { title: string; description: string; orderIndex: number }[];
  }>();
  const { title, description, topics } = body;

  //バリデーションチェック
  if (!title || !description || !topics) {
    return c.json(
      { message: "title, description, and topics are required" },
      400,
    );
  }
  if (!title || !description) {
    return c.json({ message: "title and description are required" }, 400);
  }
  if (!topics) {
    return c.json({ message: "topics are required" }, 400);
  }
  if (topics.length === 0) {
    return c.json({ message: "topics require at least one topic" }, 400);
  }
  if (
    topics.some(
      (topic) => !topic.title || !topic.description || !topic.orderIndex,
    )
  ) {
    return c.json(
      { message: "topics must have title, description, and orderIndex" },
      400,
    );
  }
  //orderIndexの重複チェック
  const orderIndexSet = new Set(topics.map((t) => t.orderIndex));
  if (orderIndexSet.size !== topics.length) {
    return c.json({ message: "topics orderIndex must be unique" }, 400);
  }

  const baseSlug = generateBaseSlug(title);
  const slug = await resolveUniqueSlug(supabaseForUser, user.id, baseSlug);

  const { data: curriculumData, error: curriculumError } = await supabaseForUser
    .from("curricula")
    .insert({ user_id: user.id, title, description, slug })
    .select()
    .single();

  if (curriculumError) {
    console.error(curriculumError);
    return c.json({ message: "Failed to create curriculum" }, 500);
  }
  const { data: topicsData, error: topicsError } = await supabaseForUser
    .from("topics")
    .insert(
      topics.map((t) => ({
        curriculum_id: curriculumData.id,
        title: t.title,
        description: t.description,
        order_index: t.orderIndex,
        status: "not_started",
      })),
    )
    .select();
  if (topicsError) {
    console.error(topicsError);
    return c.json({ message: "Failed to create topics" }, 500);
  }
  return c.json(
    {
      message: "Curriculum created successfully",
      curriculum: curriculumData,
      topics: topicsData,
    },
    201,
  );
});
export default curriculaRouter;
