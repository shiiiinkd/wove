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
    console.log(error);
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
    console.log(error);
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
  const { data, error } = await supabaseForUser
    .from("topics")
    .select("id,title,description,order_index,status")
    .eq("curriculum_id", id)
    .order("order_index", { ascending: true });
  if (error) {
    console.log(error);
    return c.json({ message: "Failed to fetch topics" }, 500);
  }
  return c.json(data, 200);
});

export default curriculaRouter;
