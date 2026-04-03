"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api";

export default function TopicEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetchWithAuth(`/topics/${id}`, session.access_token);
      if (!res.ok) {
        setError("取得に失敗しました");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setTitle(data.title);
      setDescription(data.description ?? "");
      setLoading(false);
    });
  }, [id, router]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    const res = await fetchWithAuth(`/topics/${id}`, session.access_token, {
      method: "PATCH",
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) {
      setError("更新に失敗しました");
      setSaving(false);
      return;
    }
    router.push(`/topics/${id}`);
  }

  if (loading) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link
        href={`/topics/${id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← 詳細に戻る
      </Link>
      <h1 className="text-2xl font-bold">トピックを編集</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border p-2 rounded"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
