# Starfort — oynanış incelemesi ve geliştirme yönü

30 Ekim 2026. Karşılaştırma resmî ürün sayfaları ve yerel Starfort kodu üzerinden yapıldı. Rakip oyunlarda uzun süreli oynanış veya ekonomi testi yapılmadı. Aşağıdaki ürün önerileri bu kaynaklardan çıkardığımız tasarım yorumlarıdır.

## Rakiplerin güçlü tarafları ve Starfort'a karşılığı

| Referans | Kaynakta görülen sistemler | Starfort'taki karşılığı ve eksik taraf |
| --- | --- | --- |
| [Castle Clash — IGG'nin mağaza sayfası](https://play.google.com/store/apps/details?id=com.igg.castleclash) | Üs geliştirme, kahraman yetenekleri, ekipman, arena, lonca savaşları ve ortak mücadeleler. | Kahraman + bina + ekipman döngüsü var. Yerleşim ve surlar henüz savaş sonucunu etkilemiyor. Kalede savunma senaryosu, yeni menü eklemekten daha anlamlı bir sonraki adım. |
| [Wartune — özgün oyunun resmî tanıtımı, 2012](https://www.gamehollywood.com/company/en/thread-114_en.html) | Sıra tabanlı RPG, yetenek geliştirme, kale kurma, PvP ve boss mücadeleleri. Bu eski tanıtım güncel Wartune Ultra'nın ayrıntılı sistem doğrulaması sayılmamalı. | Hedef seçimi, kahramana özgü otomatik yetenekler, savunma, yıldız çağrısı ve düşman hamlesi tahmini var. Sonraki derinlik: ayrı bekleme süreleri olan, oyuncunun seçtiği kahraman yetenekleri. |
| [Whiteout Survival — Century Games](https://www.centurygames.com/games/a/) | Kaynak toplama, farklı yetenekli kahramanlar, ittifaklar, teknoloji ve rekabet. [Temmuz 2026 güncellemesi](https://www.centurygames.com/whiteout-survival-wos-update/) ittifak saldırı/savunma etkinliği gibi sosyal hedefleri de gösteriyor. | Yerel üretim ve sefer ilerlemesi var; sosyal dünya yok. Ortak hedefler için önce güvenilir hesap ve sunucu ilerlemesi kurulmalı. Tek oyunculu prototipte sahte çevrimiçi rakip veya ittifak sayısı gösterilmemeli. |

## Şimdi oynanabilen döngü

Kaynakları topla → kaleyi, demirhaneyi veya kahramanı geliştir → üç kahramanı silah, zırh ve tılsımla donat → seferde hedef seç ve düşmanın hazırlığını oku → ilk zaferden ekipman kazan → yeni dizilimle sonraki bölgeyi dene.

v0.5'te savaş alanında dokuz kahramanın tam boy görselleri ve üç düşman sınıfı bulunuyor. Vuruşlar sırayla gösteriliyor; hasar, şifa ve düşüşler okunuyor. Akıncılar ön safa vuruyor. Büyücüler iki turda bir alan saldırısı yapıyor. 4, 6 ve 8. bölümlerdeki efendiler üç turda bir yıkım dalgası hazırlıyor; oyuncu savunabiliyor veya yıldız çağrısıyla bu hamleyi durdurabiliyor. Önceden başlamış eski savaşlar, aynı can ve saldırı kurallarıyla devam ediyor.

Cephanelikte üç yuvaya dağılan dokuz eşya var. Demirhane 2 ve 4. seviyelerinde daha güçlü üretimler açılıyor. Bir eşya kopyası tek kahramanda kullanılabiliyor. İlk zafer ekipmanları tekrar savaşarak çoğaltılmıyor; eski kayıtlardaki tamamlanmış bölümlerin yeni ekipman ödülleri yüklemede tamamlanıyor.

## Mağazanın sınırı

Kullanıcının seçimiyle bu sürüm yalnızca mağaza prototipi. Aurelion ve Nyxara özel kahraman adayları; özgün portreleri, tam boy savaş çizimleri, farklı yetenekleri ve ücretsiz eğitim savaşları var. Gerçek satın alma, fiyat, ödeme ekranı veya kalıcı ücretli sahiplik yok. Denemeler gerçek kayıttan ayrı bir kopyada çalışıyor. Ekipmanlar seferlerden veya oyun içi kaynaklarla elde edilebiliyor.

Özel kahramanların sayısal güçleri prototip değerleri. PvP veya ücretli yayın dengesi olarak kabul edilmiyor. Başlangıçtaki ücretsiz üç kahraman, seviye 5 ve başlangıç ekipmanlarıyla yapılan kurallar simülasyonunda sekiz bölümü de geçti; bu, ekonomi temposu veya gerçek oyuncu deneyimi testi değildir.

## Sonraki geliştirmeler

1. **İlk on dakikayı anlaşılır yap:** İlk silahı takma, ilk hedefi seçme, ilk yıkımı engelleme ve ilk bina geliştirme için kısa görev zinciri. Kabul ölçütü: yeni oyuncu bu dört eylemi dışarıdan açıklama olmadan tamamlar.
2. **Kahraman kararlarını derinleştir:** Şifa, koruma ve saldırı için kahramana özel elle kullanılan yetenekler. Her yeni yetenek için okunur bedel/bekleme süresi ve karşı hamle gerekir.
3. **Kaleyi savaşa bağla:** Sur ve bina seviyelerinin etkili olduğu sınırlı bir hisar savunması. Önce bir özgün, tekrar oynanabilir karşılaşma; ardından daha fazla harita.
4. **Gerçek oyuncularla denge testi:** Sefer başına süre, yenilgi nedeni, kaynak darboğazı ve ekipman seçimi gözlemlenmeli. Resmî rakip sayfalarından oyuncu tutma veya gelir oranı çıkarılamaz.
5. **Çevrimiçi faz:** Hesap, sunucu tarafında ödül doğrulama ve kayıt eşitleme tamamlandıktan sonra ittifak hedefleri. Mağaza ödeme entegrasyonu ayrı bir kapsamdır.

## Doğrulama

41 kurallar, ekipman, karşılaşma ve bina testi geçti. Hedef seçimi, savunmanın etkisi, büyücü alan saldırısı, yıldız ile yıkım engelleme, eski savaş/kayıt uyumluluğu, ganimetin tek sefer verilmesi ve eğitim izolasyonu kontrol edildi. JavaScript sözdizimi, görsellerin alfa kanalı ve yerel HTTP dosya sunumu kontrol edildi.

Canlı mobil/masaüstü yerleşim ve animasyonların tarayıcı kontrolü tamamlanamadı: Work ayarında yerel tarayıcı erişimi kapalı. Bu sınırlama kurallar testlerinin geçtiği bilgisinden ayrı tutulmalıdır.
