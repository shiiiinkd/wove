import { SupabaseClient } from "@supabase/supabase-js";

// 生成ルール: 小文字化 → 空白をハイフン → 記号除去 → 50文字切り捨て
export function generateBaseSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "") // Unicode対応（日本語保持）
    .slice(0, 50);
}

// Supabase クライアントを受け取り、(user_id, slug) で重複チェックしてユニークな slug を返す
// slug は最大 50 文字に収まるよう保証する
export async function resolveUniqueSlug(
  supabase: SupabaseClient,
  userId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data, error } = await supabase
      .from("curricula")
      .select("slug")
      .eq("slug", slug)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (data) {
      const suffixStr = `-${suffix}`;
      const maxBaseLen = 50 - suffixStr.length;
      slug = `${baseSlug.slice(0, maxBaseLen)}${suffixStr}`;
      suffix++;
    } else {
      return slug;
    }
  }
  // ループ: slug → slug-1 → slug-2 …
}
