# Son Fener — proje haritası

İnceleme tarihi: 29 Ekim 2026. Ana depo: `umutcandar/son-fener`, dal: `main`, incelenen commit: `40988a2035c5cee0dedbc6b064d7a07c9a11c897`.

Sonraki çalışma: art-v4 grafikleri güncel oyun mantığı korunarak yerelde aktarıldı. Ayrıntılar ve doğrulama komutları [ART_V4.md](ART_V4.md) içinde. Aşağıdaki inceleme bulguları ve satır referansları ilk incelenen commite aittir.

## Yapı

Oyun, derleme adımı olmayan bir statik web uygulaması. `package.json` yok; Three.js ve Supabase istemcisi `lib/` içinde bulunuyor. Ekran mobil kullanıma uygun tasarlanmış; PWA manifesti ve service worker var.

| Bölüm | Dosya / giriş noktası | Sorumluluk |
|---|---|---|
| Sayfa ve stil | `index.html` | HTML, CSS, yükleme ekranı; Supabase kitaplığı ve `game.js` yüklenir. |
| Grafik ve arayüz | `game.js` | Three.js sahnesi, prosedürel binalar, kamera, ses, menüler, dokunma/sürükleme, oyun döngüsü. |
| Oyun kuralları | `logic.js` | İnşa/birleştirme, üretim, işçiler, kaptanlar, araştırma, savaş, görevler ve takvim. DOM/Three.js bağımsızdır. |
| Çevrimiçi katman | `online.js` | Hesap, bulut kayıt, sohbet, klan, PvP, sıralama, posta ve sunucu ödülleri. |
| Sunucu | `supabase/*.sql` | Tablolar, RLS, RPC fonksiyonları ve özelliklere ait SQL güncellemeleri. |
| Çeviri | `i18n.js`, `i18n/*.json` | 11 dil; Türkçe yedek metinler. |
| Varlıklar/önbellek | `img/`, `fonts/`, `lib/`, `sw.js` | Yerel varlıklar; kod için önce ağ, görsel/font için önce önbellek. |

## Temel akış ve değişiklik noktaları

- `game.js:8`: JSON oyun durumu `S`, `sonfener1` localStorage anahtarından alınır; `logic.js` içindeki `newState` veya `migrate` ile hazırlanır. Beş saniyede bir yerel kayıt yapılır.
- `logic.js:222`: Kayıt sürümü ve migration. Yeni kalıcı alanlarda eski kayıtların eksik alanları tamamlanmalıdır.
- `game.js:294`: Ekran düğmeleri `data-a` üzerinden `ACT` tablosuna bağlanır. Oyun işlemi sonrası ilgili çizim, arayüz ve kayıt güncellenir.
- `logic.js:24`: Üç adanın ızgaraları; `S.g` aktif adadır. Tüm adaları ilgilendiren hesaplar `grids`/`allB` üzerinden ilerler.
- `logic.js:367`: `step(S, dt, now)` üretimi, tüketimi, süreleri ve sis olaylarını işler; arayüzün göstereceği olayları döndürür. `dt` saniye, `now` milisaniyedir.
- `logic.js:330`: Filo gücü, savaş simülasyonu ve sonuç uygulaması ayrıdır. `game.js:460` savaşın görsel akışıdır.
- `game.js:385`, `logic.js:311`: Kaptan çağırma; ücret arayüzde, sonuç mantıkta uygulanır. 40 çağrıda efsanevi garanti, 80 çağrıda seçim jetonu bulunur; sezon kaptanı havuz dışındadır.
- `game.js:719`: `window.__g`, oyun durumu ve UI yardımcılarını çevrimiçi katmana açar. `online.js` dinamik yüklenir.
- `online.js:41`, `online.js:60`: Bulut kayıt yerelle karşılaştırılır; `sf_rev` ile revizyon kontrolü yapılır. Sunucu kurallarıyla istemci kaynak/ilerleme değişiklikleri birlikte ele alınmalıdır.
- `online.js:238`, `online.js:324`: PvP, sıralama ve klan baskını arayüzleri. İlgili sunucu dosyaları arasında `ranks_b23.sql`, `clan_raid.sql`, `arena.sql`, `front_war*.sql` ve `fener_war_loop.sql` vardır.
- `online.js:342`: Posta ve Fener Bileti senkronizasyonu; `pass_mail.sql`, `pass_tier.sql` ve diğer SQL güncellemeleriyle birlikte okunmalıdır.
- Yeni metinler `i18n/tr.json` ve diğer dil dosyalarında tutulur. `logic.js` içine doğrudan arayüz çeviri çağrısı eklenmez.

## Ana oyun ve grafik önizlemesi

Karşılaştırılan önizleme: `umutcandar/son-fener-preview`, commit `932106e1c9d394d5b2b8b1b7f94d07bc914ce1f3`.

Önizlemenin art-v4 farkı çoğunlukla `game.js` içindeki prosedürel çizimdir: kale/surlar/iskele, taş bordürler, bina kademeleri ve kamera odaklanması. Karşılaştırılan commitlerde `index.html`, `img/`, `fonts/` ve `lib/` dosyaları aynıdır.

Önizleme daha eski oyun mantığına dayanır. Güncel ana oyundaki 80 çağrıda kaptan seçimi, yeni sıralama merkezi, klan baskını, posta ve Fener Bileti sunucu eşitlemesini içermez. Grafik aktarımı istenirse güncel ana oyun korunarak ilgili çizim değişiklikleri seçilmelidir; önizlemeyi bütünüyle ana oyunun yerine koymak özellik kaybına yol açar.

Kaynak: [art-v4 açıklaması](https://github.com/umutcandar/son-fener-preview/blob/932106e1c9d394d5b2b8b1b7f94d07bc914ce1f3/docs/ART_V4.md).

## Doğrulama ve mevcut sınırlar

Bu incelemede oyun kodu değiştirilmedi. Yapılan yerel kontroller:

- `python3 tools/check_i18n.py`: 973 anahtar, 11 dil — başarılı.
- `node --check`: `game.js`, `logic.js`, `online.js`, `i18n.js`, `sw.js`, `lib/three.module.js`, `lib/supabase.js` — başarılı.

Tarayıcıda oynanış ve canlı backend bu incelemede test edilmedi. `online.js` başlangıçta otomatik oturum açıp profil ve kayıt eşitlemesi yapar; sıradan bir yerel sayfa açılışı da yapılandırılmış backend'e yazabilir. İzole UI kontrolünde dış backend istekleri engellenmeli veya ayrı test backend'i kullanılmalıdır.

`t_war.py` genel bir birim testi değildir: iki Playwright oturumuyla klan oluşturma, savaşa katılma/saldırı ve sohbet gönderme işlemleri içerir. Bu incelemede çalıştırılmadı.

Sunucu kurulumu yalnız bu depodan tamamen yeniden üretilemiyor: istemcinin kullandığı `guest` Edge Function kaynağı yok; `supabase/functions/` altında yalnız `translate` bulunuyor. SQL dosyalarında birden fazla `create or replace` sürümü var, standart migration dizini yok. Canlıya hangi sürümlerin uygulandığı doğrulanmadı.

README'nin yalnız yerel kayıt ve bot klanları anlatan bölümleri güncel kodu yansıtmıyor. `docs/TASARIM_PLANI.md` bir yol haritası; bütün maddeleri uygulanmış özellik olarak kabul edilmemeli. Günlük UTC ve İstanbul takvimi yardımcıları farklı sistemlerde kullanılıyor; zamanla ilgili değişikliklerde mevcut davranış kontrol edilmeli.
