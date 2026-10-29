-- Batch 20: sunucu doğrulamalı ilerleme. İstemcinin kayıttaki S.stage alanı artık ödüller için güvenilmez.
-- vstage: pve_win ile sunucunun kabul ettiği en yüksek aşama zaferi (sırayla). vbase: düzeltme öncesi hesaplar için tek seferlik taban.
alter table public.pve_state add column if not exists vstage int not null default 0;
alter table public.pve_state add column if not exists vbase int not null default 0;
alter table public.profiles add column if not exists power_hwm bigint not null default 0;
-- Mevcut hesaplar: oyun ilerlemeleri korunur (kayıttaki aşama-1), yalnızca düzeltmeden önce oluşturulanlar için. Davet ödülü vbase'i SAYMAZ.
insert into public.pve_state(user_id) select p.id from public.profiles p where p.created_at<'2026-10-29 19:00+00' on conflict do nothing;
update public.pve_state ps set vbase=greatest(0,least(1000,public.sf_n(s.data,'{stage}',1000)::int-1)) from public.saves s join public.profiles p on p.id=s.user_id where s.user_id=ps.user_id and p.created_at<'2026-10-29 19:00+00' and ps.vbase=0;
update public.profiles set power_hwm=power where power_hwm<power;
create or replace function public.sf_vstage(u uuid) returns int language sql stable security definer set search_path='' as $$ select coalesce((select greatest(vstage,vbase) from public.pve_state where user_id=u),0) $$;
revoke execute on function public.sf_vstage(uuid) from public, anon, authenticated;

create or replace function public.pve_win(p_kind text, p_stage integer) returns jsonb language plpgsql security definer set search_path='' as $function$
declare d jsonb; A record; ps public.pve_state; ep numeric; n int; ev int; rw jsonb; dday text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); why text; rp numeric[]:=array[6.5,7.5,8.5,10];
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if p_kind not in('stage','convoy','reef') or p_stage is null or p_stage<1 or (p_kind='reef' and p_stage>4) or p_stage>1000 then raise exception 'Geçersiz savaş'; end if;
 select data into d from public.saves where user_id=auth.uid() for update; if d is null then raise exception 'Kayıt yok'; end if;
 insert into public.pve_state(user_id) values(auth.uid()) on conflict do nothing;
 select * into ps from public.pve_state where user_id=auth.uid() for update;
 if ps.day is distinct from dday then ps.n:=0; end if;
 ev:=greatest(ps.vstage,ps.vbase); -- doğrulanmış kazanılan aşama; çevrimdışı ilerleme için en fazla 3 aşama ileri (filo gücü kontrolüyle)
 select * into A from public.sf_army(d);
 if p_kind='stage' and p_stage>ev+3 then why:='Doğrulanmış ilerlemeden ileride';
 elsif ps.last_win>now()-interval '4 seconds' then why:='Çok hızlı';
 elsif ps.n>=400 then why:='Bugünkü savaş ödülü sınırı';
 end if;
 if why is null then
  if p_kind='reef' then
   if ev<7 then why:='Resif kilitli'; elsif p_stage<>ps.reef_n+1 then why:='Resif aşaması sırası geçersiz'; end if;
   ep:=round(260*power(1.32,rp[p_stage]-1)*1.15);
   rw:=(array['{"fish":500,"wood":500,"crys":120,"gems":15}','{"fish":700,"wood":700,"crys":160,"gems":15}','{"fish":900,"wood":900,"crys":220,"gems":20}','{"crys":400,"gems":60,"ticket":1,"ush":10}'])[p_stage]::jsonb;
  elsif p_kind='convoy' then
   if p_stage<3 or ev<2 then why:='Ada 3 gerekli'; elsif p_stage>ev+3 then why:='Doğrulanmış ilerlemeden ileride'; elsif ps.conv_next>now() then why:='Konvoy henüz görünmedi'; end if;
   n:=greatest(1,p_stage-1); ep:=round(260*power(1.32,n-1)*1.15);
   rw:=jsonb_build_object('wood',ceil(70*n*2.2),'crys',ceil(22*n*2.2),'gems',15);
  else
   n:=p_stage; ep:=round(260*power(1.32,n-1));
   rw:=jsonb_build_object('fish',ceil(40*n*2.5),'wood',ceil(40*n*2.5),'crys',ceil(12*n*2.5),'gems',case when n%5=0 then 30 else 5 end);
  end if;
  if why is null and A.atk*23<ep*1.6 then why:='Filo bu düşmanı yenecek güçte değil'; end if;
 end if;
 if why is not null then update public.pve_state set rejected=rejected+1, day=dday, n=ps.n where user_id=auth.uid(); return jsonb_build_object('ok',false,'err',why); end if;
 update public.saves s set allow=(select jsonb_object_agg(k2, coalesce((s.allow->>k2)::numeric,0)+coalesce((rw->>k2)::numeric,0)) from (select jsonb_object_keys(coalesce(s.allow,'{}')||rw) k2) q) where user_id=auth.uid();
 update public.pve_state set last_win=now(), day=dday, n=ps.n+1, conv_next=case when p_kind='convoy' then now()+interval '3 hours 58 minutes' else conv_next end, reef_n=case when p_kind='reef' then p_stage else reef_n end,
  vstage=case when p_kind='stage' then greatest(vstage,p_stage) else vstage end where user_id=auth.uid();
 return jsonb_build_object('ok',true,'max',rw,'vstage',case when p_kind='stage' then greatest(ps.vstage,p_stage) else ps.vstage end); end; $function$;

