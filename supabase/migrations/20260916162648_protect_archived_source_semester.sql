create or replace function public.check_active_semester() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP<>'INSERT' and exists(select 1 from public.semesters where id=OLD.semester_id and archived) then raise exception 'Reactivate this semester before editing.';end if;
 if TG_OP<>'DELETE' and exists(select 1 from public.semesters where id=NEW.semester_id and archived) then raise exception 'Reactivate this semester before editing.';end if;
 if TG_OP='DELETE' then return OLD;end if;return NEW;
end $$;
