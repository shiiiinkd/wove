import type { TopicData } from "./topic.js";

export type CurriculumData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  created_at: string;
};

export type CreateCurriculumResult = {
  curriculum: CurriculumData;
  topics: TopicData[];
};
