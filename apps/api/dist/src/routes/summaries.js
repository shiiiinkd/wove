/**
 * Role:
 * - summary 保存APIを提供するルーター。
 *
 * Scope (MVP):
 * - POST /summaries
 *
 * Business Rule:
 * - 最新summaryは topic ごとに1件のみ（is_latest=true）。
 * - summary 保存時に、対応 topic の status を completed に更新する。
 *
 * Note:
 * - 複数更新の整合性を保つため、DB側のRPCに処理を集約する。
 */
import { Hono } from "hono";
import { createSupabaseClientWithToken } from "../lib/supabase.js";
import { getAccessTokenFromHeader, getCurrentUserFromToken, } from "../auth/auth.js";
const summariesRouter = new Hono();
// Save a new summary for a topic
summariesRouter.post("/", async (c) => {
    const token = await getAccessTokenFromHeader(c);
    if (!token) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    const user = await getCurrentUserFromToken(token);
    if (!user) {
        return c.json({ message: "Invalid token" }, 401);
    }
    const body = await c.req.json();
    const { topic_id, content } = body;
    if (!topic_id || !content) {
        return c.json({ message: "topic_id and content are required" }, 400);
    }
    const supabaseForUser = createSupabaseClientWithToken(token);
    const { data, error } = await supabaseForUser.rpc("save_summary_and_complete_topic", {
        p_topic_id: topic_id,
        p_content: content,
    });
    if (error) {
        console.error(error);
        if (error.code === "22P02") {
            return c.json({ message: "Invalid topic_id format" }, 400);
        }
        if (error.code === "23503") {
            return c.json({ message: "Topic not found" }, 404);
        }
        return c.json({ message: "Failed to save summary" }, 500);
    }
    // returns table(...) なので通常は配列で返る
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved) {
        return c.json({ message: "No summary returned from RPC" }, 500);
    }
    return c.json(saved, 201);
});
export default summariesRouter;
