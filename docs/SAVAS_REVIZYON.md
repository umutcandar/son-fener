# Savaş Revizyonu (War Overhaul)

Amaç: oturum savaş merkezli olsun; para harcama baskısı dürüst ve savaşa bağlı olsun. Ödemeler DEMO, harcama limiti yok, oranlar açık.

## Faz 1 — Ordu derinliği
- 3 birlik türü, döngüsel karşı üstünlük: **Abordajcı > Zıpkıncı > Topçu > Abordajcı** (karşı türe +25% hasar, −15% alınan).
- Kademeler T1–T5 (Harp Akademisi teknolojisiyle açılır), her kademe ~1.6× güç.
- **Revir** (hastane): kayıpların %60'ı yaralı olur; kapasite binaya bağlı; iyileştirme = süre + kaynak (elmasla anında).
- Kaptan uzmanlığı: her kaptan bir birlik türüne +% verir.
- Savaş öncesi **Diziliş** ekranı: 3 kaptan + birlik karışımı, karşı üstünlük göstergesi, kazanma tahmini (aynı deterministik motordan).
- Sunucu: `sf_army`/güç hesabı türleri ve kademeleri içerir; sonuç tohumlu ve deterministik, sunucuda doğrulanır.
- Çekirdek döngü: deniz haritasında sürekli hedefler (sis yaratıkları, korsan kampları; yenilenir, ganimet verir). Birleştirme/inşa angaryası savaş döngüsünü yavaşlatıyorsa azaltılır.
- Sanat akışı için: savaş olay günlüğü (`battle.log`: tur, saldıran, hedef, hasar, `skill` olayları) ve dinleyici kancası `__g.onBattleEvent(fn)`; elle beceri dokunuşu bu kancaya bağlanır.

## Faz 2 — Deniz haritasında PvP
Keşif/saldırı, sefer süresi, ganimet tavanı, garnizon + kule/sur, Barış Kalkanı (kazanılır veya elmas), intikam, klan toplanması (rally), kayıplı savaş raporları.

## Faz 3 — Dürüst para baskısı
Savaşa bağlı elmas harcamaları (anında iyileştirme, hızlandırma, kalkan, VIP ile ek sefer kuyruğu), VIP seviyeleri, ilk alım bonusu, gerçek değeri gösterilen sınırlı paketler (sahte fiyat/sayaç yok). Elmas geliri düşürülür; F2P yine mümkün.
