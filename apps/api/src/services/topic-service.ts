import { AppError } from "../lib/errors.js";
import { createSupabaseClientWithToken } from "../lib/supabase.js";
import type { UpdateTopicInput } from "../schemas/topic.js";
import type { TopicData, TopicWithLatestSummary } from "../types/topic.js";

const TOPIC_SELECT_COLUMNS =
  "id,curriculum_id,title,description,order_index,status";
const SUMMARY_SELECT_COLUMNS = "id,content,created_at";

export const getTopicById = async (
  token: string,
  id: string,
): Promise<TopicWithLatestSummary> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data: topic, error: topicError } = await supabaseForUser
    .from("topics")
    .select(TOPIC_SELECT_COLUMNS)
    .eq("id", id)
    .single();

  if (topicError) {
    if (topicError.code === "PGRST116") {
      throw new AppError("Topic not found", 404);
    }
    if (topicError.code === "22P02") {
      throw new AppError("Invalid topic id", 400);
    }
    throw new AppError("Failed to fetch topic", 500);
  }

  const { data: summary, error: summaryError } = await supabaseForUser
    .from("summaries")
    .select(SUMMARY_SELECT_COLUMNS)
    .eq("topic_id", id)
    .eq("is_latest", true)
    .maybeSingle();

  if (summaryError) {
    throw new AppError("Failed to fetch summary", 500);
  }

  return {
    ...topic,
    latest_summary: summary ?? null,
  };
};

export const updateTopic = async (
  token: string,
  id: string,
  body: UpdateTopicInput,
): Promise<TopicData> => {
  const supabaseForUser = createSupabaseClientWithToken(token);
  const updateFields: UpdateTopicInput = {};

  if (body.title !== undefined) updateFields.title = body.title;
  if (body.description !== undefined) {
    updateFields.description = body.description;
  }

  const { data, error } = await supabaseForUser
    .from("topics")
    .update(updateFields)
    .eq("id", id)
    .select(TOPIC_SELECT_COLUMNS)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new AppError("Topic not found", 404);
    }
    if (error.code === "22P02") {
      throw new AppError("Invalid topic id", 400);
    }
    throw new AppError("Failed to update topic", 500);
  }

  return data;
};
