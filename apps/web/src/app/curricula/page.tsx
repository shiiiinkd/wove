"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWithAuth } from "@/lib/api";

type Curriculum = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default function CurriculaPage() {
  const router = useRouter();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetchWithAuth("/curricula", session.access_token);
      if (!res.ok) {
        setError("取得に失敗しました");
        setLoading(false);
        return;
      }
      setCurricula(await res.json());
      setLoading(false);
    });
  }, [router]);

  if (loading) return <p className="p-8">読み込み中...</p>;
  if (error) return <p className="p-8 text-red-500">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">カリキュラム一覧</h1>
      <ul className="space-y-3">
        {curricula.map((c) => (
          <li key={c.id}>
            <Link
              href={`/curricula/${c.id}`}
              className="block p-4 bg-white rounded shadow hover:bg-gray-50"
            >
              <p className="font-semibold">{c.title}</p>
              {c.description && (
                <p className="text-sm text-gray-500 mt-1">{c.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
