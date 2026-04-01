/**
 * Role:
 * - Authorization ヘッダから Bearer token を抽出する。
 * - token から現在ユーザーを検証する認証ユーティリティを提供する。
 *
 * Policy:
 * - この層ではレスポンスを返さず、null を返して呼び出し元でエラーハンドリングを行い、HTTPエラー化する。
 */

import type { Context } from "hono";
import { supabase } from "../lib/supabase.js";

// "Authorization: Bearer <token>" 形式のみ受け付ける。
// 形式不正・欠落は null を返し、ルート側で 401 を返す。
export const getAccessTokenFromHeader = async (c: Context) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    return null;
  }

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  return token;
};

// token からユーザーを取得して妥当性を確認する。
// 無効tokenや期限切れは null として扱う。
export const getCurrentUserFromToken = async (token: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  return user;
};
