export type CurriculumData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  created_at: string;
};

export type TopicData = {
  id: string;
  curriculum_id: string;
  title: string;
  description: string;
  order_index: number;
  status: string;
};

export type CreateCurriculumResult = {
  curriculum: CurriculumData;
  topics: TopicData[];
};
