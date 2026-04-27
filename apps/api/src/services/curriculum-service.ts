// 認証済みユーザーIDを使って保存する
// slugを生成する
// curriculum を保存する
// topics をまとめて保存する
// DBエラーをアプリの意味に変換する

import { createSupabaseClientWithToken } from "../lib/supabase.js";
import { AppError } from "../lib/errors.js";
import type {
  CurriculumData,
  CreateCurriculumResult,
} from "../types/curriculum.js";
import type { TopicData } from "../types/topic.js";
import { generateBaseSlug, resolveUniqueSlug } from "../lib/slug.js";
import type { User } from "@supabase/supabase-js";
import type { SaveCurriculumInput } from "../schemas/curriculum.js";

const CURRICULUM_SELECT_COLUMNS = "id,title,slug,description,created_at";
const TOPIC_SELECT_COLUMNS =
  "id,curriculum_id,title,description,order_index,status";
const SLUG_INSERT_RETRY_LIMIT = 5;

export const getCurricula = async (
  token: string,
): Promise<CurriculumData[]> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("curricula")
    .select(CURRICULUM_SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("Failed to fetch curricula", 500);
  }
  return data;
};

export const getCurriculumById = async (
  token: string,
  id: string,
): Promise<CurriculumData> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("curricula")
    .select(CURRICULUM_SELECT_COLUMNS)
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

export const getTopicsByCurriculumId = async (
  token: string,
  id: string,
): Promise<TopicData[]> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser
    .from("topics")
    .select(TOPIC_SELECT_COLUMNS)
    .eq("curriculum_id", id)
    .order("order_index", { ascending: true });

  if (error) {
    if (error.code === "22P02") {
      throw new AppError("Invalid curriculum id", 400);
    }
    throw new AppError("Failed to fetch topics", 500);
  }
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
      throw new AppError("Failed to fetch curriculum", 500);
    }
  }
  return data;
};

export const saveCurriculumAndTopics = async (
  token: string,
  user: User,
  body: SaveCurriculumInput,
): Promise<CreateCurriculumResult> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  // route 側で SaveCurriculumSchema による検証・整形済みを前提にする
  const normalizedTitle = body.title;
  const normalizedDescription = body.description;
  const normalizedTopics = [...body.topics]
    .map((topic) => ({
      title: topic.title,
      description: topic.description,
      orderIndex: topic.orderIndex,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const baseSlug = generateBaseSlug(normalizedTitle);
  let curriculumData: CurriculumData | null = null;
  let shouldFallbackToManualInsert = false;

  // まずは RPC を使った一括保存を試す
  for (let attempt = 0; attempt < SLUG_INSERT_RETRY_LIMIT; attempt++) {
    let slug: string;

    try {
      slug = await resolveUniqueSlug(supabaseForUser, user.id, baseSlug);
    } catch {
      throw new AppError("Failed to generate slug", 500);
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
      const rpcCurriculum = (created?.curriculum ??
        null) as CurriculumData | null;
      const rpcTopics = (created?.topics ?? []) as TopicData[];

      if (!rpcCurriculum) {
        throw new AppError("Failed to create curriculum", 500);
      }

      return {
        curriculum: rpcCurriculum,
        topics: rpcTopics,
      };
    }

    // RPC が存在しない / 見つからないときだけ手動 insert にフォールバック
    if (rpcError.code === "PGRST202") {
      shouldFallbackToManualInsert = true;
      break;
    }

    // slug 競合の可能性があるので再試行
    if (rpcError.code === "23505") {
      continue;
    }
    throw new AppError("Failed to create curriculum", 500);
  }

  if (!shouldFallbackToManualInsert) {
    throw new AppError("Failed to create curriculum", 500);
  }

  for (let attempt = 0; attempt < SLUG_INSERT_RETRY_LIMIT; attempt++) {
    let slug: string;
    try {
      slug = await resolveUniqueSlug(supabaseForUser, user.id, baseSlug);
    } catch {
      throw new AppError("Failed to generate slug", 500);
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

    throw new AppError("Failed to create curriculum", 500);
  }

  if (!curriculumData) {
    throw new AppError("Failed to create curriculum", 500);
  }

  const { data: topicsData, error: topicsError } = await supabaseForUser
    .from("topics")
    .insert(
      normalizedTopics.map((t) => ({
        curriculum_id: curriculumData.id,
        title: t.title,
        description: t.description,
        order_index: t.orderIndex,
        status: "not_started",
      })),
    )
    .select(TOPIC_SELECT_COLUMNS);

  if (topicsError) {
    const { error: rollbackError } = await supabaseForUser
      .from("curricula")
      .delete()
      .eq("id", curriculumData.id);

    if (rollbackError) {
      throw new AppError(
        "Failed to create topics and failed to rollback curriculum",
        500,
      );
    }
    throw new AppError("Failed to create topics", 500);
  }

  return {
    curriculum: curriculumData,
    topics: topicsData,
  };
};
