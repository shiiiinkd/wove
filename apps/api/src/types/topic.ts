export type TopicData = {
  id: string;
  curriculum_id: string;
  title: string;
  description: string | null;
  order_index: number;
  status: string;
};

export type LatestSummaryData = {
  id: string;
  content: string;
  created_at: string;
} | null;

export type TopicWithLatestSummary = TopicData & {
  latest_summary: LatestSummaryData;
};
