import { z } from "zod";

export const SaveSummarySchema = z
  .object({
    topic_id: z.uuid(),
    content: z.string().trim().min(1).max(10000),
  })
  .strict();

export type SaveSummaryInput = z.infer<typeof SaveSummarySchema>;
