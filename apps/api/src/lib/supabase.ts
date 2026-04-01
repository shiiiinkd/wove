/**
 * Role:
 * - Supabase client の生成を担当する共通モジュール。
 * - 通常クライアントと、ユーザーJWT付きクライアントを提供する。
 *
 * Security:
 * - 通常APIでは service_role を使わない。
 * - ユーザーJWT付き client を使うことで RLS を正しく適用する。
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// 公開環境変数の不足は起動時に即失敗させる（実行時の曖昧な障害を防ぐ）
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set");
}
if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY is not set");
}

// リクエスト元ユーザーのJWTをヘッダに付与した client。
// この client 経由のDB操作は、Supabase側でRLSがユーザー単位に評価される。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

//
export const createSupabaseClientWithToken = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
