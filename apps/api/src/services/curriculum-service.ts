// 認証済みユーザーIDを使って保存する
// slugを生成する
// curriculum を保存する
// topics をまとめて保存する
// DBエラーをアプリの意味に変換する

import { createSupabaseClientWithToken } from "../lib/supabase.js";
import { AppError } from "../lib/errors.js";

export const getCurricula = async (token: string) => {
  const supabaseForUser = createSupabaseClientWithToken(token);
  const { data, error } = await supabaseForUser
    .from("curricula")
    .select("id,title,slug,description,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const getCurriculaById = async (token: string, id: string) => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("curricula")
    .select("id,title,slug,description,created_at")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      throw new AppError("Curriculum not found", 404);
    }
    if (error.code === "22P02") {
      throw new AppError("Invalid curriculum id", 400);
    }
    throw error;
  }
  return data;
};

export const getTopicsByCurriculumId = async (token: string, id: string) => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("topics")
    .select("id,title,description,order_index,status")
    .eq("curriculum_id", id)
    .order("order_index", { ascending: true });
  if (error) throw error;
  // topics が空の場合のみ、curriculum の存在確認を行う（404 セマンティクスのため）
  if (data.length === 0) {
    const { error: curriculumError } = await supabaseForUser
      .from("curricula")
      .select("id")
      .eq("id", id)
      .single();
    if (curriculumError) {
      if (curriculumError.code === "PGRST116") {
        throw new AppError("Curriculum not found", 404);
      }
      if (curriculumError.code === "22P02") {
        throw new AppError("Invalid curriculum id", 400);
      }
      throw curriculumError;
    }
  }
  return data;
};