-- Davet: davetli sunucuda en az 2 aşama zaferi (vstage>=2, yani Aşama 3'e ulaştı) + hesap en az 30 dk yaşında olmalı. vbase sayılmaz.
create or replace function public.sf_ref_ok(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select ps.vstage>=2 from public.pve_state ps where ps.user_id=u),false) and exists(select 1 from public.profiles p where p.id=u and p.created_at<=now()-interval '30 minutes') $$;
revoke execute on function public.sf_ref_ok(uuid) from public, anon, authenticated;
create or replace function public.ref_info() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare c text; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 select code into c from public.ref_codes where user_id=auth.uid();
 if c is null then loop c:=upper(substr(md5(random()::text||auth.uid()::text),1,6)); begin insert into public.ref_codes(user_id,code) values(auth.uid(),c); exit; exception when unique_violation then end; end loop; end if;
 return jsonb_build_object('code',c,'invited',(select count(*) from public.referrals where inviter=auth.uid()),'done',(select count(*) from public.referrals r where r.inviter=auth.uid() and public.sf_ref_ok(r.invitee)),
  'paid',(select count(*) from public.referrals where inviter=auth.uid() and inviter_paid),'by',(select p.nick from public.referrals r join public.profiles p on p.id=r.inviter where r.invitee=auth.uid()),
  'mine',jsonb_build_object('v',coalesce((select vstage from public.pve_state where user_id=auth.uid()),0),'ok',public.sf_ref_ok(auth.uid()))); end; $fn$;
create or replace function public.ref_collect() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare g int:=0; n int; rw jsonb; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 update public.referrals r set invitee_paid=true where r.invitee=auth.uid() and not r.invitee_paid and public.sf_ref_ok(r.invitee); get diagnostics n=row_count; g:=g+n*50;
 with q as (select r.invitee from public.referrals r where r.inviter=auth.uid() and not r.inviter_paid and public.sf_ref_ok(r.invitee) order by r.created_at
   limit greatest(0,10-(select count(*) from public.referrals where inviter=auth.uid() and inviter_paid)))
 update public.referrals r set inviter_paid=true from q where r.invitee=q.invitee; get diagnostics n=row_count; g:=g+n*50;
 if g=0 then return jsonb_build_object('gems',0); end if;
 rw:=jsonb_build_object('gems',g); perform public.sf_allow_add(auth.uid(),rw); return rw; end; $fn$;
revoke execute on function public.ref_info(), public.ref_collect(), public.pve_win(text,integer) from public, anon; grant execute on function public.ref_info(), public.ref_collect(), public.pve_win(text,integer) to authenticated;

-- Fener Savaşı "inşa" puanı: yalnızca en yüksek güç seviyesinin (high-water mark) üstü sayılır; filoyu kaydedip-geri-yükleyerek puan kasılamaz.
create or replace function public.fw_trg_prof() returns trigger language plpgsql security definer set search_path='' as $function$ begin
 if new.power>old.power_hwm then perform public.fw_add(new.id,'build',least(200,((new.power-old.power_hwm)/20)::int)); end if;
 if new.kraken_dmg>(case when new.kraken_wk=old.kraken_wk then old.kraken_dmg else 0 end) then perform public.fw_add(new.id,'kraken',least(200,((new.kraken_dmg-(case when new.kraken_wk=old.kraken_wk then old.kraken_dmg else 0 end))/500)::int+5)); end if;
 return new; end $function$;
create or replace function public.sf_trg_hwm() returns trigger language plpgsql set search_path='' as $f$ begin new.power_hwm:=greatest(old.power_hwm,new.power); return new; end $f$;
drop trigger if exists sf_prof_hwm on public.profiles; create trigger sf_prof_hwm before update of power on public.profiles for each row execute function public.sf_trg_hwm();
