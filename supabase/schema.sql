-- Engineering OS. All relationships include the owner and semester to prevent cross-account links.
create table public.semesters(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,name text not null check(length(trim(name)) between 1 and 100),start_date date,end_date date,archived boolean not null default false,created_at timestamptz not null default now(),unique(id,user_id),check(end_date is null or start_date is null or end_date>=start_date));
create table public.courses(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,name text not null check(length(trim(name)) between 1 and 200),code text not null check(length(trim(code)) between 1 and 30),credits numeric not null default 3 check(credits between 0 and 30),priority integer not null default 5 check(priority between 1 and 5),professor text not null default '',notes text not null default '',created_at timestamptz not null default now(),unique(id,semester_id,user_id),unique(semester_id,code),foreign key(semester_id,user_id) references public.semesters(id,user_id) on delete cascade);
create table public.class_meetings(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid not null,day integer not null check(day between 0 and 6),start_time time not null,end_time time not null,room text not null default '',type text not null check(type in ('Lecture','Seminar','Lab')),created_at timestamptz not null default now(),foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade,check(end_time>start_time),unique(course_id,day,start_time,end_time));
create table public.assignments(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid not null,title text not null check(length(trim(title)) between 1 and 200),due_date date not null,due_time time not null default '23:59',priority text not null default 'Medium' check(priority in ('Low','Medium','High')),status text not null default 'open' check(status in ('open','completed')),completed_at timestamptz,notes text not null default '',created_at timestamptz not null default now(),foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade);
create table public.exams(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid not null,title text not null check(length(trim(title)) between 1 and 200),type text not null default 'Midterm' check(type in ('Midterm','Final','Quiz','Other')),date date not null,time time not null,room text not null default '',notes text not null default '',status text not null default 'scheduled' check(status in ('scheduled','archived')),created_at timestamptz not null default now(),foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade);
create table public.study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid not null,title text not null check(length(trim(title)) between 1 and 200),date date not null,start_time time not null,end_time time not null,status text not null default 'planned' check(status in ('suggested','planned','completed','skipped')),source text not null default 'manual' check(source in ('manual','suggested')),completed_at timestamptz,notes text not null default '',created_at timestamptz not null default now(),foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade,check(end_time>start_time));
create table public.projects(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid,title text not null check(length(trim(title)) between 1 and 200),status text not null default 'planning' check(status in ('planning','active','done')),due_date date,description text not null default '',notes text not null default '',url text not null default '' check(url='' or url ~ '^https?://'),created_at timestamptz not null default now(),foreign key(semester_id,user_id) references public.semesters(id,user_id) on delete cascade,foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade);
create table public.progress(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),semester_id uuid not null,course_id uuid,gpa numeric,gpa_scale numeric not null default 4 check(gpa_scale>0 and gpa_scale<=100),attendance numeric check(attendance between 0 and 100),notes text not null default '',created_at timestamptz not null default now(),check(gpa is null or (gpa>=0 and gpa<=gpa_scale)),foreign key(semester_id,user_id) references public.semesters(id,user_id) on delete cascade,foreign key(course_id,semester_id,user_id) references public.courses(id,semester_id,user_id) on delete cascade);
do $$ declare t text;begin foreach t in array array['semesters','courses','class_meetings','assignments','exams','study_sessions','projects','progress'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create index on public.%I(user_id)',t);
 if t<>'semesters' then execute format('create index on public.%I(semester_id,user_id)',t);end if;
 if t not in ('semesters','courses') then execute format('create index on public.%I(course_id,semester_id,user_id)',t);end if;
 end loop;end $$;
-- Archived semesters are readable; reactivation is required before editing their contents.
create function public.check_active_semester() returns trigger language plpgsql security invoker set search_path='' as $$ declare sid uuid;begin sid:=case when TG_OP='DELETE' then OLD.semester_id else NEW.semester_id end;if exists(select 1 from public.semesters where id=sid and archived) then raise exception 'Reactivate this semester before editing.';end if;if TG_OP='DELETE' then return OLD;end if;return NEW;end $$;
do $$ declare t text;begin foreach t in array array['courses','class_meetings','assignments','exams','study_sessions','projects','progress'] loop execute format('create trigger active_semester before insert or update or delete on public.%I for each row execute function public.check_active_semester()',t);end loop;end $$;
-- Atomic course editor: a failed meeting validation rolls back the whole course change.
create function public.save_course(payload jsonb,meetings jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare cid uuid; sid uuid; m jsonb;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 sid:=(payload->>'semester_id')::uuid;
 if payload->>'id' is null then
 insert into public.courses(semester_id,name,code,credits,priority,professor,notes) values(sid,payload->>'name',upper(payload->>'code'),(payload->>'credits')::numeric,(payload->>'priority')::int,coalesce(payload->>'professor',''),coalesce(payload->>'notes','')) returning id into cid;
 else cid:=(payload->>'id')::uuid;
 update public.courses set name=payload->>'name',code=upper(payload->>'code'),credits=(payload->>'credits')::numeric,priority=(payload->>'priority')::int,professor=coalesce(payload->>'professor',''),notes=coalesce(payload->>'notes','') where id=cid and semester_id=sid;
 if not found then raise exception 'Course unavailable';end if;
 delete from public.class_meetings where course_id=cid;
 end if;
 for m in select * from jsonb_array_elements(meetings) loop
 insert into public.class_meetings(semester_id,course_id,day,start_time,end_time,room,type) values(sid,cid,(m->>'day')::int,(m->>'start_time')::time,(m->>'end_time')::time,coalesce(m->>'room',''),m->>'type');end loop;
 return cid;end $$;
-- Real NUM source: Figma LHiWzaQVVsoC7spijl8k7X, Timetable 3:260. Corrected Monday/Saturday free.
create function public.seed_num(sid uuid) returns void language plpgsql security invoker set search_path='' as $$
declare c uuid; item jsonb;meeting jsonb;begin
 if not exists(select 1 from public.semesters where id=sid and user_id=auth.uid() and not archived) then raise exception 'Active semester required';end if;
 if exists(select 1 from public.courses where semester_id=sid) then raise exception 'Import is only available for an empty semester';end if;
 for item in select * from jsonb_array_elements('[
 {"code":"SPRT103","name":"Биеийн тамир (Сагсан бөмбөг)","priority":5,"meetings":[[2,"16:00","17:30","803","Seminar"],[5,"09:20","10:50","803","Seminar"]]},
 {"code":"EENG210","name":"Инженерчлэлийн удиртгал","priority":5,"meetings":[[2,"07:40","09:10","207","Lecture"],[2,"12:40","15:50","304","Lab"],[3,"11:00","12:30","304","Seminar"]]},
 {"code":"MATH101","name":"Нэг хувьсагчийн функцийн онол 1Б","priority":2,"meetings":[[2,"11:00","12:30","114","Lecture"],[4,"09:20","10:50","402","Seminar"]]},
 {"code":"ITCS102","name":"Программчлалын арга зүй (Python)","priority":4,"meetings":[[3,"12:40","14:10","114","Lecture"],[5,"14:20","15:50","207","Lecture"]]},
 {"code":"PHYS101","name":"Физик","priority":3,"meetings":[[3,"09:20","10:50","301","Lecture"],[3,"16:00","17:30","310","Seminar"]]},
 {"code":"EENG202","name":"Электроникийн үндэс","priority":1,"meetings":[[4,"12:40","14:10","114","Lecture"],[4,"14:20","15:50","302","Lab"]]}
 ]'::jsonb) loop
 insert into public.courses(semester_id,code,name,credits,priority) values(sid,item->>'code',item->>'name',3,(item->>'priority')::int) returning id into c;
 for meeting in select * from jsonb_array_elements(item->'meetings') loop insert into public.class_meetings(semester_id,course_id,day,start_time,end_time,room,type) values(sid,c,(meeting->>0)::int,(meeting->>1)::time,(meeting->>2)::time,meeting->>3,meeting->>4);end loop;
 end loop;end $$;
create function public.replace_suggestions(sid uuid,items jsonb) returns void language plpgsql security invoker set search_path='' as $$ declare i jsonb;begin
 if not exists(select 1 from public.semesters where id=sid and user_id=auth.uid() and not archived) then raise exception 'Active semester required';end if;
 delete from public.study_sessions where semester_id=sid and status='suggested';
 for i in select * from jsonb_array_elements(items) loop
 insert into public.study_sessions(semester_id,course_id,title,date,start_time,end_time,status,source,notes) values(sid,(i->>'course_id')::uuid,i->>'title',(i->>'date')::date,(i->>'start_time')::time,(i->>'end_time')::time,'suggested','suggested',coalesce(i->>'notes',''));
 end loop;end $$;
revoke all on function public.save_course(jsonb,jsonb), public.seed_num(uuid), public.replace_suggestions(uuid,jsonb),public.check_active_semester() from public,anon;
grant execute on function public.save_course(jsonb,jsonb),public.seed_num(uuid),public.replace_suggestions(uuid,jsonb),public.check_active_semester() to authenticated;
