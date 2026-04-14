-- Wove: public テーブル権限の最小化
-- 目的:
-- 1. anon から public テーブルへの直接操作権限を外す
-- 2. authenticated には MVP で必要な最小権限だけ戻す
-- 3. save_summary RPC の execute 権限も明示する
--
-- 注記:
-- - MVPでは DELETE 機能を提供しないため、authenticated に DELETE は付与しない
-- - そのため remote_schema 側に存在する DELETE 用 RLS policy は現時点では未使用
-- - profiles は auth.users 作成時トリガーで自動作成されるため、通常ユーザーに INSERT は不要

-- =========================
-- 1) anon の権限を全剥がし
-- =========================
REVOKE ALL ON TABLE public.curricula  FROM anon;
REVOKE ALL ON TABLE public.profiles   FROM anon;
REVOKE ALL ON TABLE public.topics     FROM anon;
REVOKE ALL ON TABLE public.summaries  FROM anon;

-- ==============================
-- 2) authenticated も一度全剥がし
--    その後、必要最小限だけ戻す
-- ==============================
REVOKE ALL ON TABLE public.curricula  FROM authenticated;
REVOKE ALL ON TABLE public.profiles   FROM authenticated;
REVOKE ALL ON TABLE public.topics     FROM authenticated;
REVOKE ALL ON TABLE public.summaries  FROM authenticated;

-- curricula:
-- 自分のカリキュラムを読む / 作る / 更新する
GRANT SELECT, INSERT, UPDATE ON TABLE public.curricula TO authenticated;

-- profiles:
-- profile は auth.users 作成時トリガーで自動作成されるため、
-- 通常ユーザーには INSERT 不要
-- 自分の profile を読む / 更新するだけでよい
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- topics:
-- カリキュラム保存時に topics を作成し、
-- その後編集・参照するため SELECT/INSERT/UPDATE を許可
GRANT SELECT, INSERT, UPDATE ON TABLE public.topics TO authenticated;

-- summaries:
-- 要約の保存・参照・再保存を想定して SELECT/INSERT/UPDATE を許可
GRANT SELECT, INSERT, UPDATE ON TABLE public.summaries TO authenticated;

-- =======================================
-- 3) save_summary RPC の EXECUTE を明示管理
-- =======================================
REVOKE ALL
ON FUNCTION public.save_summary_and_complete_topic(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.save_summary_and_complete_topic(uuid, text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.save_summary_and_complete_topic(uuid, text)
TO service_role;