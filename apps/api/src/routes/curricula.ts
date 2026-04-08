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

const CURRICULUM_SELECT_COLUMNS = "id,title,slug,description,created_at";
const TOPIC_SELECT_COLUMNS = "id,curriculum_id,title,description,order_index,status";
const SLUG_INSERT_RETRY_LIMIT = 5;
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

  let body: {
    title: string;
    description: string;
    topics: { title: string; description: string; orderIndex: number }[];
  };
  try {
    body = await c.req.json<{
      title: string;
      description: string;
      topics: { title: string; description: string; orderIndex: number }[];
    }>();
  } catch {
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  const { title, description, topics } = body;

  //バリデーションチェック
  const missingTitleOrDescription =
    typeof title !== "string" ||
    typeof description !== "string" ||
    title.trim().length === 0 ||
    description.trim().length === 0;
  const missingTopics = !topics;
  if (missingTitleOrDescription || missingTopics) {
    if (missingTitleOrDescription && missingTopics) {
      return c.json(
        { message: "title, description, and topics are required" },
        400,
      );
    }
    if (missingTitleOrDescription) {
      return c.json({ message: "title and description are required" }, 400);
    }
    return c.json({ message: "topics are required" }, 400);
  }
  if (!Array.isArray(topics)) {
    return c.json({ message: "topics must be an array" }, 400);
  }
  if (topics.length === 0) {
    return c.json({ message: "topics require at least one topic" }, 400);
  }
  if (
    topics.some(
      (topic) =>
        !topic ||
        typeof topic !== "object" ||
        typeof topic.title !== "string" ||
        typeof topic.description !== "string" ||
        topic.title.trim().length === 0 ||
        topic.description.trim().length === 0 ||
        !Number.isInteger(topic.orderIndex) ||
        topic.orderIndex < 1,
    )
  ) {
    return c.json(
      {
        message:
          "topics must have title, description, and orderIndex (positive integer)",
      },
      400,
    );
  }
  //orderIndexの重複チェック
  const orderIndexSet = new Set(topics.map((t) => t.orderIndex));
  if (orderIndexSet.size !== topics.length) {
    return c.json({ message: "topics orderIndex must be unique" }, 400);
  }

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const normalizedTopics = topics.map((topic) => ({
    ...topic,
    title: topic.title.trim(),
    description: topic.description.trim(),
  }));

  const baseSlug = generateBaseSlug(normalizedTitle);
  let curriculumData:
    | {
        id: string;
        title: string;
        slug: string;
        description: string;
        created_at: string;
      }
    | null = null;
  let topicsData:
    | {
        id: string;
        curriculum_id: string;
        title: string;
        description: string;
        order_index: number;
        status: string;
      }[]
    | null = null;
  let shouldFallbackToManualInsert = false;

  for (let attempt = 0; attempt < SLUG_INSERT_RETRY_LIMIT; attempt++) {
    let slug: string;
    try {
      slug = await resolveUniqueSlug(supabaseForUser, user.id, baseSlug);
    } catch (err) {
      console.error(err);
      return c.json({ message: "Failed to generate slug" }, 500);
    }

    const { data: rpcData, error: rpcError } = await supabaseForUser.rpc(
      "create_curriculum_with_topics",
      {
        p_user_id: user.id,
        p_title: normalizedTitle,
        p_description: normalizedDescription,
        p_slug: slug,
        p_topics: normalizedTopics.map((t) => ({
          title: t.title,
          description: t.description,
          order_index: t.orderIndex,
          status: "not_started",
        })),
      },
    );
    if (!rpcError) {
      const created = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const rpcCurriculum = created?.curriculum ?? null;
      const rpcTopics = created?.topics ?? [];
      if (!rpcCurriculum) {
        return c.json({ message: "Failed to create curriculum" }, 500);
      }
      return c.json(
        {
          message: "Curriculum created successfully",
          curriculum: rpcCurriculum,
          topics: rpcTopics,
        },
        201,
      );
    }
    if (rpcError.code === "PGRST202") {
      shouldFallbackToManualInsert = true;
      break;
    }
    if (rpcError.code === "23505") {
      continue;
    }
    console.error(rpcError);
    return c.json({ message: "Failed to create curriculum" }, 500);
  }

  if (!shouldFallbackToManualInsert) {
    return c.json({ message: "Failed to create curriculum" }, 500);
  }

  for (let attempt = 0; attempt < SLUG_INSERT_RETRY_LIMIT; attempt++) {
    let slug: string;
    try {
      slug = await resolveUniqueSlug(supabaseForUser, user.id, baseSlug);
    } catch (err) {
      console.error(err);
      return c.json({ message: "Failed to generate slug" }, 500);
    }

    const { data, error } = await supabaseForUser
      .from("curricula")
      .insert({
        user_id: user.id,
        title: normalizedTitle,
        description: normalizedDescription,
        slug,
      })
      .select(CURRICULUM_SELECT_COLUMNS)
      .single();

    if (!error) {
      curriculumData = data;
      break;
    }

    if (error.code === "23505") {
      continue;
    }

    console.error(error);
    return c.json({ message: "Failed to create curriculum" }, 500);
  }

  if (!curriculumData) {
    return c.json({ message: "Failed to create curriculum" }, 500);
  }

  {
    const { data, error } = await supabaseForUser
      .from("topics")
      .insert(
        normalizedTopics.map((t) => ({
          curriculum_id: curriculumData!.id,
          title: t.title,
          description: t.description,
          order_index: t.orderIndex,
          status: "not_started",
        })),
      )
      .select(TOPIC_SELECT_COLUMNS);
    if (error) {
      console.error(error);

      const { error: rollbackError } = await supabaseForUser
        .from("curricula")
        .delete()
        .eq("id", curriculumData.id);

      if (rollbackError) {
        console.error(rollbackError);
        return c.json(
          {
            message:
              "Failed to create topics and failed to rollback curriculum",
          },
          500,
        );
      }
      return c.json({ message: "Failed to create topics" }, 500);
    }
    topicsData = data;
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
