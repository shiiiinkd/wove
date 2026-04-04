type TopicStatus = "not_started" | "in_progress" | "completed";

const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "未開始",
  in_progress: "学習中",
  completed: "完了",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABEL[status as TopicStatus] ?? status;
}
