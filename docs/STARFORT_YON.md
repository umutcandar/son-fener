# Starfort — ürün yönü

## Dünya ve oyuncu vaadi

Gökyüzünden düşen yıldız parçaları krallıkları yıktı. Son kale, Yıldız Çekirdeği'nin çevresinde hayatta kaldı. Oyuncu kalenin komutanı olarak üretimi yeniden kurar, yedi kahramandan bir sefer birliği seçer ve parçaların değiştirdiği topraklarda ilerler. Çekirdek hem kalenin silueti hem savaş gücünün anlatısal kaynağıdır.

Görsel yön: koyu taş surlar, hasarlı ortaçağ yapıları, sıcak meşale ışıkları, soğuk yıldız parıltısı. Mobil ekranda bina işlevleri ve kahraman rolleri okunur kalmalı; karanlık atmosfer etkileşimi gizlememeli.

## Referanslardan aldığımız tasarım soruları

- [Castle Clash](https://play.google.com/store/apps/details?id=com.igg.castleclash) kahramanlar ile üs geliştirmeyi birlikte sunuyor. Starfort için yorumumuz: kalede yapılan yatırımın seferdeki karşılığını oyuncu görebilmeli.
- [Wartune'un resmi tanıtımı](https://www.gamehollywood.com/company/en/thread-114_en.html) sıra tabanlı RPG, yetenek gelişimi ve kale kurmayı bir araya getiriyor. Yorumumuz: karakter gelişimi, savaş sırasında küçük ama anlamlı kararlar üretmeli.
- [Whiteout Survival'ın resmi sayfası](https://www.centurygames.com/games/a/) ittifak, teknoloji ve kaynak rekabetini öne çıkarıyor. Yorumumuz: ileride ortak kale hedefleri sosyal bağlılık sağlayabilir; ilk prototipte bu sistemler vaat edilmiyor.

Bu ilkeler özgün bir dünya, karakter kadrosu, sahne ve arayüze çevrilir; referans oyunların varlıkları ve ekranları kopyalanmaz.

## İlk oynanabilir döngü

Üretimden kaynak kazan → kaleyi veya kahramanı geliştir → Aldren/Lyra/Rovan/Mira/Doran/Vesper/Eira arasından üç kişilik dizilim kur → sekiz PvE aşamasından erişilebilir olanı seç → savaş kararlarıyla ödül kazan → kaleye dön.

Savaş 40 yıldız yüküyle başlar. `strike` saldırı yapıp 25 yük kazandırır; `guard` daha zayıf saldırır, 40 yük kazandırır ve o tur alınan hasarı yarıya indirir. `star` 100 yük tüketerek düşman grubuna hasar ve müttefiklere iyileştirme sağlar. Üç kahraman seçimi kadro farklarını denemeyi kolaylaştırır; yedi kahraman farklı takım bileşimlerini denemeye izin verir. Sekiz aşama ilerleme hızını sınayan sınırlı bir kampanyadır.

Kale (`keep`) yükseltme sınırını/üretimi, demirhane (`forge`) takım saldırısını, han (`tavern`) canı geliştirir. Çiftlik (`farm`) altın, keresteci (`lumber`) kereste, taş ocağı (`quarry`) taş, gözlemevi (`observatory`) yıldız özü üretir. Bina ve kahraman geliştirme kaynaklar için seçim oluşturur. Sıra tabanlı savaş, ilk prototipte taktik kararların okunmasını kolaylaştırır; gerçek zamanlı ordu yönetimi kapsam dışındadır.

## Fazlar ve kabul ölçütleri

| Faz | Kapsam | Çıkış ölçütü |
| --- | --- | --- |
| 1 — Yerel prototip | Ayrı `starfort/` girişi, 7 bina, 7 kahraman/3 kişilik dizilim, 2 ayrı eğitim kahramanı, 9 ekipman, 8 PvE aşaması, üretim ve geliştirme, `starfort:v1` kayıt | Kurallar testleri geçer; yeni oyun → geliştirme → savaş → yeniden yükleme akışı mobil/masaüstünde tamamlanır; geçersiz eylemler kaynak veya fazladan ödül üretmez. |
| 2 — Hesap ve güvenilir ilerleme | Starfort'a ayrılmış backend, hesap, bulut kayıt; savaş sonucu ve ekonomi için sunucu otoritesi | İki cihaz aynı ilerlemeyi yükler; kayıt çakışması çözülür; yinelenen ödül talebi ve geçersiz istemci sonucu sunucuda reddedilir; Son Fener verisi etkilenmez. |
| 3 — İttifak ve toprak | Ortak hedefler, bölge sahipliği, ardından ihtiyaç doğrultusunda gerçek zamanlı eşitleme | Yetki ve eşzamanlılık testleri geçer; bağlantı kesilmesi/yeniden bağlanma doğru duruma döner; oyuncular ortak hedefi ve katkısını anlayabilir. |

Faz 2–3 bugün sunulan özellikler değildir. Kapsamları yerel oynanış geri bildirimi ve teknik doğrulama sonrasında ayrıntılandırılır; sabit teslim tarihi veya gelir tahmini verilmez.

## Korunacak sınırlar

Son Fener'in mevcut dosyaları ve tamamlanmamış yerel çalışmaları korunur. Starfort `sonfener1` kaydını okumaz/yazmaz ve mevcut çevrimiçi servisi kullanmaz. Mağaza kullanıcının seçimiyle prototiptir; gerçek ödeme, gacha ve canlı oyuncu rekabeti yoktur. “Starfort” için ad/marka uygunluğu araştırması ayrıca yapılmalıdır.

## Güncel uygulama notu — v0.5

Cephanelik, tek seferlik sefer ganimetleri, Aurelion/Nyxara eğitimleri ve tam boy karakterli savaş ekranı eklendi. Yeni savaşlar hedef seçimi, büyücü alan saldırısı ve önceden belirtilen boss yıkımı içeriyor. Yıldız çağrısı yıkımı engelleyebilir. Ayrıntılı kaynaklar, eksikler ve sonraki işler [rakip incelemesinde](STARFORT_RAKIP_INCELEMESI.md).
