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
- **Draw call:** mergeStatic artık tüm opak Lambert parçaları vertex-color ile tek bir malzemede birleştiriyor. Medium'da 381 olan draw call 236'ya indi (gölge geçişi dahil), bu da 2.3 kat daha fazla detayla geldi.
- logic.js'e dokunulmadı.

## Referans çalışması (v6, yalnızca stil; asset, isim veya yerleşim kopyalanmadı)
- **Whiteout Survival:** stilize low-poly ve izometrik kamera, sabit yerleşimli bir şehir. Binalar seviye atladıkça büyür ve şekil değiştirir. Hayatı küçük insanlar ve duman taşır. → Bizde: tier silüetleri, yürüyen işçi ve arabalar, baca dumanı.
- **Castle Clash:** üstten, chibi, parlak ve temiz renkler. Sur ve kapılar okunaklı. Erken binalar sade, yükseldikçe "görkemli". → Bizde: kazık sur ve kapılar; tier 2'de taş, altın ve arduvaz.
- **Legend Online:** sıcak, boyalı fantastik şehir paleti, bayrak ve süs yoğunluğu. → Bizde: sıcak palet, flamalar, meşaleler.
- **v6'da uygulanan iki etkili iyileştirme:**
  - zemin çeşitliliği: parsel köşelerinde ot öbekleri ve çiçekler (instanced)
  - binalarda hafif "nefes" idle animasyonu
- **Diğer v6 değişiklikleri:**
  - Mercan: mercan kümeleri, yosun, kazıklı kulübeler
  - Kül/volkan: katmanlı koni, lav akıntıları, krater ışığı, bazalt sütunlar, lav gölcükleri
  - global instanced duman ve flamalar: Medium'da yaklaşık 205 → 170 draw call
- **Not:** savaş ve harita ekranları DOM/2D; bu turda 3D stile dahil edilmedi.
