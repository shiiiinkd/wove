import { AppError } from "../lib/errors.js";
import { createSupabaseClientWithToken } from "../lib/supabase.js";
import type { SaveSummaryInput } from "../schemas/summary.js";
import type { SummaryData } from "../types/summary.js";

export const saveSummary = async (
  token: string,
  body: SaveSummaryInput,
): Promise<SummaryData> => {
  const supabaseForUser = createSupabaseClientWithToken(token);

  const { data, error } = await supabaseForUser.rpc(
    "save_summary_and_complete_topic",
    {
      p_topic_id: body.topic_id,
      p_content: body.content,
    },
  );

  if (error) {
    if (error.code === "22P02") {
      throw new AppError("Invalid topic_id format", 400);
    }
    if (error.code === "23503") {
      throw new AppError("Topic not found", 404);
    }
    throw new AppError("Failed to save summary", 500);
  }

  // returns table(...) なので通常は配列で返る
  const saved = Array.isArray(data) ? data[0] : data;

  if (!saved) {
    throw new AppError("No summary returned from RPC", 500);
  }

  return saved;
};
