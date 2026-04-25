import { z } from "zod";

export const TopicIdParamSchema = z.object({
  id: z.uuid(),
});

export const UpdateTopicSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.title === undefined && data.description === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "No fields to update",
      });
    }
  });

export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
