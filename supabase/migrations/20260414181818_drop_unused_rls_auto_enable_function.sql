-- 未使用の rls_auto_enable 関数を削除する
-- baseline には event_trigger 用関数として定義されているが、
-- CREATE EVENT TRIGGER が存在せず、現状どこからも起動されていない
-- かつ SECURITY DEFINER のため、不要な高権限定義は減らしておく

DROP FUNCTION IF EXISTS public.rls_auto_enable();