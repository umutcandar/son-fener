# Savaş Revizyonu — "Starfort Kalesi"

**Tema (30 Eki 2026):** Son fener, sis orduları ve deniz leviathanlarının kuşattığı yanan bir savaş kalesine dönüşür. Ton karanlık, bosslar dev. Oyunun adı ve mevcut sistemler aynı kalır.
**Kurallar:** her şey sunucuda doğrulanır (RLS sıkı, yalnızca anon anahtar). Ödemeler DEMO'dur, olasılıklar dürüsttür, sahte fiyat ya da sahte sayaç yoktur. F2P oynanabilir kalır. Eski kayıtlar veri kaybı olmadan taşınır.
**Akışlar:** 3B görseller sanat akışına aittir (world.js, game.js warGo, binaların seviye görselleri). Mantık, sunucu, UI sayfaları ve i18n bu akıştadır.

## Faz A — Ortak dünya haritası ✅ canlı (b36)
120×120 deniz, her kaptana bir ada, sis/korsan kampları (saatlik yenilenir), seferler, ada taşıma.
RPC'ler: `world_me`, `world_view`, `world_attack_camp`, `world_resolve`, `world_relocate`. İstemci: `__online.open.world`, `__online.world`.

## Faz B — Ordu ✅ canlı (B/C sunucu + UI). Wartune tarzı şehre genişliyor ⏳
Canlı olanlar:
- Karşı tip üçgeni: Abordajcı > Zıpkıncı > Topçu > Abordajcı (×1,35; ters yönde ×0,75).
- Hat başına T1–T5 kademe: çarpan 1+0,3(t−1). Maliyet 600t²🐟, 450t²🪵, 80t²🔮.
- Revir: yaralı oranı saldıranda %60, savunanda %80. Kapasite 1000+20×aşama. İyileştirme: birlik başına 2🐟+1🪵, ya da 10 birlik başına 1💎.
- Deterministik 8 turluk savaş günlüğü: `{r,s,t:'hit'|'skill',v}`.
- Gönderme öncesi dizilim ekranı: birlik kaydırıcıları ve keşfe göre karşı tip ipucu.

### B2 — Wartune tarzı şehir (tasarım; bir sonraki uygulama adımı)
Kurallar:
- Her bina, Kale seviyesini geçemez.
- Yükseltme için kale seviyesi şartı + kaynak + süre gerekir.
- Hızlandırma 💎 ile yapılır (kalan her başlamış 1 dakika için 1💎). Bu, ana elmas harcama noktasıdır.
- 1 inşaat kuyruğu ücretsizdir. 2. kuyruk VIP 2 ile açılır.
- Formüller: maliyet = taban×1,18^(sv−1), süre = taban_s×1,22^(sv−1). Süre üst sınırı Sv30'da 24 saattir.

| anahtar | Bina | Rol | Maks | Şart |
|---|---|---|---|---|
| `kale` | Starfort Kalesi (Citadel) | her şeyi kilitler; seviye başına +2% güç | 30 | Kışla ve Sur ≥ sv−1 |
| `kisla` | Kışla | Abordajcı hattı: eğitim hızı, birlik kapasitesi +300/sv | 30 | Kale ≥ sv |
| `zkule` | Zıpkıncı Kulesi | Zıpkıncı hattı: kapasite +300/sv | 30 | Kale ≥ sv, Kale 3 |
| `dokum` | Top Dökümhanesi | Topçu (kuşatma) hattı: kapasite +300/sv, kale hasarı +2%/sv | 30 | Kale 5 |
| `tezgah` | Gemi Tezgahı | Akıncı (hızlı) hattı: sefer hızı +1%/sv | 30 | Kale 10 |
| `revir` | Revir | yaralı kapasitesi +500/sv, iyileştirme maliyeti −1%/sv | 30 | Kale 2 |
| `akademi` | Akademi | araştırma ağacı: hat kademeleri, saldırı/can/hız | 30 | Kale 4 |
| `sur` | Sur & Kuleler | ada kulesi gücü +%5/sv, kuşatmada dayanıklılık | 30 | Kale ≥ sv |
| `balik` / `kereste` / `kristal` | Balıkhane / Kereste / Kristal Ocağı | saatlik üretim | 30 | Kale ≥ sv |
| `ambar` | Ambar (Kasa) | yağmadan korunan miktar 2000×sv | 30 | Kale ≥ sv |

