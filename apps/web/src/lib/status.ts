type TopicStatus = "not_started" | "in_progress" | "completed";
const TOPIC_STATUSES: TopicStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "未開始",
  in_progress: "学習中",
  completed: "完了",
};

function isTopicStatus(status: string): status is TopicStatus {
  return TOPIC_STATUSES.includes(status as TopicStatus);
}

export function getStatusLabel(status: string): string {
  if (!isTopicStatus(status)) return status;
  return STATUS_LABEL[status];
}
