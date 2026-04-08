"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api";
import { getStatusLabel } from "@/lib/status";

type LatestSummary = { id: string; content: string; created_at: string } | null;
type Topic = {
  id: string;
  curriculum_id: string;
  title: string;
  description: string | null;
  status: string;
  latest_summary: LatestSummary;
};

export default function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTopic() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        const res = await fetchWithAuth(`/topics/${id}`, session.access_token);
        if (!res.ok) {
          setError("取得に失敗しました");
          return;
        }
        const data = await res.json();
        setTopic(data);
        setContent(data.latest_summary?.content ?? "");
      } catch {
        setError("取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }

    void loadTopic();
  }, [id, router]);

  async function handleSave(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetchWithAuth("/summaries", session.access_token, {
        method: "POST",
        body: JSON.stringify({ topic_id: id, content }),
      });
      if (!res.ok) {
        setSaveError("保存に失敗しました");
        return;
      }
      const saved = await res.json();
      setTopic((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "completed",
          latest_summary: {
            id: saved.id,
            content: saved.content,
            created_at: saved.created_at,
          },
        };
      });
    } catch {
      setSaveError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-8">読み込み中...</p>;
  if (error || !topic)
    return <p className="p-8 text-red-500">{error ?? "取得エラー"}</p>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link
        href={`/curricula/${topic.curriculum_id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← カリキュラムに戻る
      </Link>
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        <Link
          href={`/topics/${id}/edit`}
          className="text-sm text-blue-600 hover:underline"
        >
          編集
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        {getStatusLabel(topic.status)}
      </p>
      {topic.description && (
        <p className="text-gray-700">{topic.description}</p>
      )}

      <section>
        <h2 className="font-semibold mb-2">最新の要約</h2>
        {topic.latest_summary ? (
          <p className="bg-white p-4 rounded shadow text-gray-700">
            {topic.latest_summary.content}
          </p>
        ) : (
          <p className="text-gray-400">まだ要約がありません</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2">要約を保存する</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            className="w-full border p-3 rounded"
            placeholder="学習内容を要約してください"
          />
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>
      </section>
    </div>
  );
}