**Birlik hatları (T1→T5; kademe Akademi araştırmasıyla açılır: T2 Ak3, T3 Ak8, T4 Ak15, T5 Ak22):**

| Hat | T1 | T2 | T3 | T4 | T5 | yener | yenilir |
|---|---|---|---|---|---|---|---|
| Abordajcı (yakın) | Güverte Tayfası | Abordajcı | Kanca Ustası | Kızıl Korsan | Fener Muhafızı | Zıpkıncı | Topçu |
| Zıpkıncı (menzilli) | Zıpkıncı | Ağ Atıcı | Mızrakçı Avcı | Leviathan Avcısı | Sis Delen | Topçu, Akıncı | Abordajcı |
| Topçu (kuşatma) | Topçu | Havan Ustası | Humbaracı | Ateş Gemisi | Yanardağ Topu | Abordajcı, kaleler ×1,5 | Zıpkıncı, Akıncı |
| Akıncı (hızlı; `tezgah`) | Akıncı Kayığı | Kırlangıç | Baskın Kadırgası | Fırtına Kadırgası | Deniz Atı Süvarisi | Topçu | Zıpkıncı |

Mevcut `war_army.tier` doğrudan Akademi araştırma seviyesi olarak taşınır. Akıncı 4. tip olarak eklenir ve eski kayıtlarda 0 başlar.

**Dizilim ızgarası:** 3×3 ızgara. Kahraman (kaptan) bir kareye yerleşir, en fazla 4 birlik yığını diğer karelere.
- Ön sıra önce hasar alır.
- Arka sıradaki menzilli/kuşatma birlikleri +%10 alır.
- Kaptan uzmanlığı: kahraman `sk_t` değeri bir hatta +%8 verir.
- Dizilim `saves.data.form` içinde tutulur ve sunucuda doğrulanır.

**Birleştirme (merge) taşıması:** Mevcut birleştirmeli binalar silinmez.
- Her eski bina tipinin en yüksek seviyesi yeni karşılığının başlangıç seviyesi olur (üretim → kaynak binaları, kule → sur, liman → tezgah).
- `kale` = min(yeni binaların en yükseği, eski aşama).
- Eski alanlar kayıtta kalır (`S.legacy`). Geri dönüş mümkündür.

**Sunucu (planlı):** `city` jsonb (`saves.data.city`, sunucu kilitli). RPC'ler:
- `city_info()`
- `city_upgrade(key)`: şart + kaynak + kuyruk kontrolü
- `city_speed(key, gems)`
- `city_finish(key)`: sunucu saatine göre
- `research(line)`

**Sanat akışı veri kancaları:**
- `__online.city.list()` → `[{key, lvl, max, until, next:{cost, secs, req}}]`
- `__online.city.on(fn)`: olaylar `upgrade`, `done`
- `__online.army.lines()` → `[{line, tier, names[5], count, cap}]`

Her bina seviyesi görsel olarak değişmelidir (kademe: 1–5, 6–10, …).

Şu anda mevcut kancalar:
- `__online.world.army()`, `.fort()`, `.extra()`, `.reports()`, `.openArmy()`, `.openFort()`, `.on(fn)`. Olaylar: `view`, `extra`, `select`, `march`, `battle`.
- `__g.openWorld()`
- `__g.onBattleEvent(fn)`: her günlük girdisi için 350 ms arayla `fn(entry, battle)` çağırır, hem canlı hem tekrar için. Bir abonelikten çıkma fonksiyonu döndürür.

## Faz C — PvP ve Klan Kalesi ✅ canlı (sunucu + UI)
**Oyuncuya saldırı (`world_attack_player`):**
- Günde 15 saldırı, en fazla 2 sefer.
- Saldırmak kendi kalkanını kırar.
- Ada kuleleri 30/20/20 gücündedir.
- Yağma %15×(1−kale deposu koruması), üst sınır 400+1,5×güç.
- Savunan kazanırsa 4 saat, kaybederse 30 dakika kalkan alır.

**Diğer PvP özellikleri:**
- Keşif (`world_scout`) 50🐟 tutar ve yuvarlanmış istihbarat verir.
- Barış Kalkanı (`world_shield`): 8 saat 150💎, 24 saat 350💎.
- Raporlar (`war_reports`) tekrar oynatma (▶️) ve **İntikam** düğmesiyle gelir.

