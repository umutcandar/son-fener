# 🗼 Son Fener: Sis Denizi

Sular yükseldi, dünyayı zehirli bir Sis kapladı. Adan, ışık kristaliyle beslenen bir Fenerin ışığı sayesinde ayakta.

- **Fener**: seviyesi güvenli inşa alanını ve diğer binaların en yüksek seviyesini belirler.
- **Sürükle-birleştir**: aynı tür ve seviyedeki iki binayı üst üste bırak, bir üst seviyeyi al. Süreli yükseltme ve 💎 hızlandırma da var.
- **Sis Gecesi**: belirli aralıklarla gelir. Yeterli 🔮 yoksa ya da Fener sönükse kenardaki binalar sislenir.
- Kurtulanlar sal ve batıklarla gelir. Meslekler: balıkçı, oduncu, kristal madencisi, gemi ustası.
- Tersanede tayfa eğit, kaptan çağır, sisli adalara filo gönder.

Mağaza DEMO'dur, gerçek ödeme alınmaz. Kayıt sadece tarayıcıda (localStorage) tutulur. Mantık (`logic.js`) çizimden (`game.js`) ayrıdır ve ileride çevrimiçi sisteme hazırdır.

## v2 — Büyük güncelleme
- Yeni sanat: kaptan portreleri, düşman kartları, kaynak ikonları, başlık ekranı, logo, PWA ikonu
- Detaylı fener (seviyeye göre gelişir), bina süsleri, tekneler, martılar, köpük, gün–gece döngüsü
- 7 kaptan (seviye/yıldız/parça/yetenek, gerçek oranlar + 40'ta garanti), gemi teçhizatı, 15 düğümlü araştırma ağacı
- 6 bölüm Fenerci Yusuf hikâyesi, 40 görev, günlük görevler, 14 başarım, 7 günlük giriş takvimi
- Haftalık Kraken boss + bot sıralaması, 3 ada (Fener, Mercan Atolü, Kül Adası)
- WebAudio ambiyans müziği, yeni efektler, Ayarlar (ses, müzik, titreşim, sıfırla, dil)
- DEMO monetizasyon (Fener Bileti, aylık kart, VIP, teklifler) — gerçek ödeme YOK
- Klan önizlemesi (bot klanlar, açıkça etiketli); Sohbet yakında

## 🌐 Çok dil / i18n

Diller: tr (varsayılan), en, de, fr, es, pt-BR, ru, ar (RTL), id, zh-CN, zh-TW — `i18n/<kod>.json`.
Dil seçimi: `?lang=xx` → `localStorage.sf_lang` → `navigator.languages` → `tr`. Ayarlar ▸ Dil ile değişir (sayfa yenilenir).

```js
import {t as tx, fmtNum, fmtDate, lang} from './i18n.js';
tx('ui.tamam')                  // "Tamam" / "OK"
tx('ui.yakinda', ['Klan'])      // "{0}" yer tutucuları dizi ile
tx('some.key', {name:'Ali'})    // "{name}" nesne ile
```
- Yeni metin: anahtarı **önce `i18n/tr.json`**'a ekle (eksik çeviri → tr → anahtarın kendisi gösterilir).
- Anahtar önekleri: `ui.*` arayüz (game.js), `html.*` statik index metinleri (`applyDom` ile), `e.*` logic.js mesajları (toast'ta `tl()` ile ters çevrilir), `d.<EXPORT>.<yol>` logic.js veri tabloları (`localizeData(L)` yerinde çevirir).
- `logic.js` saf kalır; içinde `t()` çağrılmaz. game.js'te yerel `t` değişkenleri olduğu için import adı `tx`.
- Sayılar/tarihler: `fmtNum`, `fmtDec`, `fmtDate` (Intl, aktif yerel ayar).

## 🎨 Sanat yönü / UI kiti (v3)

- **Palet:** derin deniz `#0e2838` → teal panel `#1b4a5e / #22566f`, çizgi `#7fd8e8`, vurgu altın `#ffd27a`, pirinç `#d8a84a → #9a6a22`, ahşap `#6e4425 → #b98250`, uyarı mercan `#d8433a`.
- **Tipografi:** Fredoka (700 başlık, 500–600 gövde); CJK için PingFang/Noto Sans SC-TC, Arapça için Noto Sans Arabic yedeği.
- **Paneller:** ahşap çerçeve (`--wood`) + iç pirinç çizgi + köşe perçinleri; başlıklar kırlangıç kuyruklu teal kurdele (`#modal h2`); alt sayfalar pirinç + ahşap üst kenar.
- **Butonlar:** `.btn` + renk sınıfı (`o` turuncu ana eylem, `g` yeşil/onay, `x` ikincil), üst parlama + alt gölge.
- **3B:** tüm Lambert malzemelerde toon bant + rim ışık + yumuşak AO (`toon()`); okyanus derinlik rengi + parıltı + kıyı halkası (`waterMat()`); sis sprite'larında animasyonlu fbm gürültüsü (`fogMat()`).
- **Seviye detayı:** Sv2 fıçı, Sv3 dalgalanan bayrak, Sv4 baca + duman, Sv6 taş/altın kaide, Sv8 parlayan fener.
