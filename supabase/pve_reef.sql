-- Batch 15: Mercan Resifleri sunucu doğrulaması
alter table public.pve_state add column if not exists reef_n int not null default 0;
create or replace function public.pve_win(p_kind text, p_stage int) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare d jsonb; A record; ps public.pve_state; ep numeric; n int; sv int; rw jsonb; k text; dday text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); why text; rp numeric[]:=array[6.5,7.5,8.5,10];
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if p_kind not in('stage','convoy','reef') or p_stage is null or p_stage<1 or (p_kind='reef' and p_stage>4) or p_stage>1000 then raise exception 'Geçersiz savaş'; end if;
 select data into d from public.saves where user_id=auth.uid() for update; if d is null then raise exception 'Kayıt yok'; end if;
 insert into public.pve_state(user_id) values(auth.uid()) on conflict do nothing;
 select * into ps from public.pve_state where user_id=auth.uid() for update;
 if ps.day is distinct from dday then ps.n:=0; end if;
 sv:=public.sf_n(d,'{stage}',1000)::int; select * into A from public.sf_army(d);
 if p_kind<>'reef' and p_stage>sv+3 then why:='Kayıttaki ilerlemeden çok ileride';
 elsif ps.last_win>now()-interval '4 seconds' then why:='Çok hızlı';
 elsif ps.n>=400 then why:='Bugünkü savaş ödülü sınırı';
 end if;
 if why is null then
  if p_kind='reef' then
   -- Mercan Resifleri: 7 ada kurtarılmış olmalı, aşamalar sırayla ve bir kez; alçak gelgit ×1.15
   if sv-1<7 then why:='Resif kilitli'; elsif p_stage<>ps.reef_n+1 then why:='Resif aşaması sırası geçersiz'; end if;
   ep:=round(260*power(1.32,rp[p_stage]-1)*1.15);
   rw:=(array['{"fish":500,"wood":500,"crys":120,"gems":15}','{"fish":700,"wood":700,"crys":160,"gems":15}','{"fish":900,"wood":900,"crys":220,"gems":20}','{"crys":400,"gems":60,"ticket":1,"ush":10}'])[p_stage]::jsonb;
  elsif p_kind='convoy' then
   if p_stage<3 then why:='Ada 3 gerekli'; elsif ps.conv_next>now() then why:='Konvoy henüz görünmedi'; end if;
   n:=greatest(1,p_stage-1); ep:=round(260*power(1.32,n-1)*1.15);
   rw:=jsonb_build_object('wood',ceil(70*n*2.2),'crys',ceil(22*n*2.2),'gems',15);
  else
   n:=p_stage; ep:=round(260*power(1.32,n-1));
   rw:=jsonb_build_object('fish',ceil(40*n*2.5),'wood',ceil(40*n*2.5),'crys',ceil(12*n*2.5),'gems',case when n%5=0 then 30 else 5 end);
  end if;
  -- 10 tur × en iyi zar (1.15) × 2 tolerans (kayıtta olmayan çarpanlar: kule, dökümhane, sezon…)
  if why is null and A.atk*23<ep*1.6 then why:='Filo bu düşmanı yenecek güçte değil'; end if;
 end if;
 if why is not null then update public.pve_state set rejected=rejected+1, day=dday, n=ps.n where user_id=auth.uid(); return jsonb_build_object('ok',false,'err',why); end if;
 update public.saves s set allow=(select jsonb_object_agg(k2, coalesce((s.allow->>k2)::numeric,0)+coalesce((rw->>k2)::numeric,0)) from (select jsonb_object_keys(coalesce(s.allow,'{}')||rw) k2) q) where user_id=auth.uid();
 update public.pve_state set last_win=now(), day=dday, n=ps.n+1, conv_next=case when p_kind='convoy' then now()+interval '3 hours 58 minutes' else conv_next end, reef_n=case when p_kind='reef' then p_stage else reef_n end where user_id=auth.uid();
 return jsonb_build_object('ok',true,'max',rw); end; $fn$;
revoke execute on function public.pve_win(text,int) from public, anon; grant execute on function public.pve_win(text,int) to authenticated;
