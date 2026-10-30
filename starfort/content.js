// World writing and encounter guidance, kept separate from the economy and save schema.
export const CAMPAIGN = [
  { id: 1, name: 'Kül Yolu', land: 'Kuzey sınırı', brief: 'Kül geçidinden yıldızsız tahta, sonra kuzey mührüne.' },
  { id: 2, name: 'Kırık Taç', land: 'Batı harabeleri', brief: 'Çökmüş bir krallığın safları hâlâ bir taht bekliyor.' },
  { id: 3, name: 'Yıldız Kuyusu', land: 'Güney uçurumu', brief: 'Kuyunun dibinde sönmeyi reddeden bir irade var.' },
];
export function storyFor(stage) {
  const written = CHAPTERS[stage.id - 1];
  if (written) return written;
  return {
    name: stage.name,
    brief: stage.description,
    tactic: stage.rank === 'boss' ? 'Hükümdar yıkım hazırlar. Yıldız çağrısı ya da kalkanla takımı koru.' : stage.rank === 'elite' ? 'Seçkin çift kılıç hazırlar. Yıldız çağrısı yarmayı bozar.' : 'Kahramanlar kendileri saldırır. Hazır yeteneği kritik anda kullan.',
    victory: stage.victory || `${stage.name} sessizleşti. Yol bir basamak daha açıldı.`,
  };
}
export const ROLES = { tank: 'Muhafız', mage: 'Büyücü', ranger: 'İzci', healer: 'Şifacı', fighter: 'Savaşçı', assassin: 'Suikastçı' };
export const HERO_LORE = {
  aldren: 'Kül Gecesi’nde kuzey kapısını son ana kadar tutan muhafız. Kırılan kalkanındaki yıldız, terk etmediği yeminin izi.',
  lyra: 'Rasathanenin son çırağı. Düşen yıldızın bir felaket değil, uzaklardan gönderilmiş bir çağrı olduğuna inanıyor.',
  rovan: 'Karaorman’ın yollarını haritalardan sildiler. Rovan o yolları hâlâ biliyor; ormanda kaybettiği kardeşini arıyor.',
  mira: 'Kırık Şapel’in çanları sustuğundan beri yaralıları ay ışığıyla iyileştiriyor. Kurtarılmayı beklerken bile nöbetini bırakmadı.',
  doran: 'Demir Kapı’dan sürüldü, ama kapı düşünce geri döndü. Eskiden krala verdiği yemini şimdi hayatta kalanlara veriyor.',
  vesper: 'Karaorman’daki kaçakları yıllarca gölgelerin arasından geçirdi. Son kafileyi kurtardığında, eve dönmek yerine hisarın yeminini seçti.',
  eira: 'Ayaz Surları’nda buzun içinden gelen sesi dinledi. Bu ses bir kralın emri değil, sönmek üzere olan yıldızın yardım çağrısıydı.',
};
export const CHAPTERS = [
  { name: 'Külün Ardındaki Yemin', brief: 'Geçitteki fenerler birer birer söndü. Akıncılar sabaha kalmadan hisarın erzak yolunu kesecek. Aldren’in kalkanını öne sür; Lyra’nın kıvılcımları saflarını dağıtsın.', tactic: 'Kahramanlar kendileri saldırır. Enerji dolunca Aldren’in kalkanını veya Lyra’nın alan büyüsünü kullan.', victory: 'Erzak arabaları geçidi aştı. Sönmüş fenerlerden birinde şapele ait gümüş bir mühür buldun.' },
  { name: 'Sessiz Çanlar', brief: 'Mira, şapelin mahzeninde yaralıları koruyor. Gölge müritleri kapıyı sardı; yardım ulaşana kadar ay ışığı tükenebilir.', tactic: 'Gölge yağmuru hazırlanırken Lyra’nın yeteneğini kullanarak büyüyü kesebilir veya Aldren’in kalkanını açabilirsin.', victory: 'Şapelin kapıları açıldı. Mira son yaralıyı da hisara taşıdı ve yeminlilere katıldı.' },
  { name: 'Ormanın Hatırladığı', brief: 'Ağaçların kabuğunda yeni işaretler var. Rovan bunları tanıyor: diken avcıları ormanı değil, yıldız parçalarını koruyor.', tactic: 'Büyücülerin hazırlık çubuklarını izle. Rovan ile birini işaretle; Lyra’nın fırtınasını kritik ana sakla.', victory: 'Köklerin arasındaki yıldız parçası kurtarıldı. Vesper son kafileyi hisara getirdi ve yeminlilere katıldı. Demir Kapı’ya giden eski yol yeniden görünüyor.' },
  { name: 'Son Nöbet', brief: 'Demir Kapı çöktü, ama örsün sesi hâlâ kesilmedi. Doran geride kalanları korumak için lejyonerlerin karşısına tek başına çıktı.', tactic: 'Demir Cellat yıkım hazırlarken bir kesme yeteneği kullan. Aldren’in kalkanı da takımını ağır darbeden korur.', victory: 'Doran baltasını indirdi. Bu kez döneceği bir hisar ve uğruna savaşacağı insanlar var.' },
  { name: 'Taşın Altındaki Ses', brief: 'Mahzen kapısının ardında bir ordu uyumuyor; bir emri bekliyor. Çekirdeğin nabzı güçlendikçe mühürler çatlıyor.', tactic: 'Yeteneklerin enerjisini yönet. Takım yaralanınca Mira’nın Ayın Lütfu ile canını yenile.', victory: 'Mühür yeniden kapandı. Duvarlarda kuzey surlarına uzanan bir yıldız haritası belirdi.' },
  { name: 'Buzdaki İzler', brief: 'Ayaz, surların üzerindeki sancakları taşa çevirdi. Donmuş nöbetçiler bin yıldır gelmeyen bir kral için kapıyı tutuyor.', tactic: 'Ayaz Komutanı’nın yıkımına dikkat et. Zırh kuşan; Doran’ın darbesini hazırlığı kesmek için sakla.', victory: 'Kuzey kapısı açıldı. Eira buzda saklı gözetleme aynasını uyandırdı ve yeminlilere katıldı. Ayna tutulma kulesini gösteriyor.' },
  { name: 'Işığın Gölgesi', brief: 'Kule, çekirdeğin ışığını emiyor. Muhafızlarının zırhında hisarın yıldızı var; bir zamanlar aynı yemini etmişlerdi.', tactic: 'Eira’nın Buz Halesi kalabalığı dondurur. Mira’nın şifasını takımın canı azaldığında kullan.', victory: 'Ayna parçalandı. Tutulmanın ardında yıldızsız bir tahtın silueti ortaya çıktı.' },
  { name: 'Yıldızsız Taht', brief: 'Tahtın sahibi bir krallık istemiyor. Son yıldızın da sönmesini bekliyor. Hisarın ışığını buraya kadar taşıyan yeminliler son geçide geldi.', tactic: 'Hükümdar yıkımı hazırlarken kesme yeteneği kullan. Taktik molada hedefini ve hazır yeteneklerini değerlendirebilirsin.', victory: 'Taht sessiz. Ufukta ilk kez sabahın rengi var. Kuzey sınırının öyküsü tamamlandı; hisarınki sürüyor.' },
];
