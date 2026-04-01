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
import { createSupabaseClientWithToken } from "../lib/supabase.js";
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "../auth/auth.js";

const topicsRouter = new Hono();

// Get a single topic
topicsRouter.get("/:id", async (c) => {
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

  // topics を取得。
  const { data: topic, error: topicError } = await supabaseForUser
    .from("topics")
    .select("id,curriculum_id,title,description,order_index,status")
    .eq("id", id)
    .single();
  if (topicError) {
    console.error(topicError);
    if (topicError?.code === "PGRST116") {
      return c.json({ message: "Topic not found" }, 404);
    }
    return c.json({ message: "Failed to fetch topic" }, 500);
  }

  // is_latest の最新 summary を取得。summaryの未存在は 200+null で返す。
  const { data: summary, error: summaryError } = await supabaseForUser
    .from("summaries")
    .select("id,content,created_at")
    .eq("topic_id", id)
    .eq("is_latest", true)
    .maybeSingle();
  if (summaryError) {
    console.error(summaryError);
    return c.json({ message: "Failed to fetch summary" }, 500);
  }
  return c.json({ ...topic, latest_summary: summary ?? null }, 200);
});

// MVPでは topic 構造編集を許可しないため、更新対象を title/description に限定する。
topicsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const user = await getCurrentUserFromToken(token);
  if (!user) {
    return c.json({ message: "Invalid token" }, 401);
  }

  // bodyは全体で必要だが、try内で再代入が必要なためletで宣言。
  let body: { title?: string; description?: string };
  try {
    body = await c.req.json<{ title?: string; description?: string }>();
  } catch {
    // JSONパースエラーのみcatchする
    return c.json({ message: "Invalid JSON body" }, 400);
  }
  const { title, description } = body;

  // 空更新を防ぐ。少なくとも1フィールドは指定必須。
  if (title === undefined && description === undefined) {
    return c.json({ message: "No fields to update" }, 400);
  }

  const updateFields: { title?: string; description?: string } = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;

  const supabaseForUser = createSupabaseClientWithToken(token);
  const { data, error } = await supabaseForUser
    .from("topics")
    .update(updateFields)
    .eq("id", id)
    .select("id,curriculum_id,title,description,order_index,status")
    .single();
  if (error) {
    console.error(error);
    if (error.code === "PGRST116") {
      return c.json({ message: "Topic not found" }, 404);
    }
    return c.json({ message: "Failed to update topic" }, 500);
  }
  return c.json(data, 200);
});

export default topicsRouter;
