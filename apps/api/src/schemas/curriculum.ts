// 入力型を定義
export type CurriculumInput = {
  title: string;
  description: string;
  topics: TopicInput[];
};

export type TopicInput = {
  title: string;
  description: string;
  orderIndex: number;
};
