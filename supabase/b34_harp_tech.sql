-- b34: Harp Akademisi techs (tact atk +5%/lv, bulw hp +5%/lv) in server combat power; mirrors logic.js atkM/hpM
CREATE OR REPLACE FUNCTION public.sf_army(d jsonb, OUT atk numeric, OUT hp numeric, OUT power integer, OUT lootm numeric)
 RETURNS record LANGUAGE plpgsql STABLE SET search_path TO ''
AS $function$
declare hb numeric:=0; sa numeric:=0; sh numeric:=0; sl numeric:=0; ta numeric; th numeric; r record; ty numeric[];
begin
 for r in select h.id,h.sk_t,h.sk_v, round(h.p*(1+.5*(public.sf_n(d,array['heroes',h.id,'star'],6)-1))*(1+.1*(greatest(public.sf_n(d,array['heroes',h.id,'lv'],60),1)-1)))*(1+.06*public.sf_n(d,array['heroes',h.id,'tal'],5))*(1+.03*(public.sf_n(d,array['heroes',h.id,'eq','k'],5)+public.sf_n(d,array['heroes',h.id,'eq','s'],5)+public.sf_n(d,array['heroes',h.id,'eq','c'],5))) hp_,
   public.sf_n(d,array['heroes',h.id,'star'],6) st
   from public.hero_def h where d->'heroes' ? h.id and public.sf_n(d,array['heroes',h.id,'star'],6)>=1 order by 4 desc limit 3 loop
  hb:=hb+r.hp_; if r.sk_t='atk' then sa:=sa+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='hp' then sh:=sh+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='loot' then sl:=sl+r.sk_v*(1+.25*(r.st-1)); end if;
 end loop;
 ta:=(1+public.sf_n(d,'{tech,harp}',5)*.1)*(1+public.sf_n(d,'{tech,tact}',5)*.05)*(1+public.sf_n(d,'{gear,cannon}',10)*.06)*(1+sa);
 th:=(1+public.sf_n(d,'{tech,hull}',5)*.1)*(1+public.sf_n(d,'{tech,bulw}',5)*.05)*(1+public.sf_n(d,'{gear,plate}',10)*.06+public.sf_n(d,'{gear,sail}',10)*.04)*(1+sh);
 ty:=array[public.sf_n(d,'{troops,tayfa}',100000),public.sf_n(d,'{troops,zipkin}',100000),public.sf_n(d,'{troops,topcu}',100000)];
 atk:=(ty[1]*10+ty[2]*14+ty[3]*19)*ta+hb*1.2; hp:=(ty[1]*40+ty[2]*28+ty[3]*18)*th+hb*2;
 power:=round((ty[1]*10+ty[2]*14+ty[3]*19)*ta+(ty[1]*40+ty[2]*28+ty[3]*18)*th*.25+hb*2);
 lootm:=(1+public.sf_n(d,'{tech,loot}',3)*.1+public.sf_n(d,'{gear,sail}',10)*.03)*(1+sl);
end $function$;
