-- Faz D düzeltme: sunucu kayda yazınca data.saved damgası basılır; eski sekme/istemci çakışmada sunucuyu benimser (sunucu satın alma/harcama ezilmez)
create or replace function public.sf_stamp(d jsonb) returns jsonb language sql stable set search_path='' as $$ select jsonb_set(d,'{saved}',to_jsonb(greatest(public.sf_n(d,'{saved}',1e14)+1,floor(extract(epoch from clock_timestamp())*1000)))) $$;
CREATE OR REPLACE FUNCTION public.sf_pay_give(u uuid, p_gems integer, p_res jsonb, p_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare sv public.saves; d jsonb; k text; v numeric; begin select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Önce oyunu kaydet'; end if; d:=sv.data;
 for k,v in select key,value::numeric from jsonb_each_text(coalesce(p_res,'{}')) loop if k in ('fish','wood','crys') and v>0 then d:=jsonb_set(d,array['res',k],to_jsonb(public.sf_n(d,array['res',k],1e12)+v)); end if; end loop;
 if p_gems>0 then d:=jsonb_set(d,'{gems}',to_jsonb(public.sf_n(d,'{gems}',1e9)+p_gems)); end if;
 if p_patch ? 'builders' then d:=jsonb_set(d,'{builders}',to_jsonb(least(5,public.sf_n(d,'{builders}',10)+(p_patch->>'builders')::int))); end if;
 if p_patch ? 'monthly' then d:=jsonb_set(d,'{monthly}',to_jsonb(greatest(extract(epoch from now())*1000,public.sf_n(d,'{monthly}',1e14))+30*864e5)); end if;
 if p_patch ? 'buy' then d:=jsonb_set(d,'{buy}',coalesce(d->'buy','{}')||(p_patch->'buy')); end if;
 d:=jsonb_set(d,'{vipPts}',to_jsonb((select vip_pts from public.pay_state where user_id=u)));
 d:=public.sf_stamp(d); update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 return jsonb_build_object('rev',sv.rev,'res',d->'res','gems',d->'gems','troops',d->'troops','vipPts',d->'vipPts','builders',d->'builders','monthly',d->'monthly','buy',d->'buy','saved',d->'saved'); end $function$;
CREATE OR REPLACE FUNCTION public.sf_war_take(u uuid, p_res jsonb, p_tr jsonb, p_gems integer DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare sv public.saves; d jsonb; k text; v numeric; h numeric; begin
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if; d:=sv.data;
 for k,v in select key,value::numeric from jsonb_each_text(coalesce(p_res,'{}')) loop
  if k not in ('fish','wood','crys') or v<0 then raise exception 'Geçersiz'; end if; h:=public.sf_n(d,array['res',k],1e12);
  if h<v then raise exception 'Kaynak yetersiz'; end if; d:=jsonb_set(d,array['res',k],to_jsonb(h-v)); end loop;
 for k,v in select key,floor(value::numeric) from jsonb_each_text(coalesce(p_tr,'{}')) loop
  if k not in ('tayfa','zipkin','topcu') then raise exception 'Geçersiz'; end if; h:=public.sf_n(d,array['troops',k],1e7);
  if h<v then raise exception 'Yeterli birlik yok'; end if; d:=jsonb_set(d,array['troops',k],to_jsonb(h-v)); end loop;
 if p_gems>0 then h:=public.sf_n(d,'{gems}',1e9); if h<p_gems then raise exception 'Elmas yetersiz'; end if; d:=jsonb_set(d,'{gems}',to_jsonb(h-p_gems)); end if;
 d:=public.sf_stamp(d); update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 return jsonb_build_object('rev',sv.rev,'res',d->'res','troops',d->'troops','gems',d->'gems','saved',d->'saved'); end $function$;
