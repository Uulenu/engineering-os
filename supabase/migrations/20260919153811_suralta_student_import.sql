-- Retire the personal preset. Existing courses and meetings are untouched.
drop function if exists public.seed_num(uuid);
create function public.import_timetable(sid uuid, items jsonb, allow_conflicts boolean default false)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; meeting jsonb; cid uuid; count_courses integer:=0; begin
 if auth.uid() is null or not exists(select 1 from public.semesters where id=sid and user_id=auth.uid() and not archived) then raise exception 'Choose an active semester you own.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(sid::text,0));
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'Import 1 to 100 courses at a time.'; end if;
 if length(items::text)>500000 then raise exception 'Import is too large.';end if;
 for item in select * from jsonb_array_elements(items) loop
  if jsonb_typeof(item->'meetings') is distinct from 'array' or jsonb_array_length(item->'meetings')>50 then raise exception 'Invalid meetings list.';end if;
  insert into public.courses(semester_id,code,name,credits,priority) values(sid,upper(trim(item->>'code')),trim(item->>'name'),(item->>'credits')::numeric,(item->>'priority')::integer) returning id into cid;
  for meeting in select * from jsonb_array_elements(item->'meetings') loop
   if length(coalesce(meeting->>'room',''))>120 then raise exception 'Room is too long.';end if;
   if not coalesce(allow_conflicts,false) and exists(select 1 from public.class_meetings where semester_id=sid and day=(meeting->>'day')::integer and start_time<(meeting->>'end_time')::time and end_time>(meeting->>'start_time')::time) then raise exception 'Overlapping meetings. Review and explicitly confirm conflicts.';end if;
   insert into public.class_meetings(semester_id,course_id,day,start_time,end_time,room,type) values(sid,cid,(meeting->>'day')::integer,(meeting->>'start_time')::time,(meeting->>'end_time')::time,coalesce(meeting->>'room',''),meeting->>'type');
  end loop;
  count_courses:=count_courses+1;
 end loop;
 return count_courses;
end $$;
revoke all on function public.import_timetable(uuid,jsonb,boolean) from public,anon;
grant execute on function public.import_timetable(uuid,jsonb,boolean) to authenticated;
