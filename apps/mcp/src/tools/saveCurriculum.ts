import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TopicSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  orderIndex: z.number().int().min(1),
});

const SaveCurriculumBaseSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  topics: z.array(TopicSchema).min(1),
});

const SaveCurriculumSchema = SaveCurriculumBaseSchema.superRefine(
  (data, ctx) => {
    const indices = data.topics.map((t) => t.orderIndex);
    const uniqueIndices = new Set(indices);

    if (uniqueIndices.size !== indices.length) {
      ctx.addIssue({
        code: "custom",
        path: ["topics"],
        message: "topics 内の orderIndex は重複不可です",
      });
    }
  },
);

type SaveCurriculumInput = z.infer<typeof SaveCurriculumSchema>;

const SaveCurriculumResponseSchema = z.object({
  curriculum: z.object({
    title: z.string(),
    slug: z.string(),
  }),
  topics: z.array(
    z
      .object({
        title: z.string(),
      })
      .loose(),
  ),
});

export function registerSaveCurriculum(server: McpServer) {
  server.registerTool(
    "save_curriculum",
    {
      description: "カリキュラムと topics を Wove に保存する",
      inputSchema: SaveCurriculumBaseSchema.shape,
    },
    async (rawInput) => {
      const parsed = SaveCurriculumSchema.safeParse(rawInput);

      if (!parsed.success) {
        return {
          content: [
            {
              type: "text",
              text: `Error: 入力が不正です: ${parsed.error.message}`,
            },
          ],
          isError: true,
        };
      }

      const input: SaveCurriculumInput = parsed.data;

      const rawApiUrl = process.env.WOVE_API_URL;
      // 開発用: 固定トークンを環境変数から取得
      // 本番では ChatGPT Connector 等でユーザーごとのトークン受け渡しに差し替える
      const token = process.env.SUPABASE_ACCESS_TOKEN;

      if (!rawApiUrl || !token) {
        return {
          content: [
            {
              type: "text",
              text: "Error: WOVE_API_URL または SUPABASE_ACCESS_TOKEN が未設定です",
            },
          ],
          isError: true,
        };
      }

      const apiUrl = rawApiUrl.replace(/\/$/, "");

      let res: Response;
      try {
        res = await fetch(`${apiUrl}/curricula`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        });
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error: API への接続に失敗しました: ${String(e)}`,
            },
          ],
          isError: true,
        };
      }

      if (!res.ok) {
        const text = await res.text();
        return {
          content: [
            {
              type: "text",
              text: `Error: ${res.status} ${text}`,
            },
          ],
          isError: true,
        };
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        return {
          content: [
            {
              type: "text",
              text: "Error: API レスポンスの JSON パースに失敗しました",
            },
          ],
          isError: true,
        };
      }

      const parsedResponse = SaveCurriculumResponseSchema.safeParse(data);
      if (!parsedResponse.success) {
        return {
          content: [
            {
              type: "text",
              text: `Error: API レスポンス形式が不正です: ${parsedResponse.error.message}`,
            },
          ],
          isError: true,
        };
      }

      const result = parsedResponse.data;

      return {
        content: [
          {
            type: "text",
            text: `Saved curriculum "${result.curriculum.title}" (${result.curriculum.slug}) with ${result.topics.length} topics.`,
          },
        ],
      };
    },
  );
}
