# Son Fener — Art v4 style brief

## Hedef his
Sıcak, boyalı (painted) görünümlü, okunaklı bir **kale-şehir üssü**. Referans *türü*: Whiteout Survival / Castle Clash / Legend Online tarzı izometrik üs oyunları. Hiçbir asset, isim, yerleşim ya da UI kopyalanmaz; sadece tür dilinden ilham alınır: merkezde bir kale, etrafında parseller, yollar, sur ve kapılar, her yerde küçük hayat.

## Görsel kurallar
- **Merkez kale:** fener artık sekizgen kaide, sur, kuleler, meşaleli ön kapı, payandalı taş gövde ve bayraklardan oluşan bir kale. Tepede kırmızı-beyaz bantlı fener var. Tier 2'de altın kubbe eklenir.
- **3 tier dili** (TIER: lv1-3 / 4-6 / 7+):
  - 0 = ahşap + saman çatı
  - 1 = sıva + ahşap karkas + kiremit
  - 2 = taş + altın süs + mavi arduvaz
- **Silüetler:** her binanın ayırt edici bir silüeti var (baca dumanı, değirmen, maden ağzı, iskele, kule).
- **Zemin:** taş bordürlü çimen parseller, arnavut kaldırımı meydan, kıyı konturunda kazık sur, 4 kapı, kapı kuleleri, meşaleler ve iskele.
- **Hayat:** duman (baca konumundan), bayraklar, meşale ışıltısı (gece güçlenir), işçiler ve martılar.
- **Geri bildirim:** inşaat iskelesi; yapı bitince veya seviye atlayınca ışık sütunu (pillar) ve partikül patlaması.
- **Kamera:** pol .84 ile biraz daha yatık. Binaya dokununca kamera yumuşakça odaklanır (tap-to-focus); kaydırma odaklamayı iptal eder.

## Teknik yaklaşım: prosedürel three.js (hibrit değil)
- Harici asset yok. Lisans riski yok, fal veya login bağımlılığı yok, yükleme boyutu sıfır.
- Tier varyasyonu parametrik olarak tek fonksiyonla üretilir.
- **Çizim çağrıları:** mergeStatic opak Lambert parçalarını vertex-color ile birleştirir. Çağrı sayısı sahneye, kameraya ve kaliteye göre değişir; güncel ölçümler aşağıdaki yerel kontrolün raporunda bulunur.
- logic.js'e dokunulmadı.

## Güncel ana oyuna aktarım — 29 Ekim 2026

Grafikler `son-fener-preview` / `origin/art-v4` üzerindeki `932106e` commitinden, ana oyunun `40988a2` sürümüne seçici olarak aktarıldı. Önizlemenin eski oyun mantığı alınmadı. `logic.js`, `online.js`, SQL dosyaları, çeviriler ve kayıt yükleme/kaydetme akışı ana sürümle aynı kaldı. 40/80 çağrı garantileri, seçmeli kaptan, çevrimiçi Fener Bileti, posta ve klan/sıralama bağlantıları korundu.

Aktarıma eşlik eden grafik düzeltmeleri:

- Ortak geometri ve malzemeler, tek bir bina yenilendiğinde silinmez; nesneye özel kaynaklar ve eski karo instance buffer'ları temizlenir.
- Ada dekorasyonu her geçişte bir kez oluşturulup birleştirilir; önceki dekorasyonun kaynakları temizlenir.
- Kamera odağı zamana bağlı ilerler; kadraj hesabı odağı hareket ettirmez. Dokunma, kaydırma, yakınlaştırma ve ada geçişi bekleyen odağı iptal eder.
- Fenerin yüksekliği kadraj hesabına dahil edilir. Gölge haritası yüksek kalitede 2048, orta kalitede 1024; düşük kalitede gölgeler kapalıdır.
- Service worker sürümü `sf-b23-art4-1` oldu. Oyuncu kayıt anahtarı `sonfener1` ve kayıt sürümü değişmedi.

## Yerel doğrulama

```sh
node tools/check_state_compat.mjs
python3 tools/check_i18n.py
node --check game.js
node --check sw.js
node tools/check_art_v4.mjs
```

Tarayıcı kontrolü Playwright ve uyumlu Chromium gerektirir. Kurulu paketi kullanmak için `PLAYWRIGHT_MODULE=/tam/yol/playwright/index.mjs`, farklı bir Chromium çalıştırılabilir dosyası için `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/tam/yol/chromium` verilebilir. Tek senaryoyu çalıştırmak için `ART_QA_SCENARIO=render-settings` kullanılabilir.

Tarayıcı kontrolü kendi geçici localhost sunucusunu ve boş tarayıcı bağlamlarını açar; tüm dış origin isteklerini ve WebSocket bağlantılarını engeller. Gerçek oyuncu verisi veya canlı backend kullanmaz. Sentetik eski/güncel kayıtlar, mobil/masaüstü ekranları, kaptan sayaçları, menüler, sürükle-birleştir, ada geçişleri, tekrar kayıt/yükleme, kamera, kalite seçenekleri ve inşaat efektini kontrol eder. Ekran görüntüleri ve rapor `shots/art-v4/` altında oluşur (Git tarafından yok sayılır).

Aktarım sonrası sonuç: 7 kayıt/mantık testi ve 5 tarayıcı senaryosu geçti; 11 dilde 973 anahtar doğrulandı. Tarayıcı senaryolarında sayfa veya shader hatası yoktu. Tekrarlanan ada geçişlerinde mobilde 60, masaüstünde 59 geometri; her ikisinde 11 doku ve 23 shader programı sayısı sabit kaldı. Bu sayılar sentetik test sahnelerine aittir, cihaz performansı garantisi değildir.

Canlı Supabase işlemleri ve fiziksel mobil cihaz performansı bu kontrollerin kapsamı dışındadır. Yayına alma veya veritabanı güncellemesi yapılmadı.
