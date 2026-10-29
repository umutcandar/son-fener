-- Bölge sohbeti (r:<bölge>) + çeviri önbelleği (mesaj, hedef dil)
drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select to authenticated using (channel='tr' or channel='clan:'||(select public.my_clan())::text or channel='r:'||(select region_id from public.profiles where id=(select auth.uid()))::text);
create table if not exists public.msg_tr(msg bigint references public.messages on delete cascade, lang text not null, body text not null, src text, created_at timestamptz not null default now(), primary key(msg,lang));
alter table public.msg_tr enable row level security; revoke all on public.msg_tr from anon, authenticated;
create table if not exists public.tr_usage(user_id uuid references public.profiles on delete cascade, day date not null default current_date, n int not null default 0, primary key(user_id,day));
alter table public.tr_usage enable row level security; revoke all on public.tr_usage from anon, authenticated;
create or replace function public.my_region() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('id',r.id,'name',r.name) from public.profiles p join public.regions r on r.id=p.region_id where p.id=auth.uid() $$;
grant execute on function public.my_region() to authenticated; revoke execute on function public.my_region() from anon;
create or replace function public.send_chat(p_channel text, p_body text, p_lang text default 'tr') returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles; c uuid:=public.my_clan(); b text; begin select * into p from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p.muted_until>now() then raise exception 'Sohbetten geçici olarak susturuldun'; end if;
 if p_channel<>'tr' and p_channel<>'r:'||p.region_id::text and (c is null or p_channel<>'clan:'||c::text) then raise exception 'Kanal yok'; end if;
 b:=btrim(regexp_replace(p_body,'[[:cntrl:]]',' ','g')); if length(b)<1 or length(b)>200 then raise exception 'Mesaj 1-200 karakter olmalı'; end if;
 if p.chat_last>now()-interval '2 seconds' then raise exception 'Çok hızlı yazıyorsun'; end if;
 if p.chat_win>now()-interval '1 minute' and p.chat_n>=12 then raise exception 'Dakikada en fazla 12 mesaj'; end if;
 update public.profiles set chat_last=now(), chat_n=case when chat_win>now()-interval '1 minute' then chat_n+1 else 1 end, chat_win=case when chat_win>now()-interval '1 minute' then chat_win else now() end where id=auth.uid();
 if p_lang !~ '^[a-zA-Z]{2}(-[A-Za-z]{2})?$' then p_lang:='other'; end if;
 insert into public.messages(channel,user_id,nick,avatar,body,lang) values(p_channel,auth.uid(),p.nick,p.avatar,public.sf_clean(b),p_lang); end $$;
