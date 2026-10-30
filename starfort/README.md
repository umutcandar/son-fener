# Starfort

Yıldız yağmuru kıyametinden sonra, Yıldız Çekirdeği'nin koruduğu son kaleyi büyütmeye ve kahramanlarla dış dünyayı geri almaya odaklanan karanlık fantastik strateji/RPG prototipi.

Durum: Yerel oynanabilir prototip v0.5. Tam boy karakterli savaş sahnesi, hedef seçimi, düşman hamlesi tahmini, ekipman/ganimet döngüsü ve özel kahraman denemeleri var. Çevrimiçi hesap, gerçek ödeme, PvP ve ittifak özellikleri henüz yok.

## Yerelde açma

Depo kökünde çalıştır:

```sh
python3 -m http.server 8767 --bind 127.0.0.1
```

Ardından [Starfort'u aç](http://127.0.0.1:8767/starfort/). `/starfort/` adresi ayrı prototiptir; kök adres Son Fener'i açar.

## İlk prototip kapsamı

- 7 bina: kale (`keep`), çiftlik (`farm`), kereste (`lumber`), taş ocağı (`quarry`), demirhane (`forge`), han (`tavern`), gözlemevi (`observatory`).
- 7 kahraman: Aldren, Lyra, Rovan, Mira, Doran, Vesper, Eira; üç kişilik savaş dizilimi. Mira ikinci, Vesper üçüncü, Doran dördüncü, Eira altıncı aşama zaferiyle açılır. Eski kayıt yüklenirken tamamlanmış bölgelere ait yeni kahramanlar eklenir.
- 8 PvE aşaması; hedef seçimi, sıra tabanlı `strike`, `guard`, `star` hamleleri, üç düşman sınıfı ve önceden belli olan alan saldırıları.
- 9 ekipman: silah, zırh ve tılsım yuvaları; üretim, kuşanma, çıkarma ve tek seferlik ilk zafer ganimetleri.
- Mağaza prototipinde 2 özel kahraman: Aurelion ve Nyxara. Ücretsiz eğitimler gerçek kayıttan ayrı; satış ve ücretli sahiplik açık değil.
- Altın, kereste, taş ve yıldız özü üretimi; bina/kahraman geliştirme, savaş ödülleri ve yerel kayıt. Çevrimdışı üretim dört saatle sınırlıdır.
- Ayrı giriş: `starfort/index.html`; mevcut `../lib/three.module.js` motor dosyasını yeniden kullanır.

Kayıt sözleşmesi `localStorage['starfort:v1']` anahtarıdır. Son Fener'in `sonfener1` kaydına, hesabına veya Supabase sistemine bağlanmaz. Kullanıcı hesabı, çevrimiçi savaş ve ittifaklar sonraki fazlardadır.

## Bina geliştirme

3B binanın üzerine veya alttaki bina düğmesine dokun. Açılan pencerede kaynak maliyeti, sonraki seviye etkisi ve eklenecek mimari bölüm görünür. **Geliştir** düğmesi kaynakları harcar, pencereyi kapatır ve yeni binayı gösterir. Yetersiz kaynak, kale seviyesi sınırı veya devam eden savaş varsa nedeni pencerede açıklanır.

Yedi binanın her birinde 1–8 seviyeleri için biriken mimari eklemeler bulunur: toplam 49 ayrı geliştirme. `building-evolution.js` hem eklemelerin adlarını hem 3B yapılarını içerir. Kaydedilmiş bina seviyeleri aynı kalır ve yüklemede yeni görünümleri oluşturur.

## Savaş

Bir düşmana dokunarak tek hedefli yeteneklerin odağını seç. Kahramanlar kendi yetenekleriyle sırayla hareket eder. **Savun** takımın o tur aldığı hasarı yarıya indirir ve daha fazla yıldız yükü verir. **Yıldız çağrısı** alan hasarı ve şifa sağlar; aynı turdaki boss yıkımını da engeller.

Akıncılar ön safa vurur. Gölge büyücüleri iki turda bir bütün takıma saldırır. 4, 6 ve 8. bölümlerin efendileri üç turda bir yıkım dalgası hazırlar. Yaklaşan hamleler düşmanın üzerinde ve komuta alanında görünür. `1× / 2×` düğmesi gösterim hızını değiştirir. Azaltılmış hareket tercihi açıkken ara animasyonlar atlanır.

Tur sonucu animasyondan önce bir kez kaydedilir. Savaş ekranını kapatmak veya sayfayı yenilemek ödülleri çoğaltmaz. Önceki sürümden devam eden savaşlar `combatVersion: 1` olarak eski düşman canı ve davranışlarıyla sürer; yeni savaşlar sürüm 2 karşılaşmalarını kullanır.

## Cephanelik ve mağaza

Başlangıçta bir Yemin Kılıcı ve Muhafız Zırhı bulunur. **Cephanelik** ekranında kahramanı seçip **Kuşan** düğmesine bas. Silah saldırı, zırh can/hasar azaltma, tılsımlar can/şifa veya saldırı katkısı sağlar. Şifa bonusu iyileştiren kahramanlarda etkilidir. Eşyalar kaynaklarla üretilir; demirhane 2 ve 4 yeni kalite seviyelerini açar. Savaş sürerken üretim ve ekipman değişimi kilitlenir.

**Mağaza** ekranındaki Aurelion ve Nyxara yalnızca eğitimde denenebilir. Denemede oyuncunun takımına göre seviye uyarlanır; ödüller, eşyalar ve kahraman sahipliği gerçek kayda geçmez. Kullanıcı bu aşamada yalnızca mağaza prototipini seçti; ödeme entegrasyonu yapılmadı.

## Görseller ve içerik

- `assets/*.webp`: 9 portre, 1 savaş ortamı ve 4 saydam savaş karakteri atlası. PNG dosyaları kaynak kopyalarıdır.
- `assets/prompts.json`: yerleşik image_gen ile üretimde kullanılan istemler ve dosya eşlemesi.
- `assets/battle-prompts.json`: dokuz kahramanın ve üç düşman sınıfının tam boy savaş çizimleri için istemler.
- `art.css`: gece mavisi, eskitilmiş pirinç ve ay ışığı renkleriyle arayüz; mobil dizilim/kart düzeni.
- `content.js`: kahraman geçmişleri, sekiz bölgenin hikâyeleri, taktikleri ve zafer günlükleri.
- `encounters.js`, `battle-view.js`, `battle.css`: karşılaşma davranışları, savaş görünümü ve hareketleri. `equipment.js`: envanter, üretim ve ekipman kuralları.
- Kahraman ekranında üç konumdan birini seçip bir kahraman yerleştir. Takımdaki kahraman seçilirse konumlar takas edilir.
- Tüm hisarın biriken üretimi bina panelinden toplanır. Üretici yükseltilirken eski seviyede biriken üretim önce hesaba eklenir.

## Doğrulama

`node --test starfort/rules.test.mjs starfort/equipment.test.mjs starfort/encounters.test.mjs starfort/building-evolution.test.mjs`: 41 test geçti. Yedi binanın 49 seviye geçişi, ekipman/üretim, hedef seçimi, alan saldırıları, boss yıkımının engellenmesi, eski kayıtlar ve eğitim izolasyonu kontrol edildi. JavaScript sözdizimi, saydam görseller ve yerel HTTP sunumu doğrulandı. v0.5'in canlı mobil/masaüstü yerleşim ve animasyon kontrolü, Work ayarlarında yerel tarayıcı kullanımı kapalı olduğundan tamamlanamadı.

Ürün yönü: [STARFORT_YON.md](../docs/STARFORT_YON.md). Kaynaklı rakip karşılaştırması ve güncel öncelikler: [STARFORT_RAKIP_INCELEMESI.md](../docs/STARFORT_RAKIP_INCELEMESI.md). “Starfort” çalışma adıdır; marka/alan adı uygunluğu araştırılmadı.
