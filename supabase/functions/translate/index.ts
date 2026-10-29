// Sohbet çevirisi: oyuncu okuyabildiği bir mesajı kendi diline çevirir. Ücretsiz MyMemory API; (mesaj, dil) başına önbellek; kullanıcı başına günlük sınır.
import { createClient } from "npm:@supabase/supabase-js@2";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const LANGS = new Set(["tr","en","de","fr","es","pt-BR","ru","ar","id","zh-CN","zh-TW"]);
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { id, to } = await req.json();
    if (!Number.isInteger(id) || !LANGS.has(to)) return J({ error: "bad request" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await user.auth.getUser(); if (!u?.user) return J({ error: "auth" }, 401);
    // RLS: yalnız okuyabildiği kanaldaki mesaj
    const { data: m } = await user.from("messages").select("id,body").eq("id", id).maybeSingle();
    if (!m) return J({ error: "not found" }, 404);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await admin.from("msg_tr").select("body,src").eq("msg", id).eq("lang", to).maybeSingle();
    if (c) return J({ text: c.body, src: c.src, cached: true });
    const day = new Date().toISOString().slice(0, 10);
    const { data: us } = await admin.from("tr_usage").select("n").eq("user_id", u.user.id).eq("day", day).maybeSingle();
    if ((us?.n ?? 0) >= 300) return J({ error: "limit" }, 429);
    await admin.from("tr_usage").upsert({ user_id: u.user.id, day, n: (us?.n ?? 0) + 1 });
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(m.body)}&langpair=autodetect|${to}`);
    const d = await r.json().catch(() => ({ responseStatus: r.status }));
    let text: string = d?.responseData?.translatedText ?? "";
    const src: string = d?.responseData?.detectedLanguage ?? "";
    if (!text || d?.responseStatus != 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(text)) return J({ error: "upstream", st: d?.responseStatus ?? r.status, det: String(d?.responseDetails ?? "").slice(0, 160) }, 502);
    if (src && src.slice(0, 2) === to.slice(0, 2) && !to.startsWith("zh")) text = m.body;
    await admin.from("msg_tr").upsert({ msg: id, lang: to, body: text, src });
    return J({ text, src, cached: false });
  } catch (e) { return J({ error: String(e) }, 500); }
});
