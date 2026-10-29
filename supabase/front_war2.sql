-- Batch19: Sis Cephesi UX — saldırı tekrarları, savaş günlüğü, savaşın MVP'si, klan sohbeti otomatik duyuruları
alter table public.front_hits add column if not exists bid bigint;
-- savaş saldırısı kaydedilince: vuruşu savaş raporuna bağla + iki klana duyur
create or replace function public.sf_front_trg_battle() returns trigger language plpgsql security definer set search_path='' as $$
declare h public.front_hits; w public.front_wars; ca uuid; cd uuid; begin
 if new.kind<>'front' then return new; end if;
 select * into h from public.front_hits where war=(new.loot->>'war')::bigint and attacker=new.attacker and target=new.defender and bid is null order by id desc limit 1;
 if h.id is null then return new; end if;
 update public.front_hits set bid=new.id where id=h.id;
 select * into w from public.front_wars where id=h.war;
 ca:=case when h.side='a' then w.clan_a else w.clan_b end; cd:=case when h.side='a' then w.clan_b else w.clan_a end;
 insert into public.messages(channel,user_id,nick,avatar,body,lang) values
  ('clan:'||ca,new.attacker,coalesce(new.att_nick,'?'),'⚔️','§war:hit:'||h.stars||':'||round(h.dmg)||':'||left(coalesce(new.def_nick,'?'),24),'tr'),
  ('clan:'||cd,new.attacker,coalesce(new.att_nick,'?'),'⚔️','§war:def:'||h.stars||':'||round(h.dmg)||':'||left(coalesce(new.def_nick,'?'),24),'tr');
 return new; end $$;
drop trigger if exists front_battle_ann on public.battles;
create trigger front_battle_ann after insert on public.battles for each row execute function public.sf_front_trg_battle();

-- MVP: en çok yıldız (hedef başına en iyi), eşitlikte toplam hasar
create or replace function public.sf_front_mvp(p_war bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'side',x.side,'stars',x.st,'dmg',round(x.dm),'n',x.n) from (
  select attacker,side,sum(bs) st,sum(dm) dm,sum(n) n from (select attacker,side,target,max(stars) bs,sum(dmg) dm,count(*) n from public.front_hits where war=p_war group by attacker,side,target) y group by attacker,side
  order by sum(bs) desc,sum(dm) desc limit 1) x join public.profiles p on p.id=x.attacker $$;

-- savaş bitince iki klana duyuru
create or replace function public.sf_front_trg_settle() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb; begin
 if not (new.settled and not old.settled) then return new; end if; m:=public.sf_front_mvp(new.id);
 insert into public.messages(channel,user_id,nick,avatar,body,lang)
  select 'clan:'||x.c,x.u,coalesce(m->>'nick','—'),'⚔️','§war:end:'||case when new.winner is null then 'tie' when new.winner=x.c then 'win' else 'lose' end||':'||x.s1||':'||x.s2,'tr'
  from (values(new.clan_a,new.score_a,new.score_b),(new.clan_b,new.score_b,new.score_a)) v(c,s1,s2) cross join lateral (select v.c c,v.s1 s1,v.s2 s2,coalesce((m->>'id')::uuid,(select user_id from public.clan_members where clan_id=v.c order by joined_at limit 1)) u) x where x.u is not null;
 return new; end $$;
drop trigger if exists front_settle_ann on public.front_wars;
create trigger front_settle_ann after update on public.front_wars for each row execute function public.sf_front_trg_settle();
-- eşleşme bulununca duyuru
create or replace function public.sf_front_trg_start() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.messages(channel,user_id,nick,avatar,body,lang)
  select 'clan:'||v.c,u,coalesce((select tag from public.clans where id=v.o),'?'),'⚔️','§war:start','tr'
  from (values(new.clan_a,new.clan_b),(new.clan_b,new.clan_a)) v(c,o) cross join lateral (select user_id u from public.clan_members where clan_id=v.c order by joined_at limit 1) q;
 return new; end $$;
drop trigger if exists front_start_ann on public.front_wars;
create trigger front_start_ann after insert on public.front_wars for each row execute function public.sf_front_trg_start();

-- savaş günlüğü + MVP (savaşın tarafı olan klan üyeleri)
create or replace function public.front_log(p_war bigint) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c uuid:=public.my_clan(); w public.front_wars; me text; begin
 select * into w from public.front_wars where id=p_war; if w.id is null or c is null or c not in (w.clan_a,w.clan_b) then raise exception 'Savaş bulunamadı'; end if;
 me:=case when w.clan_a=c then 'a' else 'b' end;
 return jsonb_build_object('mvp',public.sf_front_mvp(p_war),'me',me,'log',(select coalesce(jsonb_agg(jsonb_build_object('t',h.created_at,'side',h.side,'mine',h.side=me,'stars',h.stars,'dmg',round(h.dmg),'bid',h.bid,
   'a',jsonb_build_object('nick',pa.nick,'avatar',pa.avatar),'d',jsonb_build_object('nick',pd.nick,'avatar',pd.avatar)) order by h.id desc),'[]')
  from (select * from public.front_hits where war=p_war order by id desc limit 40) h join public.profiles pa on pa.id=h.attacker join public.profiles pd on pd.id=h.target)); end $$;
-- savaş saldırısı tekrarı (savaşın iki klanından herkes izleyebilir)
create or replace function public.front_replay(p_bid bigint) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c uuid:=public.my_clan(); b public.battles; w public.front_wars; begin
 select * into b from public.battles where id=p_bid and kind='front'; if b.id is null then raise exception 'Savaş bulunamadı'; end if;
 select * into w from public.front_wars where id=(b.loot->>'war')::bigint; if c is null or c not in (w.clan_a,w.clan_b) then raise exception 'Savaş bulunamadı'; end if;
 return jsonb_build_object('id',b.id,'kind','front','win',b.win,'stars',(b.loot->>'stars')::int,'dmg',(b.loot->>'dmg')::numeric,'rounds',b.rounds,'att_nick',b.att_nick,'def_nick',b.def_nick,
  'att_avatar',(select avatar from public.profiles where id=b.attacker),'def_avatar',(select avatar from public.profiles where id=b.defender),'att_power',b.att_power,'def_power',b.def_power); end $$;
revoke execute on function public.sf_front_trg_battle(), public.sf_front_trg_settle(), public.sf_front_trg_start(), public.sf_front_mvp(bigint) from public, anon, authenticated;
revoke execute on function public.front_log(bigint), public.front_replay(bigint) from public, anon;
grant execute on function public.front_log(bigint), public.front_replay(bigint) to authenticated;
