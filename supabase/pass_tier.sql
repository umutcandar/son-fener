-- Batch 22: Fener Bileti her 5 kademede bilgi postası
create or replace function public.sf_pass_xp(u uuid, src text, n int) returns int language plpgsql security definer set search_path='' as $$
declare p public.pass_state; d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); z text:=public.sf_pass_season(); used int; g int; begin
 if u is null or n<=0 then return 0; end if;
 insert into public.pass_state(user_id) values(u) on conflict do nothing;
 select * into p from public.pass_state where user_id=u for update;
 if p.season<>z then p.season:=z; p.xp:=0; p.prem:=false; p.cl_f:='{}'; p.cl_p:='{}'; end if;
 if p.dday<>d then p.dday:=d; p.dly:='{}'; end if;
 used:=coalesce((p.dly->>src)::int,0); g:=greatest(0,least(n,public.sf_pass_cap(src)-used));
 update public.pass_state set season=p.season, xp=p.xp+g, prem=p.prem, cl_f=p.cl_f, cl_p=p.cl_p, dday=p.dday, dly=jsonb_set(p.dly,array[src],to_jsonb(used+g)), updated_at=now() where user_id=u;
 if g>0 and (p.xp+g)/500>p.xp/500 and p.xp/100<30 then perform public.sf_mail(u,'system','mail.pass_tier',jsonb_build_array(least(30,((p.xp+g)/500)*5)),null); end if;
 return g; end $$;
