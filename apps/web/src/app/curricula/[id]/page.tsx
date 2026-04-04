"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  not_started: "未開始",
  in_progress: "学習中",
  completed: "完了",
};

type Topic = {
  id: string;
  title: string;
  status: string;
  order_index: number;
};

type Curriculum = {
  id: string;
  title: string;
  description: string | null;
};

export default function CurriculumDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const token = session.access_token;
      const [cRes, tRes] = await Promise.all([
        fetchWithAuth(`/curricula/${id}`, token),
        fetchWithAuth(`/curricula/${id}/topics`, token),
      ]);
      if (!cRes.ok || !tRes.ok) {
        setError("取得に失敗しました");
        setLoading(false);
        return;
      }
      setCurriculum(await cRes.json());
      setTopics(await tRes.json());
      setLoading(false);
    });
  }, [id, router]);

  if (loading) return <p className="p-8">読み込み中...</p>;
  if (error) return <p className="p-8 text-red-500">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Link href="/curricula" className="text-sm text-blue-600 hover:underline">
        ← 一覧に戻る
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">{curriculum?.title}</h1>
      {curriculum?.description && (
        <p className="text-gray-600 mb-6">{curriculum.description}</p>
      )}
      <ul className="space-y-3">
        {topics.map((t) => (
          <li key={t.id}>
            <Link
              href={`/topics/${t.id}`}
              className="flex justify-between items-center p-4 bg-white rounded shadow hover:bg-gray-50"
            >
              <span className="font-medium">{t.title}</span>
              <span className="text-sm text-gray-500">
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
