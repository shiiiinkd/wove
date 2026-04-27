import { z } from "zod";

export const CurriculumIdParamSchema = z.object({
  id: z.uuid(),
});

export const TopicSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
    orderIndex: z.number().int().min(1),
  })
  .strict();

export const SaveCurriculumBaseSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(1000),
    topics: z.array(TopicSchema).min(1).max(20),
  })
  .strict();

// .superRefineでオブジェクト全体をチェック（z.は単一の値のみをチェック）
export const SaveCurriculumSchema = SaveCurriculumBaseSchema.superRefine(
  (data, ctx) => {
    // uniqueIndices: orderIndexの重複を削除したもの
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

export type SaveCurriculumInput = z.infer<typeof SaveCurriculumSchema>; // 入力型を定義
