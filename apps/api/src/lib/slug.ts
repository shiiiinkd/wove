import { SupabaseClient } from "@supabase/supabase-js";

// 生成ルール: 小文字化 → 空白をハイフン → 記号除去 → 50文字切り捨て
export function generateBaseSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "") // Unicode対応（日本語保持）
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/^-+|-+$/g, "");

  if (slug.length > 0) {
    return slug;
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `curriculum-${Date.now().toString(36)}-${randomSuffix}`.slice(0, 50);
}

// Supabase クライアントを受け取り、(user_id, slug) で重複チェックしてユニークな slug を返す
// slug は最大 50 文字に収まるよう保証する
export async function resolveUniqueSlug(
  supabase: SupabaseClient,
  userId: string,
  baseSlug: string,
): Promise<string> {
  const normalizedBaseSlug = baseSlug.slice(0, 50);
  let slug = normalizedBaseSlug;
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
      slug = `${normalizedBaseSlug.slice(0, maxBaseLen)}${suffixStr}`;
      suffix++;
    } else {
      return slug;
    }
  }
  // ループ: slug → slug-1 → slug-2 …
}
