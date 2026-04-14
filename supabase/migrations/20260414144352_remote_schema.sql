drop extension if exists "pg_net";


  create table "public"."curricula" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "slug" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."curricula" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "user_slug" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."summaries" (
    "id" uuid not null default gen_random_uuid(),
    "topic_id" uuid not null,
    "content" text not null,
    "is_latest" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."summaries" enable row level security;


  create table "public"."topics" (
    "id" uuid not null default gen_random_uuid(),
    "curriculum_id" uuid not null,
    "title" text not null,
    "description" text,
    "order_index" integer not null,
    "status" text not null default 'not_started'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."topics" enable row level security;

CREATE UNIQUE INDEX curricula_pkey ON public.curricula USING btree (id);

CREATE UNIQUE INDEX curricula_user_slug_unique ON public.curricula USING btree (user_id, slug);

CREATE INDEX idx_curricula_user_id ON public.curricula USING btree (user_id);

CREATE INDEX idx_summaries_topic_id ON public.summaries USING btree (topic_id);

CREATE INDEX idx_topics_curriculum_id ON public.topics USING btree (curriculum_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_slug_key ON public.profiles USING btree (user_slug);

CREATE UNIQUE INDEX summaries_pkey ON public.summaries USING btree (id);

CREATE UNIQUE INDEX topics_curriculum_order_unique ON public.topics USING btree (curriculum_id, order_index);

CREATE UNIQUE INDEX topics_pkey ON public.topics USING btree (id);

CREATE UNIQUE INDEX uq_summaries_one_latest_per_topic ON public.summaries USING btree (topic_id) WHERE (is_latest = true);

alter table "public"."curricula" add constraint "curricula_pkey" PRIMARY KEY using index "curricula_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."summaries" add constraint "summaries_pkey" PRIMARY KEY using index "summaries_pkey";

alter table "public"."topics" add constraint "topics_pkey" PRIMARY KEY using index "topics_pkey";

alter table "public"."curricula" add constraint "curricula_slug_check" CHECK (((char_length(slug) >= 1) AND (char_length(slug) <= 100))) not valid;

alter table "public"."curricula" validate constraint "curricula_slug_check";

alter table "public"."curricula" add constraint "curricula_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100))) not valid;

alter table "public"."curricula" validate constraint "curricula_title_check";

alter table "public"."curricula" add constraint "curricula_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."curricula" validate constraint "curricula_user_id_fkey";

alter table "public"."curricula" add constraint "curricula_user_slug_unique" UNIQUE using index "curricula_user_slug_unique";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_slug_check" CHECK (((char_length(user_slug) >= 1) AND (char_length(user_slug) <= 50))) not valid;

alter table "public"."profiles" validate constraint "profiles_user_slug_check";

alter table "public"."profiles" add constraint "profiles_user_slug_key" UNIQUE using index "profiles_user_slug_key";

alter table "public"."summaries" add constraint "summaries_content_check" CHECK ((char_length(content) >= 1)) not valid;

alter table "public"."summaries" validate constraint "summaries_content_check";

alter table "public"."summaries" add constraint "summaries_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE not valid;

alter table "public"."summaries" validate constraint "summaries_topic_id_fkey";

alter table "public"."topics" add constraint "topics_curriculum_id_fkey" FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id) ON DELETE CASCADE not valid;

alter table "public"."topics" validate constraint "topics_curriculum_id_fkey";

alter table "public"."topics" add constraint "topics_curriculum_order_unique" UNIQUE using index "topics_curriculum_order_unique";

alter table "public"."topics" add constraint "topics_order_index_check" CHECK ((order_index >= 1)) not valid;

alter table "public"."topics" validate constraint "topics_order_index_check";

alter table "public"."topics" add constraint "topics_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text]))) not valid;

alter table "public"."topics" validate constraint "topics_status_check";

alter table "public"."topics" add constraint "topics_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100))) not valid;

alter table "public"."topics" validate constraint "topics_title_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, user_slug)
  values (
    new.id,
    'user-' || substring(replace(new.id::text, '-', '') from 1 for 12)
  )
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_summary_and_complete_topic(p_topic_id uuid, p_content text)
 RETURNS TABLE(id uuid, topic_id uuid, content text, is_latest boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_new_summary public.summaries%rowtype;
begin
  -- 入力バリデーション
  if p_topic_id is null then
    raise exception 'topic_id is required';
  end if;

  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'content is required';
  end if;

  -- topicが存在し、かつRLS的に操作可能か確認
  perform 1
  from public.topics t
  where t.id = p_topic_id;

  if not found then
    raise exception 'topic not found or not accessible';
  end if;

  -- Step 1: 既存latestをfalse化
  update public.summaries s
  set is_latest = false
  where s.topic_id = p_topic_id
    and s.is_latest = true;

  -- Step 2: 新規summaryをlatest=trueで追加
  insert into public.summaries (topic_id, content, is_latest)
  values (p_topic_id, p_content, true)
  returning * into v_new_summary;

  -- Step 3: topicをcompletedへ更新
  update public.topics t
  set status = 'completed'
  where t.id = p_topic_id;

  if not found then
    -- ここで失敗したら例外にして全体をロールバック
    raise exception 'failed to update topic status';
  end if;

  -- 返却（v_new_summary のフィールドを明示して返す）
  return query
  select
    v_new_summary.id,
    v_new_summary.topic_id,
    v_new_summary.content,
    v_new_summary.is_latest,
    v_new_summary.created_at;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

set check_function_bodies = on;

grant delete on table "public"."curricula" to "anon";

grant insert on table "public"."curricula" to "anon";

grant references on table "public"."curricula" to "anon";

grant select on table "public"."curricula" to "anon";

grant trigger on table "public"."curricula" to "anon";

grant truncate on table "public"."curricula" to "anon";

grant update on table "public"."curricula" to "anon";

grant delete on table "public"."curricula" to "authenticated";

grant insert on table "public"."curricula" to "authenticated";

grant references on table "public"."curricula" to "authenticated";

grant select on table "public"."curricula" to "authenticated";

grant trigger on table "public"."curricula" to "authenticated";

grant truncate on table "public"."curricula" to "authenticated";

grant update on table "public"."curricula" to "authenticated";

grant delete on table "public"."curricula" to "service_role";

grant insert on table "public"."curricula" to "service_role";

grant references on table "public"."curricula" to "service_role";

grant select on table "public"."curricula" to "service_role";

grant trigger on table "public"."curricula" to "service_role";

grant truncate on table "public"."curricula" to "service_role";

grant update on table "public"."curricula" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."summaries" to "anon";

grant insert on table "public"."summaries" to "anon";

grant references on table "public"."summaries" to "anon";

grant select on table "public"."summaries" to "anon";

grant trigger on table "public"."summaries" to "anon";

grant truncate on table "public"."summaries" to "anon";

grant update on table "public"."summaries" to "anon";

grant delete on table "public"."summaries" to "authenticated";

grant insert on table "public"."summaries" to "authenticated";

grant references on table "public"."summaries" to "authenticated";

grant select on table "public"."summaries" to "authenticated";

grant trigger on table "public"."summaries" to "authenticated";

grant truncate on table "public"."summaries" to "authenticated";

grant update on table "public"."summaries" to "authenticated";

grant delete on table "public"."summaries" to "service_role";

grant insert on table "public"."summaries" to "service_role";

grant references on table "public"."summaries" to "service_role";

grant select on table "public"."summaries" to "service_role";

grant trigger on table "public"."summaries" to "service_role";

grant truncate on table "public"."summaries" to "service_role";

grant update on table "public"."summaries" to "service_role";

grant delete on table "public"."topics" to "anon";

grant insert on table "public"."topics" to "anon";

grant references on table "public"."topics" to "anon";

grant select on table "public"."topics" to "anon";

grant trigger on table "public"."topics" to "anon";

grant truncate on table "public"."topics" to "anon";

grant update on table "public"."topics" to "anon";

grant delete on table "public"."topics" to "authenticated";

grant insert on table "public"."topics" to "authenticated";

grant references on table "public"."topics" to "authenticated";

grant select on table "public"."topics" to "authenticated";

grant trigger on table "public"."topics" to "authenticated";

grant truncate on table "public"."topics" to "authenticated";

grant update on table "public"."topics" to "authenticated";

grant delete on table "public"."topics" to "service_role";

grant insert on table "public"."topics" to "service_role";

grant references on table "public"."topics" to "service_role";

grant select on table "public"."topics" to "service_role";

grant trigger on table "public"."topics" to "service_role";

grant truncate on table "public"."topics" to "service_role";

grant update on table "public"."topics" to "service_role";


  create policy "curricula_delete_own"
  on "public"."curricula"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "curricula_insert_own"
  on "public"."curricula"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "curricula_select_own"
  on "public"."curricula"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "curricula_update_own"
  on "public"."curricula"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "profiles_insert_own"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "summaries_delete_own"
  on "public"."summaries"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.curricula c ON ((c.id = t.curriculum_id)))
  WHERE ((t.id = summaries.topic_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "summaries_insert_own"
  on "public"."summaries"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.curricula c ON ((c.id = t.curriculum_id)))
  WHERE ((t.id = summaries.topic_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "summaries_select_own"
  on "public"."summaries"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.curricula c ON ((c.id = t.curriculum_id)))
  WHERE ((t.id = summaries.topic_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "summaries_update_own"
  on "public"."summaries"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.curricula c ON ((c.id = t.curriculum_id)))
  WHERE ((t.id = summaries.topic_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.curricula c ON ((c.id = t.curriculum_id)))
  WHERE ((t.id = summaries.topic_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "topics_delete_own"
  on "public"."topics"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.curricula c
  WHERE ((c.id = topics.curriculum_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "topics_insert_own"
  on "public"."topics"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.curricula c
  WHERE ((c.id = topics.curriculum_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "topics_select_own"
  on "public"."topics"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.curricula c
  WHERE ((c.id = topics.curriculum_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "topics_update_own"
  on "public"."topics"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.curricula c
  WHERE ((c.id = topics.curriculum_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM public.curricula c
  WHERE ((c.id = topics.curriculum_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));


CREATE TRIGGER set_curricula_updated_at BEFORE UPDATE ON public.curricula FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_summaries_updated_at BEFORE UPDATE ON public.summaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