**Toplu saldırı (`war_rally_start/join`):**
- Hedef oyuncu, kale ya da kadim fener olabilir.
- Toplanma süresi 1 ya da 5 dakikadır, en fazla 10 üye katılır.
- Kale ve fener hedefleri yalnızca **savaş saatlerinde** açılır: her gün 20–22, hafta sonu ayrıca 14–16 (İstanbul saati).
- Klan sohbetine uyarı düşer.

**Klan Kalesi ("klandakilerle bir olup koruyacağımız üs"):**
- Lider adasına en fazla 8 kare uzaklığa yerleştirir (`fort_place`). Kale bir bölge çizer: yarıçap 2+sv/3.
- Üyeler bağışla seviye atlatır (`fort_donate`). 🔮 ×3 sayılır. Sv gereksinimi 3000×sv², en fazla Sv10.
- Seviye bonusları: klan gücü +%3/sv, yağma koruması %5/sv, dayanıklılık +2500/sv.
- Garnizon / geri çağırma (`fort_garrison`, `fort_recall`). Kale kuleleri 60×sv gücündedir.
- Dayanıklılık 0'a inerse kale 2 saat yanar ve bonuslar kapanır.
- Onarım (`fort_repair`): 1🪵 = 2 dayanıklılık, yangını da söndürür.
- Savunma kaydı ve gelen kuşatma uyarısı tutulur.

**Kadim fenerler:** 5 tarafsız hedef, (30,30) (90,30) (30,90) (90,90) (60,60). Tutan klan +%5 güç alır. Muhafızlar 180 gücündedir, bir klan tutuyorsa 270.

## Faz D — Dürüst para (planlı)
- **VIP 0–10:** kümülatif DEMO harcama puanıyla yükselir. Kalıcı ve görünür faydalar verir: 2. inşaat kuyruğu (VIP2), +%5 hızlandırma indirimi gibi. Harcama limiti eklenmez.
- **İlk yükleme bonusu:** bir kez, içeriği açıkça listelenir.
- **Paketler:** sabit içerik, gerçek indirim oranı yazılır, sahte sayaç olmaz.
- **Günlük aktivite çubuğu (Wartune):** görevler puan verir, 20/40/60/80/100 puanda sandık açılır. Tamamen ücretsizdir.
- **Kümülatif harcama sandıkları:** eşikler ve içerikler önceden görünür.
- **Elmas harcama noktaları:** hızlandırma, kalkan, revir, 2. kuyruk.
- **Elmas geliri:** günlük görevlerdeki elmas kademeli olarak azalır. F2P aktivite çubuğu ve etkinliklerle ilerlemeye devam eder.

## Durum
- A: canlı.
- B (kademe, revir, karşı tip, dizilim): canlı. B2 (şehir binaları, Akademi, 4. hat, ızgara): tasarım bu belgede, uygulama sıradaki adım.
- C: canlı.
- D: planlı.

## Uygulanan: Şehir (b38, `supabase/city.sql`)
- Tablo `war_city` (b, q, form, seeded). Yalnız sunucu yazar; RLS yalnız kendi satırını okur. 203 mevcut oyuncu güvenle tohumlandı (eski ada ızgarası silinmedi; `seeded` = ilk değerler).
- Tohum: kale = fener.lv; kışla/zkule/dökümhane = en yüksek Tersane; sur = Gözcü Kulesi; akademi = Gözlemevi (kale≥4); revir 1 (kale≥2); ambar 1.
- **Değişiklik:** kaynak binaları ada ızgarasında kalır (ekonomi bozulmasın); şehir askeri katmandır. Akademi eşikleri 2/5/9/14 (T2–T5); mevcut kademeler korunur.
- Etkiler: kışla/zkule/dökümhane +%1/sv kendi hattına; revir +300 kapasite/sv; ambar +%1,5/sv yağma koruması (en çok %60 toplam); sur ada kulesi +%15/sv.
- Maliyet taban×sv^1.6, süre taban×1.22^(sv−1) (≤24 sa), hızlandırma 1💎/başlamış dk, VIP2 → 2. sıra.
- Diziliş 3×3 (`city_form`): ön sırada Abordajcı +%5, arka sırada Zıpkıncı/Topçu +%10; ızgaradaki kaptan kendi hattına +%8 (diğer roller +%3). Etkin kademe `sf_war_tiers` içinde (0,3 = 1 kademe) → saldırı, savunma, garnizon hepsinde.
- Kancalar: `__online.city.{list,state,sync,on,open,upgrade,keys}`, `__online.army.{lines,info}`.
- Ertelendi: Akıncı (Gemi Tezgahı) hattı — savaş motoru değişikliği gerekir.
