# Son Fener: Sis Denizi — Rakip Analizi ve Tasarım Planı (29 Ekim 2026)

## Pazar özeti
- 2025'te Last War (~2,4 Mr $) ve Whiteout Survival (~2,2 Mr $) dünyada en çok kazanan iki mobil oyun; strateji kategorisi ~15 Mr $ (Sensor Tower: https://sensortower.com/blog/top-grossing-mobile-games-live-ops-strategies-2025-report)
- 2026 1. yarı: Whiteout ~723 M $, Last War ~693 M $ (düşüşte) (https://eu.36kr.com/en/p/3923873237989505)
- Whiteout'un Kasım 2025 rekoru (116,9 M $) indirme artışıyla değil, yeni uç seviye ekipman + transfer prestiji ile geldi (https://leosmith-analyst.itch.io/appark-data-tool/devlog/1307587/case-study-deconstructing-the-116m-live-ops-strategy-of-whiteout-survival-nov-2025-analysis)

## Rakipler (çekirdek döngü / rekabet / gelir / oyuncu şikâyeti)
| Oyun | Çekirdek | Rekabet | Gelir | Şikâyet |
|---|---|---|---|---|
| Whiteout Survival | Ocak ısıt, hayatta kalan yönet, kahraman | Eyalet (state) savaşı, SvS, Başkanlık, Ayı Avı | Nesil kahramanları, parça paketleri, kademeli paketler, transfer bileti (4,99–99,99 $) | Yeni nesil kahraman eskileri değersiz kılıyor |
| Last War | Birlik birleştirme, üs, kahraman | Sezonlar, Warzone savaşları, ittifak düellosu | Kahraman parçası, dev paketler, günlük teklifler | Aldatıcı reklamlar, ağır P2W |
| Castle Clash | Kahraman toplama, kale savunma | Lonca Savaşları, Fortress Feud, Arena | Kahraman satın alma, bazaar paketleri | Lonca savaşında harcayanlar ezer |
| Rise of Kingdoms | Medeniyet, komutan, açık harita | KvK sezonları (Lost Kingdom) | Komutan heykelleri, VIP, hızlandırma | KvK'da harcamayan "kum torbası" |
| Lords Mobile | Lonca, kahraman, savaş | KvK, Lonca Fest, Kale | Paketler, VIP, ganimet | KvK düşük harcayanı yorar |
| Clash of Clans | Üs kur, baskın | Klan Savaşı, CWL, Ligler | Gold Pass, mücevher, inşaatçı | Yükseltme süreleri; ama en "adil" algı |
| Top War | Birleştirme + savaş | Sunucu savaşları | Paketler, VIP | Mini oyun reklamları gerçek değil |
| Age of Origins | Zombi 4X, birim | Sunucu savaşları, sezonlar | Paketler, hızlandırma | P2W, uzun süreler |
| Puzzles & Survival | 3'lü eşleşme + 4X | Sunucu savaşı | Kahraman parçaları, paketler | Bulmaca ikincil kalıyor |

Ortak bağımlılık kaynakları: ittifak/klan aidiyeti, sunucu kimliği ("bizim eyalet"), takvimli etkinlik ritmi, sıralama, kademeli kişisel teklifler.
Ortak nefret: sınırsız harcama farkı, yeni nesil kahramanla güç enflasyonu, aldatıcı reklam, harcayanın harcamayanı sürekli soyması.

## Son Fener'in özgün farkı (konumlandırma)
"Rekabetçi ama adil 4X": Sis Denizi'nde fener ağı + birleştirme + kaptan filosu. Harcama hız ve kolaylık getirir; kazanma stratejiyle olur.

## Öncelikli özellikler
1. **Deniz Bölgeleri (sunucu sistemi)**: her bölge ~1000 oyuncu, açılış tarihli; bölge sohbeti, bölge Valisi (seçimle). Yeni oyuncu her zaman yeni bölgeye.
2. **Sezonlar (8 hafta)**: sezon haritası, sezon kaptanı, sezon sonunda kozmetik ödüller; güç kısmen korunur, sezon kaynakları sıfırlanır.
3. **Fener Savaşı (bölge vs bölge, haftalık)**: Hazırlık günleri (günlük temalı puan: inşa, eğitim, çağırma, araştırma) + cumartesi Sis Kapısı savaşı; ortadaki Büyük Fener'i tutan bölge haftalık bonus alır.
4. **Sis Cephesi (klan savaşı, 2x/hafta)**: kişi başı sınırlı saldırı hakkı (3), güç bandına göre eşleşme.
5. **Kaptanlar Arenası**: ligler (Bronz→Efsane), güç normalize "Eşit Arena" modu (herkes aynı seviyede kaptanla — saf strateji).
6. **Ada baskınları**: kalkan, yeni oyuncu koruması (7 gün), en fazla %20 kaynak kaybı, intikam ve tekrar izleme.
7. **Etkinlik takvimi**: Pzt-Cuma hazırlık temaları, Cmt Fener Savaşı, Paz Kraken; aylık bir tema etkinliği; 8 haftada bir sezon.
8. **Klan**: klan yardım (süre kısaltma), klan teknolojisi, klan mağazası, ortak Kraken.

## Monetizasyon tasarımı
- **Premium kaptanlar**: her sezon 1 "Efsanevi Kaptan" — çıkışta paketle/ücretli etkinlik yoluyla erken erişim; 30–60 gün sonra parçaları ücretsiz yollarla (klan mağazası, etkinlik, arena) alınabilir. Kozmetik tamamen ücretli kaptan görünüşleri.
- **Kaptan çağırma (gacha)**: oranlar çağırma ekranında açık; 40'ta garanti (mevcut) + 80'de seçmeli efsanevi; garanti sayaçları görünür.
- **İlerleme hızlandırma**: hızlandırmalar, enerji yenileme, "Rota Bileti" (geçilmiş sefer/bölümü atla, sadece önceden 3 yıldızla geçilmişse), inşaat kuyruğu 2. usta.
- **Fener Bileti** (sezonluk ücretsiz + premium şerit), Aylık Kart, VIP (sadece kolaylık; en üst seviyeler kozmetik ağırlıklı).
- **Kademeli paketler**: ilk alım paketi, büyüme fonu; fiyat her zaman gerçek para birimiyle gösterilir.
- **Adalet önlemleri**: Arena "Eşit" modu; Fener Savaşı'nda güç bandı eşleşmesi; ücretsiz oyuncu için her kaptana giden yol ve 18 yaş altına varsayılan limit.

## Hukuk ve mağaza uyumu
- Gerçek ödeme yalnızca Apple IAP / Google Play Billing (Apple 3.1.1: https://developer.apple.com/app-store/review/guidelines/ ; Google: https://support.google.com/googleplay/android-developer/answer/9858738)
- Rastgele ödüllerde oranlar satın almadan önce ve hemen yanında gösterilir.
- Satın alınan oyun parası süresi dolmaz; satın alımları geri yükleme.
- AB CPC Sanal Para İlkeleri (2025): fiyatı gerçek parayla göster, karışık para dönüşümleri yok, sahte aciliyet yok, çocukları hedefleme yok (https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en?filename=Key+principles+on+in-game+virtual+currencies.pdf)
- Türkiye: 6502 sayılı Tüketicinin Korunması Kanunu ve Mesafeli Sözleşmeler Yönetmeliği (dijital içerikte cayma hakkının istisnası için açık onay alınmalı), KVKK aydınlatma metni; Google/Apple girişte veri işleme açıklaması.
- Yaş derecelendirmesi: IARC (Google) / Apple yaş anketi — "rastgele ücretli öğe" ve "kullanıcı etkileşimi (sohbet)" beyan edilir; PEGI'de "In-game purchases (includes random items)" etiketi.
- Sohbet: küfür filtresi, şikâyet/engelleme, moderasyon (Apple/Google UGC kuralları).
- Kaçınılacak karanlık desenler: sahte geri sayım, gizli fiyat, tekrar tekrar açılan zorlayıcı pop-up, "kaybedeceksin" baskısı, reklamda olmayan oynanış.

## İzlenecek KPI'lar (hedef)
D1 ≥ %40, D7 ≥ %15, D30 ≥ %6; ödeyen dönüşümü ≥ %3; ARPDAU 0,30–0,60 $; oturum/gün ≥ 4; klan üyelik oranı (D7) ≥ %50; ücretsiz oyuncuların D30 tutunması ödeyenlerin ≥ %50'si; iade/şikâyet oranı.

## Yol haritası
- **2 hafta**: hesap + bulut kayıt + kullanıcı adı, dünya/klan sohbeti + çeviri, klan kurma/yardım, Arena v1 (asenkron), ada baskını v1 (kalkan, koruma), oran ekranı, analitik olayları.
- **1 ay**: Deniz Bölgeleri, Sis Cephesi klan savaşı, haftalık etkinlik takvimi, Fener Bileti sezon 1, ilk premium kaptan (ücretsiz yol ile).
- **3 ay**: Fener Savaşı (bölge vs bölge), 8 haftalık sezonlar, Vali seçimi, Capacitor ile Android/iOS + gerçek IAP, yaş derecelendirmesi, moderasyon araçları, A/B testleri.

## Uygulanan: Faz D (b39)
- VIP puanı sunucuda (pay_state.vip_pts); VIP 0–10 eşikleri 100…30000. VIP7 +1 Kale sırası, VIP8 revir elmas −%25, VIP9 kalkan −%20, VIP10 Kale hızlandırma −%20. VIP2 veya 500💎 kalıcı 2. sıra.
- DEMO satın alma: shop_buy_demo (gerçek ödeme yok); her alım pay_log'a yazılır. İlk alım ×2 elmas + 1000 her kaynak. Fiyat/içerik birebir; sahte indirim/sayaç yok; harcama limiti yok (mevcut öz-denetim uyarısı istemcide kalır).
- Günlük etkinlik (00:00 UTC sıfırlama) 20/40/60/80/100 sandık; toplam harcama sandıkları ₺100…6000.
- Sunucu kayda yazınca data.saved damgalanır; istemci sf_ssv ile sunucunun yeni olduğunu anlar ve benimser (eski sekme satın almayı ezemez).
- Kalan: günlük teklif ve sezon rotası hâlâ istemci tarafı; VIP puanı max(istemci,sunucu).
