-- handle_new_user の user_slug 生成を衝突しにくい形へ更新する
-- 旧: user- + UUID先頭12文字
-- 新: user- + UUID全体（ハイフン除去）
-- 50文字制約の範囲内に収まる:
-- "user-"(5文字) + 32文字 = 37文字

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog
AS $function$
begin
  insert into public.profiles (id, user_slug)
  values (
    new.id,
    'user-' || replace(new.id::text, '-', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;