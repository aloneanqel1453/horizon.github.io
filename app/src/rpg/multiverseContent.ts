// Horizon 26.3 Multiverse Content Engine:
//  1) MOD_CATALOG_300: 300 Installed Mods across 10 Categories with real live gameplay modifiers
//  2) QUEST_CATALOG_1000: 1,000 Progressive Quests across 10 Chapters with O(1) live stat tracking & auto-rewards

export type ModCategoryId =
  | 'all'
  | 'fizik'
  | 'anime'
  | 'boss'
  | 'silah'
  | 'dunya'
  | 'buyu'
  | 'grafik'
  | 'harita'
  | 'yasam'
  | 'efsane';

export interface ModCategoryMeta {
  id: ModCategoryId;
  label: string;
}

export const MOD_CATEGORIES: ModCategoryMeta[] = [
  { id: 'all', label: 'Tümü (300)' },
  { id: 'fizik', label: 'Fizik & Yüzme (30)' },
  { id: 'anime', label: 'Anime Evrenleri (30)' },
  { id: 'boss', label: 'Ejderha & Boss (30)' },
  { id: 'silah', label: 'Silah & Eser (30)' },
  { id: 'dunya', label: 'Dünya & Köyler (30)' },
  { id: 'buyu', label: 'Büyü & Sınıf (30)' },
  { id: 'grafik', label: 'Grafik & Kamera (30)' },
  { id: 'harita', label: 'Harita & Cihaz (30)' },
  { id: 'yasam', label: 'Hayatta Kalma (30)' },
  { id: 'efsane', label: 'Efsane Paketler (30)' }
];

export type ModEffectKind =
  | 'buoyancy'
  | 'chakra_water_walk'
  | 'auto_sprint'
  | 'speed_boost'
  | 'jump_boost'
  | 'attack_boost'
  | 'crit_boost'
  | 'lifesteal'
  | 'armor_boost'
  | 'magnet_loot'
  | 'xp_boost'
  | 'dragon_rate'
  | 'night_vision'
  | 'magicule_regen'
  | 'mining_haste'
  | 'swim_speed';

export interface ModCatalogEntry {
  index: number; // 1..300
  id: string;
  name: string;
  version: string;
  category: Exclude<ModCategoryId, 'all'>;
  universeTag: string;
  desc: string;
  effectKind: ModEffectKind;
  effectValue: number;
  defaultEnabled: boolean;
}

export interface ActiveModEffects {
  enabledCount: number;
  chakraWaterWalk: boolean;
  autoSprintMod: boolean;
  speedMult: number;
  swimSpeedMult: number;
  jumpBonus: number;
  attackMult: number;
  critBonus: number;
  lifestealRatio: number;
  armorBonus: number;
  magnetRadius: number;
  xpMult: number;
  dragonSpawnBoost: number;
  nightVisionBonus: number;
  magiculeRegenMult: number;
  miningSpeedMult: number;
}

type RawModSeed = [string, string, ModEffectKind, number, string, boolean?];

const FIZIK_SEEDS: RawModSeed[] = [
  ['Archimedes Gerçekçi Yüzme Fizikleri', 'Fizik', 'buoyancy', 1, 'Suya girince batmayı önler; yüzeyde gerçekçi yüzdürür, Shift ile daldırır.'],
  ['Serbest Stil Kulaç & Su Sıçrama', 'Fizik', 'swim_speed', 0.08, 'Su yüzeyinde ve su altında akıcı 3B kulaç animasyonu ve hız kazandırır.'],
  ['Naruto Çakra Su Üstünde Yürüme', 'Naruto', 'chakra_water_walk', 1, 'Açıldığında çakra kontrolüyle su yüzeyinde batmadan koşmanızı sağlar (İsteğe Bağlı).', false],
  ['Otomatik Koşu (Auto-Sprint Pro)', 'Fizik', 'auto_sprint', 1, 'Ctrl tuşuna basmaya gerek kalmadan ileri yürürken akıcı sprint sağlar.'],
  ['Anti-Stuck Güvenli Işınlanma Zırhı', 'Fizik', 'speed_boost', 0.01, 'Bölge ışınlanmalarında blok/obje içinde sıkışmayı 3B AABB taramasıyla engeller.'],
  ['Kıyı & İskele Çevik Çıkış', 'Fizik', 'jump_boost', 0.02, 'Sudan kıyıya ve iskelelere tek zıplamayla takılmadan çıkmanızı sağlar.'],
  ['Gelişmiş Hava Kontrolü & Strafe', 'Fizik', 'speed_boost', 0.01, 'Zıplarken ve uçarken havada hassas yön değiştirme ivmesi verir.'],
  ['Tüy Düşüşü Darbe Emici', 'Fizik', 'armor_boost', 1, 'Yüksek yamaçlardan inişlerde eklem sarsıntısını ve düşme hasarını azaltır.'],
  ['Elastik Balçık & Yatak Sekmesi', 'Fizik', 'jump_boost', 0.02, 'Slime bloğu ve yatak üzerinde gerçekçi momentum korumalı zıplama.'],
  ['Kanca & Rüzgar Yükü İvmesi', 'Fizik', 'speed_boost', 0.015, 'Grappling Hook ve Wind Charge fırlatmalarında akıcı sarkaç fiziği.'],
  ['Eğilme Kenar Koruması (Safe Sneak)', 'Fizik', 'armor_boost', 0.5, 'Shift ile eğilirken uçurum kenarlarından düşmeyi kusursuz engeller.'],
  ['Kalkan Bloklama Denge Motoru', 'Fizik', 'armor_boost', 1, 'Sağ tık kalkan savunmasında geri tepmeyi azaltır ve yürüyüş hızını dengeler.'],
  ['Merdiven & Sarmaşık Hızlı Tırmanış', 'Fizik', 'speed_boost', 0.01, 'Merdiven ve sarmaşıklarda takılmadan dikey tırmanma hızı verir.'],
  ['Buz Pateni & Kayganlık Dengesi', 'Fizik', 'speed_boost', 0.01, 'Mavi buz ve paketlenmiş buz üzerinde kontrollü kayma fiziği.'],
  ['Derin Su Basınç & Oksijen Dengesi', 'Fizik', 'swim_speed', 0.04, 'Derin lagünlerde nefes tüketimini dengeler ve görüşü berraklaştırır.'],
  ['Binek Süspansiyon & Zıplama Fizikleri', 'Fizik', 'speed_boost', 0.01, 'At, Deve ve Mutlu Ghast sürüşünde sarsıntısız engel aşma.'],
  ['Nautilus Denizaltı İtiş Türbini', 'Fizik', 'swim_speed', 0.05, 'Su binekleriyle okyanus ve lagünlerde ekstra akıntı hızı sağlar.'],
  ['Lav Gezgini Termal Adım', 'Fizik', 'armor_boost', 0.5, 'Nether lav göllerinde Strider üstünde güvenli yüzey tutuşu.'],
  ['Sualtı Akıntı & Dalga Salınımı', 'Fizik', 'swim_speed', 0.03, 'Su yüzeyinde doğal sinüs dalgası salınımı ve yumuşak kamera dengesi.'],
  ['Hızlı Doğrulma & Çarpışma Çözücü', 'Fizik', 'speed_boost', 0.01, 'Dar geçitlerde ve kapılarda omuz takılmasını milisaniyede çözer.'],
  ['Geri Tepme (Knockback) Vektör Fizikleri', 'Fizik', 'attack_boost', 0.02, 'Kılıç ve gürz vuruşlarında düşmanları gerçekçi yay çizerek savurur.'],
  ['Mace Düşüş Şok Dalgası Motoru', 'Fizik', 'attack_boost', 0.02, 'Yüksekten Gürz ile vurulduğunda 3.5m yarıçaplı sismik dalga üretir.'],
  ['Ok & Kunai Balistik Yörünge', 'Fizik', 'crit_boost', 0.01, 'Yay, arbalet ve Shinobi kunailerinde hassas yerçekimi eğrisi.'],
  ['Ender İncisi Güvenli İniş', 'Fizik', 'armor_boost', 0.5, 'Ender incisi düştüğü noktada oyuncuyu duvar dışına güvenle yerleştirir.'],
  ['Riptide Üçlü Mızrak Girdabı', 'Fizik', 'swim_speed', 0.05, 'Yağmurda ve suda üçlü mızrakla ileri fırlama ivmesini güçlendirir.'],
  ['Örümcek Ağı & Çalı Sürtünme Fizikleri', 'Fizik', 'speed_boost', 0.01, 'Tatlı orman meyvesi çalıları ve ağlarda gerçekçi yavaşlama geçişi.'],
  ['Kum & Çakıl Yerçekimi Çöküşü', 'Fizik', 'mining_haste', 0.02, 'Altı kazılan kum, kırmızı kum ve örs bloklarının akıcı düşüş fiziği.'],
  ['Kapı & Tuzak Kapısı Geçiş Fiziği', 'Fizik', 'speed_boost', 0.01, 'Açık kapı ve tuzak kapılarından sıfır takılmayla geçiş sağlar.'],
  ['Çift El (Dual-Wield) Denge Sistemi', 'Fizik', 'attack_boost', 0.015, 'Ana el silah ve ikincil el kalkan/meşale ağırlık dengesini optimize eder.'],
  ['Ultra Akıcı 60+ FPS Fizik Zamanlayıcı', 'Fizik', 'speed_boost', 0.01, 'Alt-kare (sub-step) fizik hesaplamasıyla her cihazda titremesiz hareket.']
];

const ANIME_SEEDS: RawModSeed[] = [
  ['Tensura: Jura Tempest İmparatorluğu', 'Tensura', 'magicule_regen', 0.06, 'Rimuru, Ciel, Veldora, Diablo, Benimaru ve 50 ikonik Tensura karakteri!'],
  ['Naruto Shippuden: Shinobi Dünyası', 'Naruto', 'speed_boost', 0.02, 'Naruto Baryon, Sasuke Rinnegan, Madara, Itachi, Minato, Kakashi ve Rasenshuriken!'],
  ['Bleach: Bin Yıllık Kan Savaşı', 'Bleach', 'attack_boost', 0.03, 'Ichigo Bankai, Aizen, Yamamoto, Kenpachi, Byakuya, Ulquiorra ve Getsuga Tensho!'],
  ['Dragon Ball Super: Ultra Instinct', 'Dragon Ball', 'attack_boost', 0.03, 'Goku UI, Vegeta Ultra Ego, Gohan Beast, Broly, Gogeta, Beerus ve Kamehameha!'],
  ['One Piece: Yeni Dünya & Kral Haki', 'One Piece', 'crit_boost', 0.02, 'Luffy Gear 5, Zoro Ashura, Shanks, Kaido, Beyazsakal, Law ve Bajrang Gun!'],
  ['Konoha Gizli Yaprak Köyü Paketi', 'Naruto', 'xp_boost', 0.03, 'Kızıl Torii kapıları, Hokage dojosu ve Shinobi eğitim sahalarını dünyaya ekler.'],
  ['Soul Society & Seireitei Sarayı', 'Bleach', 'magicule_regen', 0.04, 'Ak-obsidyen Shinigami avluları, Senkaimon geçitleri ve Hollow arenaları.'],
  ['Las Noches & Hueco Mundo Kalesi', 'Bleach', 'lifesteal', 0.01, 'Espada sarayları, beyaz kum sütunları ve Hollow Menos ruh avcıları.'],
  ['Tenkaichi Budokai Turnuva Arenaları', 'Dragon Ball', 'attack_boost', 0.02, 'Kuvars dövüş ringleri, Kami gözetleme kulesi ve Ki patlama efektleri.'],
  ['Grand Line Korsan Limanları & Gemiler', 'One Piece', 'swim_speed', 0.04, 'Yelkenli 3B korsan gemileri, Thousand Sunny rıhtımı ve hazine sandıkları.'],
  ['Akatsuki Kızıl Bulut Baskınları', 'Naruto', 'crit_boost', 0.015, 'Açık dünyada gezen S-Seviye Kaçak Shinobi elitleri ve kunai düelloları.'],
  ['Oni & Kijin Savaş Beyleri Paketi', 'Tensura', 'armor_boost', 0.5, 'Zırhlı çift boynuzlu Oni Savaş Beyleri ve dev Odachi kılıç ustaları.'],
  ['Gotei 13 Zanpakuto Ruh Kılıçları', 'Bleach', 'attack_boost', 0.025, 'Zangetsu ve Cehennem Katanası için gerçek 3B kabza, tsuba ve çelik namlu.'],
  ['Kral Haki (Haoshoku) Şok Dalgası', 'One Piece', 'crit_boost', 0.015, 'Kızıl-siyah yıldırım halkalarıyla çevredeki tüm düşmanları sarsan Haki gücü.'],
  ['Altı Yolun Bilgesi (Six Paths) Çakrası', 'Naruto', 'magicule_regen', 0.05, 'Çakra ve Büyü Özü dolum hızını artırır, Rasenshuriken hasarını güçlendirir.'],
  ['Süper Saiyan & İlahi Ki Aurası', 'Dragon Ball', 'speed_boost', 0.015, 'Ki patlamaları, Genki Dama ruh küresi ve Final Flash altın ışın efektleri.'],
  ['Ope Ope no Mi: ROOM Cerrah Küresi', 'One Piece', 'crit_boost', 0.015, 'Trafalgar Law\'un mavi küresel ROOM alanı ve taktiksel uzay kesişleri.'],
  ['Uchiha Susanoo & Amaterasu Alevi', 'Naruto', 'attack_boost', 0.02, 'Sönmeyen siyah-mor alevler ve dev Susanoo kılıç darbeleri.'],
  ['Espada Cero Oscuras Enerji Işını', 'Bleach', 'magicule_regen', 0.03, 'Hollow maskeli savaşçılar ve karanlık Cero enerji topları.'],
  ['Wano Üç Kılıç Stili (Santoryu)', 'One Piece', 'attack_boost', 0.025, 'Zoro\'nun Enma katanası ve Cehennem Kralı yeşil-kızıl ejderha kesişi.'],
  ['Hiraishin Uçan Yıldırım Sanatı', 'Naruto', 'speed_boost', 0.02, 'Minato\'nun Shinobi Kunaisi ile baktığınız noktaya anında güvenli ışınlanma!'],
  ['Manas: Ciel Kozmik Analiz Çekirdeği', 'Tensura', 'xp_boost', 0.04, 'Baktığınız her canlının can, saldırı ve tür bilgisini anında analiz eder.'],
  ['Kame Evi & Kristal Ada Sahili', 'Dragon Ball', 'swim_speed', 0.03, 'Mercan resifleri ve berrak yüzme lagünlerinde eğitim adaları.'],
  ['Visored Hollow Maskesi Donanımı', 'Bleach', 'lifesteal', 0.01, 'Karakter dönüşümlerinde gerçek 3B kemik Hollow maskesi ve göz parlaması.'],
  ['Hasır Şapka Korsan Mirası', 'One Piece', 'xp_boost', 0.03, 'Luffy ve Shanks formlarında gerçek 3B kırmızı şeritli hasır şapka modeli.'],
  ['Shinobi Alın Bandı Koleksiyonu', 'Naruto', 'speed_boost', 0.015, 'Naruto, Sasuke, Kakashi ve Minato için metal plakalı 3B alın bandı.'],
  ['Melek & Öteki Dünya Altın Halesi', 'Dragon Ball', 'magicule_regen', 0.03, 'İlahi formlarda baş üzerinde süzülen 3B altın hale halkası.'],
  ['Octagram İblis Lordları Konseyi', 'Tensura', 'attack_boost', 0.02, 'Guy Crimson, Milim Nava, Velzard ve Dagruel imza güçlerini güçlendirir.'],
  ['Büyük Labirent Ramiris Katları', 'Tensura', 'magnet_loot', 0.15, 'Başkent altındaki yeraltı zindanı ve boss sandığı ödüllerini zenginleştirir.'],
  ['Çoklu-Evren (Multiverse) Sinerji Çekirdeği', 'Multiverse', 'xp_boost', 0.05, '108 Karakter (Tensura, Naruto, Bleach, Dragon Ball, One Piece, RPG Sınıf & Minecraft) ve 70 Nihai Gücü tek çatı altında birleştirir.']
];

const BOSS_SEEDS: RawModSeed[] = [
  ['Ice & Fire: Element Ejderhaları', 'Ejderha', 'dragon_rate', 0.12, 'Açık dünyada uçan dev 3B Kızıl Alev, Kadim Buz ve Fırtına Ejderhaları!'],
  ['★ Unique Elit Boss Sistemi', 'Boss', 'dragon_rate', 0.08, 'Düşmanların ★ Unique ünvan, dev boyut, parlak aura halkası ve ekstra ganimetle doğması!'],
  ['Kızıl Kıyamet Alev Ejderhası Yuvaları', 'Ejderha', 'attack_boost', 0.02, 'Obsidyen ejderha kalelerinde ateş püskürten Kızıl Ejderha boss savaşları.'],
  ['Boreas Kadim Buz Ejderhası Zirveleri', 'Ejderha', 'armor_boost', 0.5, 'Karlı zirvelerde ve donmuş kalelerde dondurucu nefesli Buz Ejderhaları.'],
  ['Tempestia Gök Yaran Fırtına Ejderhası', 'Ejderha', 'speed_boost', 0.015, 'Rüzgar yükü ve yıldırım fırtınası yağdıran siyah-altın Fırtına Ejderhası.'],
  ['Ender Ejderhası End Boyutu Revizyonu', 'Boss', 'xp_boost', 0.04, '10 Obsidyen sütun kristali, iyileşme mekaniği ve Ejderha Yumurtası ödülü.'],
  ['Warden Antik Derinlik Muhafızı', 'Boss', 'armor_boost', 0.5, 'Sonik patlama ve yüksek yakın dövüş hasarına sahip kadim yeraltı bossu.'],
  ['Üç Başlı Wither Boss Felaketi', 'Boss', 'lifesteal', 0.01, 'Uçarak patlayıcı kafatasları ateşleyen Wither Boss ve Ölümsüzlük Totemi ganimeti.'],
  ['Çan Bloğu (Bell) Boss Çağırma Ritüeli', 'Boss', 'dragon_rate', 0.08, 'Boss kalelerindeki altın çanlara sağ tıklayarak anında koruyucu Ejderha/Unique çağırma!'],
  ['Dinamik Üst Ekran Boss Can Çubuğu', 'Boss', 'crit_boost', 0.01, '54m yakındaki tüm Ejderha, Warden, Wither ve ★ Unique bosslar için canlı HUD barı.'],
  ['Ejderha Pulu & Kalp Hasadı', 'Ejderha', 'xp_boost', 0.03, 'Yenilen ejderhalardan Efsanevi Ejderha Pulu, Elmas ve Çakra Parşömeni düşürür.'],
  ['Kaido Mavi Ejderha İmparator Kalesi', 'One Piece', 'dragon_rate', 0.05, 'Onigashima tarzı boss kalelerinde efsanevi ejderha muhafızları.'],
  ['Kurama & Kuyruklu Canavar Mühür Alanı', 'Naruto', 'magicule_regen', 0.03, 'Tapınak arenalarında yüksek enerjili elit boss karşılaşmaları.'],
  ['Aizen & Espada Hükümdar Tahtı', 'Bleach', 'attack_boost', 0.02, 'Las Noches boss kulelerinde Hollow Menos ve Unique ruh avcıları.'],
  ['Beerus & Broly Yıkım Arenaları', 'Dragon Ball', 'crit_boost', 0.015, 'Kozmik turnuva arenalarında yüksek hasarlı boss düelloları.'],
  ['Ivarage & Veldanava Ejderha Tapınağı', 'Tensura', 'dragon_rate', 0.05, 'Kadim ejderha sunaklarında çok yüksek EP ve ruh ödüllü karşılaşmalar.'],
  ['Gündüz & Gece Aktif Düşman Ekosistemi', 'Boss', 'xp_boost', 0.03, 'Başkent dışında gündüzleri de Shinobi, Oni, Yağmacı ve Ejderhalarla canlı aksiyon!'],
  ['Unique Boss Kızıl-Altın Aura Halkası', 'Boss', 'crit_boost', 0.01, '★ Unique elitlerin ayakları altında dönen parlak 3B tehlike halkası.'],
  ['Ejderha Kanat Çırpış & Süzülüş AI', 'Ejderha', 'dragon_rate', 0.04, 'Uçan ejderhalar için senkronize çift kanat çırpma ve hedef takip yapay zekası.'],
  ['Creaking Bakışta Donan Heykel Avcısı', 'Boss', 'armor_boost', 0.5, 'Yüzüne baktığınızda tamamen taş kesilen, arkanızı döndüğünüzde saldıran 26.3 canavarı.'],
  ['Breeze Rüzgar Muhafızı Sıçraması', 'Boss', 'speed_boost', 0.01, 'Deneme odalarında rüzgar mermileriyle zıplatan çevik hava muhafızı.'],
  ['Shulker Zırhlı Kabuk & Levitasyon', 'Boss', 'armor_boost', 0.5, 'End adalarında kabuğunu kapatıp okları sektiren Shulker muhafızları.'],
  ['Nether Burcu Wither İskelet Lejyonu', 'Boss', 'attack_boost', 0.015, 'Nether kalelerinde taş kılıçlı uzun boylu Wither İskelet devriyeleri.'],
  ['Kükürt Küpü (Sulfur Cube) Bölünmesi', 'Boss', 'xp_boost', 0.02, 'Kesildiğinde daha küçük küplere bölünen doğal zırhlı 26.3 Nether yaratığı.'],
  ['Cadı Simya İksir Düellosu', 'Boss', 'magicule_regen', 0.02, 'Yaralandığında iksir içip iyileşen ve büyü fırlatan bataklık cadıları.'],
  ['Yağmacı Arbalet Devriyeleri', 'Boss', 'crit_boost', 0.01, 'Komşu köylerin dışında gezen arbaletli Yağmacı mangaları ve zümrüt ganimeti.'],
  ['Boss Sandığı Efsanevi Hazine Tablosu', 'Boss', 'magnet_loot', 0.2, 'Ejderha ve Boss kalelerindeki sandıklara Elmas, Netherite ve Efsanevi Silahlar koyar.'],
  ['Ejderha Terbiyecisi İsimlendirme', 'Ejderha', 'magicule_regen', 0.03, 'Yendikten veya yaklaştıktan sonra Ejderhalara bile isim verip dostunuz yapabilme!'],
  ['Avcı Ödül Çarpanı (Bounty System)', 'Boss', 'xp_boost', 0.04, '★ Unique ve Ejderha avlarından kazanılan XP, EP ve Ruh miktarını katlar.'],
  [' Başkent Kutsal Barış Kalkanı (50m)', 'Boss', 'armor_boost', 0.5, 'Rimuru Başkenti merkezindeki ilk 50 metreyi vahşi canavar doğuşundan korur.']
];

const SILAH_SEEDS: RawModSeed[] = [
  ['Zangetsu Dev Ruh Kılıcı 3B', 'Bleach', 'attack_boost', 0.03, 'Sargılı kabzası ve dev siyah-gümüş sırtlı bıçağıyla 14 hasarlık 3B Zanpakuto!'],
  ['Enma Kral Cehennem Katanası 3B', 'One Piece', 'crit_boost', 0.02, 'Mor-altın işlemeli kın ve üç yonca tsubalı 15 hasarlık efsanevi katana!'],
  ['Hiraishin Shinobi Kunaisi 3B', 'Naruto', 'speed_boost', 0.02, 'Halkalı kabza ve elmas uçlu 3B kunai; sağ tıkla nişangaha güvenli ışınlar!'],
  ['Ejderha Biçen Dev Kılıç (Dragon Slayer)', 'RPG', 'attack_boost', 0.035, 'Ağır zırhları ve ejderha pullarını yaran 17 hasarlık devasa siyah-kızıl çelik kılıç!'],
  ['Astral Yıldız Asası 3B', 'RPG', 'magicule_regen', 0.05, 'Dönen altın halkalı ve kristal çekirdekli asa; sağ tıkla yıldız büyüsü ateşler!'],
  ['İlahi Hiçlik Tırpanı (Divine Scythe)', 'RPG', 'lifesteal', 0.02, 'Geniş kavisli mor-turkuaz hilal bıçaklı 16 hasarlık ruh biçen tırpan!'],
  ['Netherite & Elmas Kılıç 3B Kabza', 'Silah', 'attack_boost', 0.02, 'Tüm kılıçlara çok katmanlı 3B siperlik (crossguard), kabza topuzu ve parlayan sırt ekler.'],
  ['Gerçek 3B Balta, Kazma, Kürek & Çapa', 'Silah', 'mining_haste', 0.05, '1B düz görsel yerine kavisli çelik ağızlı ve ahşap saplı tam 3B el aletleri!'],
  ['Mace (26.3 Ağır Gürz) Çivili Başlık', 'Silah', 'attack_boost', 0.02, 'Sekiz köşeli metal çivileriyle yüksekten düşüş hasarını katlayan 3B gürz.'],
  ['Üçlü Mızrak (Trident) Deniz Çatalı', 'Silah', 'swim_speed', 0.03, 'Üç sivri prizmarin çatal uçlu hem yakın dövüş hem fırlatılabilir mızrak.'],
  ['Arbalet (Crossbow) 3B Tetik & Yay', 'Silah', 'crit_boost', 0.015, 'Gerçek 3B ahşap gövdeli, metal üzengili ve gerili kirişli arbalet modeli.'],
  ['Kalkan (Shield) 3B Demir Çerçeve', 'Silah', 'armor_boost', 1, 'İkincil elde (`F`) görünür, sağ tıkla kaldırıldığında okları ve darbeleri %100 bloklar!'],
  ['Elmas & Demir Süvari Mızrakları', 'Silah', 'attack_boost', 0.015, 'Uzun menzilli dürtme ve binek üstünde ekstra hücum hasarı veren mızraklar.'],
  ['Ölümsüzlük Totemi (Totem of Undying)', 'Silah', 'armor_boost', 1, 'Elde veya ikincil eldeyken ölümcül darbede sizi diriltip altın şifa verir.'],
  ['Kanca (Grappling Hook) Çelik Halat', 'Silah', 'speed_boost', 0.015, 'Kulelere, uçan adalara ve dağ zirvelerine hızla çekilmenizi sağlar.'],
  ['Dürbün (Spyglass) Bakır Mercek', 'Silah', 'crit_boost', 0.01, 'Uzak kaleleri, ejderhaları ve köyleri net yakınlaştırmayla gözetler.'],
  ['Çakra & Büyü Özü Parşömeni', 'Anime', 'magicule_regen', 0.05, 'Sağ tıklandığında Büyü Özünü anında dolduran ve yüksek XP/EP veren kadim rulo.'],
  ['Ejderha Pulu Zırh İşçiliği', 'Ejderha', 'armor_boost', 1, 'Ejderha pullarıyla Efsanevi kılıç ve tırpan üretme tariflerini açar.'],
  ['Kılıç Süpürme Darbesi (Sweep Attack)', 'Silah', 'attack_boost', 0.02, 'Tam dolu kılıç vuruşunda çevredeki düşmanlara hilal şok dalgası vurur.'],
  ['Hava Kritiği Altın Yıldız Efekti', 'Silah', 'crit_boost', 0.02, 'Zıplayıp düşerken yapılan vuruşlarda x1.5 kritik hasar ve 3B yıldız kıvılcımları!'],
  ['Netherite Tam Zırh Seti Koruması', 'Silah', 'armor_boost', 1, 'Miğfer, göğüslük, pantolon ve çizmelerde yüksek savunma ve sarsılmazlık.'],
  ['Büyü Masası (Enchanting) Güçlendirme', 'Silah', 'attack_boost', 0.02, 'Zümrüt ve Lapis ile silahlarınıza Keskinlik ve Verimlilik basmanızı sağlar.'],
  ['Örs (Anvil) Onarım & Güçlendirme', 'Silah', 'mining_haste', 0.03, 'Yıpranan kazma ve kılıçları tamir edip dayanıklılığını yeniler.'],
  ['Kuvvet, Hız, Şifa & Yenilenme İksirleri', 'Silah', 'lifesteal', 0.01, 'Savaş ortasında sağ tıkla içilen 4 farklı parlak simya iksiri.'],
  ['Altın Elma Kutsal Kalkanı', 'Silah', 'armor_boost', 0.5, 'Yenildiğinde anında can yenileyen ve altın kalp koruması veren elma.'],
  ['Rüzgar Yükü (Wind Charge) Roket Zıplama', 'Silah', 'jump_boost', 0.02, 'Ayaklarınızın altına atarak yüksek kulelere roket zıplaması yapın!'],
  ['Çakmak Taşı & Çelik Portal Ateşleyici', 'Silah', 'xp_boost', 0.02, 'Obsidyen çerçeveleri yakarak Nether Boyutu kapılarını anında açar.'],
  ['Ender Gözü & Kristal Rezonansı', 'Silah', 'xp_boost', 0.02, 'End geçitlerini ve kadim yapıları bulmanızı kolaylaştırır.'],
  ['Sıfır Boş El Sallanma Düzeltmesi', 'Silah', 'speed_boost', 0.01, 'El boşken veya normal blok tutarken gereksiz sallanmayı kaldırır; net görünüm sunar.'],
  ['Kusursuz Sağ/Sol El Pozisyon Motoru', 'Silah', 'attack_boost', 0.015, '1. şahıs ve 3. şahıs görünümlerde balta, kılıç ve kalkanları doğru açıyla tutar.']
];

const DUNYA_SEEDS: RawModSeed[] = [
  ['200 Bölge Waystone Işınlanma Ağı', 'Dünya', 'xp_boost', 0.04, 'Başkent, komşu köyler, anime diyarları, ejderha yuvaları ve boyutlarda 200 güvenli bölge!'],
  ['Genişletilmiş Kıta Haritası (±3.600m)', 'Dünya', 'speed_boost', 0.015, '8 farklı biyom ve okyanus lagünleriyle uçsuz bucaksız kusursuz prosedürel dünya!'],
  ['44 Yaşayan Komşu Köy & Krallık', 'Dünya', 'magnet_loot', 0.15, 'Dwargon, Blumund, Lubelius, Elbaf, Foosha, Suna ve daha nice mobilyalı komşu köy!'],
  ['Köylü & Tüccar Otomatik Nüfus Sistemi', 'Dünya', 'xp_boost', 0.03, 'Ziyaret ettiğiniz her komşu köyde dost Köylüler, Tüccarlar ve Demir Golemler doğar!'],
  ['Rimuru Başkenti & Kristal Liman Lagünü', 'Tensura', 'swim_speed', 0.04, 'Saat kulesi, kiraz bulvarı, kolezyum ve yüzmeye uygun 4 blok derinliğinde kristal liman!'],
  ['52 Anime Efsanevi Bölge Yapısı', 'Anime', 'xp_boost', 0.04, 'Konoha, Seireitei, Las Noches, Kame Evi, Marineford, Onigashima, Wano ve Hücre Arenası!'],
  ['44 Ejderha Yuvası & Boss Kalesi', 'Ejderha', 'dragon_rate', 0.06, 'Obsidyen sütunlu, ejderha yumurtalı ve çan sunaklı devasa açık hava boss arenaları!'],
  ['28 Biyom Harikası & Yüzme Lagünü', 'Dünya', 'swim_speed', 0.05, 'Turkuaz mercan koyları, sıcak kaplıcalar, zümrüt şelaleler ve kiraz vadileri!'],
  ['8 Nether Kalesi & Kızıl Burç', 'Dünya', 'armor_boost', 0.5, 'Nether boyutunda bazalt köprüler, ruh ateşi fenerleri ve Piglin burçları.'],
  ['8 End Gökyüzü Adası & Purpur Kalesi', 'Dünya', 'jump_boost', 0.02, 'End boşluğunda süzülen Purpur sarayları, dış adalar ve Sonsuzluk Taht Kalesi!'],
  ['O(1) Uzamsal Hash Arazi Yumuşatma', 'Dünya', 'mining_haste', 0.03, '200 bölgenin tamamını sıfır kasma ile doğal arazi yüksekliğine pürüzsüzce kaynaştırır.'],
  ['Mobilyalı Köy Evleri & Çalışma Masaları', 'Dünya', 'xp_boost', 0.02, 'Her köy evinde yatak, çalışma masası, fırın, fener ve ganimet sandığı hazır bulunur!'],
  ['Kızıl Torii Kapıları & Kiraz Dojoları', 'Naruto', 'speed_boost', 0.01, 'Doğu tapınaklarında geleneksel kızıl Torii kemerleri ve fenerli taş yollar.'],
  ['3B Yelkenli Korsan Gemileri & İskeleler', 'One Piece', 'swim_speed', 0.03, 'Liman bölgelerinde derin su üzerinde yüzen ahşap güverteli ve yelkenli gemiler!'],
  ['Antik Çöl Piramitleri & Vahalar', 'Dünya', 'magnet_loot', 0.1, 'Altın Çöl biyomunda kumtaşı tapınaklar, kaktüsler ve gizli hazine odaları.'],
  ['Karlı Zirveler & Ladin Dağ Köyleri', 'Dünya', 'armor_boost', 0.5, 'Yüksek dağlarda karlı ladin ormanları, buz şelaleleri ve dağ keçileri.'],
  ['Kiraz Korusu Pembe Yaprak Vadileri', 'Dünya', 'magicule_regen', 0.03, 'Pembe kiraz ağaçları, Allay perileri, arılar ve huzurlu tapınak bahçeleri.'],
  ['Zümrüt Orman & Derin Mağara Ağı', 'Dünya', 'mining_haste', 0.04, 'Yeraltında kömür, demir, bakır, altın, zümrüt, elmas ve ametist jeotları!'],
  ['Deneme Odaları (Trial Chambers 26.3)', 'Dünya', 'xp_boost', 0.03, 'Bakır ızgaralar, Tuff tuğlaları ve Breeze muhafızlarıyla yeraltı arenaları.'],
  ['Solgun Bahçe (Pale Garden) & Creaking', 'Dünya', 'crit_boost', 0.01, 'Gizemli orman açıklıklarında Creaking heykelleri ve nadir reçine blokları.'],
  ['200 Bölge Özel Sandık Ganimet Sistemi', 'Dünya', 'magnet_loot', 0.15, 'Her bölgedeki sandık, o bölgenin evrenine ve tehlike seviyesine özel hazine verir!'],
  ['Nether & End Çift Yönlü Boyut Kapıları', 'Dünya', 'speed_boost', 0.01, 'Başkentten ve dünyadan Nether ile End boyutlarına anında güvenli geçiş.'],
  ['Yatak Uyku & Gündüz/Gece Döngüsü', 'Dünya', 'magicule_regen', 0.02, 'Gece olduğunda yataklara sağ tıklayarak sabahı getirme ve dirilme noktası kaydı.'],
  ['Ekin Tarlaları & Çiftlik Bahçeleri', 'Dünya', 'xp_boost', 0.02, 'Köylerde sulamalı tarım arazileri, saman balyaları ve ekmek üretimi.'],
  ['Demirci Atölyeleri & Örs Meydanları', 'Dünya', 'mining_haste', 0.03, 'Köy meydanlarında zırh ve silah işleme istasyonları.'],
  ['Deniz Feneri (Beacon) Işık Kuleleri', 'Dünya', 'speed_boost', 0.015, 'Bölge merkezlerini uzaktan görünür kılan parlak prizmarin ve deniz feneri kuleleri.'],
  ['Kalıcı Dünya Değişiklikleri (IndexedDB/LS)', 'Dünya', 'mining_haste', 0.02, 'Kırdığınız ve koyduğunuz tüm blokları tarayıcı hafızasında güvenle saklar.'],
  ['Hızlı Başkent Meydanı Dönüşü', 'Dünya', 'speed_boost', 0.01, 'Tek tuşla dünyanın neresinde olursanız olun güvenli Başkent meydanına dönüş.'],
  ['Dinamik Yağmur & Fırtına Atmosferi', 'Dünya', 'swim_speed', 0.02, 'Zaman zaman başlayan yağmur ve fırtınalarla yaşayan doğa döngüsü.'],
  ['Anında Yüklenen Prosedürel Chunk Motoru', 'Dünya', 'speed_boost', 0.01, 'Arka plan önbelleklemesiyle yeni bölgelere ışınlanınca anında zemin hazırlar.']
];

const BUYU_SEEDS: RawModSeed[] = [
  ['70 Efsanevi Nihai Güç (Ultimate Skills)', 'Multiverse', 'magicule_regen', 0.06, 'Tensura, Naruto, Bleach, Dragon Ball, One Piece, RPG Sınıf & Minecraft\'tan 70 gerçek 3B görsel efektli yetenek!'],
  ['108 Karakter, RPG Sınıfı & Minecraft Dönüşümü', 'Multiverse', 'attack_boost', 0.03, '[B]/[K] menüsünden 108 ikonik anime kahramanına, RPG sınıfına ve orijinal Minecraft karakterlerine tek tık dönüşüm!'],
  ['RPG Sınıfı: Ejderha Şövalyesi', 'RPG', 'armor_boost', 1, 'Ejderha Biçen dev kılıç, ağır zırh ve ateş nefesi direnciyle ön cephe tank sınıfı.'],
  ['RPG Sınıfı: Astral Başbüyücü', 'RPG', 'magicule_regen', 0.06, 'Astral Yıldız Asası, hızlı büyü dolumu ve alan etkili kozmik büyü sınıfı.'],
  ['RPG Sınıfı: Gölge Suikastçı', 'RPG', 'crit_boost', 0.025, 'Çevik hız, gölge adımı ışınlanması ve yüksek sırt/kritik hasar sınıfı.'],
  ['RPG Sınıfı: Kutsal Paladin', 'RPG', 'armor_boost', 1, 'Mutlak bariyer Uriel, takım iyileştirme ve altın kalkan savunma sınıfı.'],
  ['RPG Sınıfı: Hiçlik Orakçısı (Reaper)', 'RPG', 'lifesteal', 0.025, 'İlahi Tırpan ile can çalma, ruh hasadı ve karanlık alan kesisi sınıfı.'],
  ['RPG Sınıfı: Fırtına Keskin Okçusu', 'RPG', 'speed_boost', 0.02, 'Yüksek hareket hızı, delici oklar ve yıldırım çağrısı menzilli sınıfı.'],
  ['Rasenshuriken Hücresel Rüzgar Girdabı', 'Naruto', 'attack_boost', 0.02, 'Dönen 4 bıçaklı dev rüzgar shurikeni ve genişleyen mavi çakra küresi!'],
  ['Chidori & Kirin Gök Yıldırımı', 'Naruto', 'crit_boost', 0.015, 'Yüksek hızlı yıldırım atılışı ve gökyüzünden inen mavi ejderha yıldırımı!'],
  ['Kurama Bijudama (Kuyruklu Canavar Topu)', 'Naruto', 'attack_boost', 0.025, 'Sıkıştırılmış mor-kızıl çakra küresi ve 30m yıkıcı ışın patlaması!'],
  ['Mugetsu & Kuroi Getsuga Tensho', 'Bleach', 'attack_boost', 0.025, 'Gökyüzünü yaran devasa siyah-kızıl ruh enerjisi hilal dalgası!'],
  ['Senbonzakura Kageyoshi (Bin Kiraz Bıçağı)', 'Bleach', 'crit_boost', 0.02, 'Etrafınızda dönen yüzlerce pembe-gümüş kılıç yaprağı fırtınası!'],
  ['Hado #90: Kurohitsugi (Kara Tabut)', 'Bleach', 'attack_boost', 0.02, 'Hedef alanı yerçekimi mızraklarıyla ezen karanlık mor küp hapishanesi!'],
  ['Zanka no Tachi (Güneş Çekirdeği Kılıcı)', 'Bleach', 'attack_boost', 0.025, '15 milyon derece ateş sütunuyla çevredeki tüm düşmanları kül eder!'],
  ['Super Kamehameha Mavi Plazma Işını', 'Dragon Ball', 'magicule_regen', 0.04, 'Odaklanmış saf mavi-beyaz Ki dalgası ile 32m hattaki tüm hedefleri vurur!'],
  ['Genki Dama (Evrensel Ruh Bombası)', 'Dragon Ball', 'attack_boost', 0.03, 'Gökyüzünden süzülüp yeri sarsan devasa gök mavisi yaşam enerjisi küresi!'],
  ['Final Flash Altın Yıldırım Işını', 'Dragon Ball', 'crit_boost', 0.02, 'Vegeta\'nın altın elektrik halkalı yüksek çaplı yıkım ışını!'],
  ['Ultra Instinct Gümüş Refleks Aurası', 'Dragon Ball', 'speed_boost', 0.025, 'Geçici hasar dokunulmazlığı, gümüş aura ve yıldırım hızında karşı darbe!'],
  ['Gear 5: Bajrang Gun (Güneş Tanrısı)', 'One Piece', 'attack_boost', 0.03, 'Gökyüzünden inen devasa Haki kaplı yumruk şok dalgası ve yıldırım halkaları!'],
  ['Cehennem Kralı: Kyutoryu Ashura', 'One Piece', 'crit_boost', 0.025, 'Zoro\'nun 3 başlı 9 kılıçlı yeşil-kızıl çapraz ejderha infaz kesisi!'],
  ['Gura Gura: Deprem Yumruğu & Kral Haki', 'One Piece', 'attack_boost', 0.025, 'Uzayı çatlatan beyaz şok küresi ve kızıl-siyah Kral Haki patlaması!'],
  ['Hiçlik Tanrısı Azathoth (Turn Null)', 'Tensura', 'lifesteal', 0.015, 'Çöken siyah-altın hiçlik tekilliği ile 9.5m içindeki düşmanları siler!'],
  ['Zaman Tanrısı Yog-Sothoth (6sn Time Stop)', 'Tensura', 'speed_boost', 0.015, 'Zamanı 6 saniye tamamen dondurur; tüm düşmanlar ve mermiler havada asılı kalır!'],
  ['Antlaşma Kralı Uriel Mutlak Bariyer', 'Tensura', 'armor_boost', 1, '6sn tam ölümsüzlük kristali açar, sizi ve tüm dostlarınızı %100 iyileştirir!'],
  ['Oburluk Kralı Beelzebuth Özümseme', 'Tensura', 'lifesteal', 0.02, 'Düşmanları ve yerdeki ganimetleri karanlık girdaba çekip Can/Açlık/EP kazandırır!'],
  ['Evrensel İsim Verme & Sadık Ordu', 'Tensura', 'xp_boost', 0.03, 'Herhangi bir yaratığa isim verip %100 sadık, size asla vurmayan muhafıza dönüştürün!'],
  ['İkincil İmza Güç Tuşu [X]', 'Multiverse', 'magicule_regen', 0.04, '[R] ana yeteneğin yanında [X] ile seçili karakterin ikinci imza gücünü anında ateşler!'],
  ['Hızlı Büyü Özü Akışı (75/sn)', 'Multiverse', 'magicule_regen', 0.08, 'Yetenekleri beklemeden art arda kullanabilmeniz için yüksek mana yenilenmesi!'],
  ['Pasif Ultra-Hızlı Can Yenilenmesi', 'Multiverse', 'lifesteal', 0.015, 'Yaralandığınızda Büyü Özü kullanarak kalplerinizi otomatik onarır.']
];

const GRAFIK_SEEDS: RawModSeed[] = [
  ['1. Şahıs & 3. Şahıs Yaylı Kamera [F5]', 'Kamera', 'speed_boost', 0.01, 'Omuz üstü yaylı TPS kamerası, ön yörünge görünümü ve tek tık kamera değiştirme butonu!'],
  ['Ön Kamera (F5) Akıllı Yön Düzeltici', 'Kamera', 'speed_boost', 0.01, 'Ön görünümde W/A/S/D tuşlarını kameraya göre hizalar; takılmadan akıcı yürütür!'],
  ['Temiz İnsan & Balçık Baş Modeli', 'Grafik', 'xp_boost', 0.01, 'Slime ve insan formundaki hatalı düz turuncu levhayı kaldırır; gerçek 3B taç/şapka çizer!'],
  ['Heykelsi 3B Kanat & Boynuz Modelleri', 'Grafik', 'speed_boost', 0.01, 'İblis, Melek, Ejderha ve Peri kanatları ile çırpınma animasyonu!'],
  ['Sıfır-Kasma Büyülü Ateşböceği Sürüleri', 'Grafik', 'magicule_regen', 0.02, 'Tek InstancedMesh çizim çağrısıyla çayırda süzülen altın ve mavi parıltılar.'],
  ['Gerçek 3B Kılıç Süpürme & Krit Kıvılcımı', 'Grafik', 'crit_boost', 0.01, 'Vuruşlarda 3B hilal kesiş izi ve altın sekizyüzlü yıldız kıvılcımları.'],
  ['Su Sıçrama Halkası & Damlacık Efekti', 'Grafik', 'swim_speed', 0.02, 'Suya girerken ve yüzerken genişleyen köpük halkası ve 3B su damlacıkları.'],
  ['Uçan Hasar Rakamları & Krit Göstergesi', 'Grafik', 'crit_boost', 0.01, 'Düşmanlara vurduğunuz hasarı ve kritik darbeleri canlı renklerle ekranda gösterir.'],
  ['Piksel-Keskin 16x16 Doku Atlası', 'Grafik', 'mining_haste', 0.02, 'Nearest-neighbor filtrelemeli, bulanıklaşmayan kristal netliğinde blok dokuları.'],
  ['Köşe Ortam Aydınlatması (Smooth AO)', 'Grafik', 'night_vision', 0.04, 'Blok birleşimlerinde derinlik hissi veren yumuşak köşe gölgelendirmesi.'],
  ['Dinamik Güneş, Ay & Yıldız Kuşağı', 'Grafik', 'night_vision', 0.04, 'Gündüz-gece geçişinde renk değiştiren gökyüzü kubbesi ve parlayan yıldızlar.'],
  ['Sıcak Meşale, Fener & Kamp Ateşi Işığı', 'Grafik', 'night_vision', 0.06, 'Mağaraları ve köy sokaklarını sıcak kehribar ışıkla aydınlatır.'],
  ['Gece Görüşü Berraklık Filtresi', 'Grafik', 'night_vision', 0.08, 'Karanlık mağaralarda ve gece savaşlarında düşmanları net görmenizi sağlar.'],
  ['3B Dönen Eşya Ganimetleri (Item Drops)', 'Grafik', 'magnet_loot', 0.1, 'Yere düşen eşyaların havada süzülüp dönerek parlamasını sağlar.'],
  ['Blok Kırma Aşamalı Çatlak Kaplaması', 'Grafik', 'mining_haste', 0.02, 'Kazılan bloğun üzerinde kırılma yüzdesine göre büyüyen çatlak dokusu.'],
  ['Blok Kırılma 3B Parçacık Patlaması', 'Grafik', 'mining_haste', 0.02, 'Kırılan her bloğun kendi renginde 3B küp parçacıkları saçması.'],
  ['Kalkan Savuşturma Altın Şok Halkası', 'Grafik', 'armor_boost', 0.5, 'Kalkanla darbe engellendiğinde önünde parlayan altın şok dalgası.'],
  ['3. Şahıs Yüzme & Uçuş Karakter Pozu', 'Grafik', 'swim_speed', 0.02, 'Suda yatay serbest stil yüzüş ve gökyüzünde pelerin/kanat süzülüş pozu.'],
  ['Canlı Yaprak & Su Yüzeyi Parıltısı', 'Grafik', 'swim_speed', 0.01, 'Kiraz yaprakları, meşe koruları ve lagün sularında canlı renk doygunluğu.'],
  ['Zaman Durdurma Mavi-Turkuaz Alan Halkası', 'Grafik', 'speed_boost', 0.01, 'Yog-Sothoth aktifken yerde dönen zaman mührü ve mavi donmuş düşman tonu.'],
  ['Uriel Altıgen Altın Kristal Kubbe', 'Grafik', 'armor_boost', 0.5, 'Mutlak bariyer açıldığında oyuncuyu saran şeffaf 3B altın kristal kalkan.'],
  ['Biyom Atmosferik Sis Geçişi', 'Grafik', 'night_vision', 0.03, 'Çöl, karlı zirve, Nether ve End boyutlarına özel ufuk sisi renkleri.'],
  ['Köylü & Boss İsim Etiketi (Billboard)', 'Grafik', 'xp_boost', 0.01, 'Sadık dostlar ve ★ Unique bosslar üzerinde her açıdan okunaklı 3B isim rozeti.'],
  ['Yay & Arbalet Nişan Yakınlaştırma (FOV)', 'Grafik', 'crit_boost', 0.01, 'Yay gererken ve dürbün açarken pürüzsüz kamera yakınlaştırma geçişi.'],
  ['Sprint Dinamik Hız Alanı (FOV Boost)', 'Grafik', 'speed_boost', 0.01, 'Koşarken ve uçarken hız hissini güçlendiren yumuşak görüş açısı genişlemesi.'],
  ['Sualtı Mavi Kırılma Atmosferi', 'Grafik', 'swim_speed', 0.02, 'Başınız suyun altına indiğinde yumuşak okyanus mavisi atmosfer geçişi.'],
  ['Yaratık Hasar Kızıl Parlama Geri Bildirimi', 'Grafik', 'attack_boost', 0.01, 'Vurulan düşmanlarda anlık net kırmızı hasar flaşı ve sarsıntı.'],
  ['Temiz Nişangah & Blok Seçim Çerçevesi', 'Grafik', 'mining_haste', 0.01, 'Baktığınız bloğun etrafında ince ve keskin 3B tel-kafes seçim kutusu.'],
  ['WebGL Bağlam Kurtarma (Context Restore)', 'Grafik', 'xp_boost', 0.01, 'Sekme değişimlerinde GPU dokularını sıfır kayıpla otomatik yeniler.'],
  ['Akıllı Görüş Mesafesi & Çizim Çağrısı', 'Grafik', 'speed_boost', 0.01, 'Yüzlerce yapı ve yaratık varken bile yüksek kare hızı koruyan sahne yönetimi.']
];

const HARITA_SEEDS: RawModSeed[] = [
  ['Genişletilmiş Çok-Cihazlı Sağ Üst Minimap', 'Harita', 'speed_boost', 0.015, 'PC\'de geniş ve net (172px/244px), telefonda ekranı kaplamayan akıllı uyumlu minimap!'],
  ['Minimap Yakınlaştırma (- / +) & Büyütme [H]', 'Harita', 'xp_boost', 0.02, '48m, 96m ve 180m radar menzili + tek tıkla büyütme/küçültme kontrolleri!'],
  ['Minimap Canlı Boss, Ejderha & Köy Radarı', 'Harita', 'dragon_rate', 0.03, 'Haritada Köyleri, Waystone\'ları, Ejderhaları, ★ Unique bossları ve düşmanları canlı gösterir!'],
  ['Minimap Arazi Yükseklik Gölgelendirmesi', 'Harita', 'speed_boost', 0.01, 'Dağları, kıyıları, yolları ve su derinliğini haritada kabartmalı tonlarla çizer.'],
  ['Pencere Modu Tarayıcı Kısayol Kalkanı', 'Kontrol', 'speed_boost', 0.015, 'Tam ekran açmaya gerek kalmadan oyun odaklandığında kısayolların oyunu bölmesini engeller!'],
  ['Tuval Otomatik Odaklama (Canvas Focus Lock)', 'Kontrol', 'speed_boost', 0.01, 'HUD butonlarına tıklasanız bile klavye odağını anında oyun ekranında tutar!'],
  ['Mobil Cep Arayüzü (Pocket UI Yatay & Dikey)', 'Mobil', 'mining_haste', 0.02, 'Telefon yatay ve dikey ekranlarında taşmayan, kaydırılabilir geniş dokunmatik pencereler!'],
  ['Mobil Dokunmatik Joystick & Hızlı Kamera', 'Mobil', 'speed_boost', 0.015, 'Çoklu dokunmatik (multi-touch) yürüyüş çubuğu, zıplama, kırma ve sağ tık butonları.'],
  ['Mobil Minimap Tek Dokunuş Daraltma', 'Mobil', 'speed_boost', 0.01, 'Yatay telefon ekranlarında isteğe bağlı tek dokunuşla minimap küçültme/açma.'],
  ['HUD 1. Şahıs / 3. Şahıs Hızlı Tuşu', 'Kamera', 'speed_boost', 0.01, 'Hem PC hem mobilde F5\'e ek olarak tek tıkla görünüm değiştiren kamera düğmesi!'],
  ['1000 Görev Canlı Takip & Ödül Paneli', 'Arayüz', 'xp_boost', 0.04, 'Bölüm filtreli, arama destekli ve otomatik zümrüt/XP ödüllü 1000 görev sistemi!'],
  ['200 Bölge Anında Arama & Kategori Filtresi', 'Harita', 'speed_boost', 0.01, 'Köy, Anime, Ejderha, Biyom ve Boyut bölgelerini anında filtreleyip tek tıkla ışınlanın!'],
  ['300 Mod Canlı Yönetim & Arama Merkezi', 'Arayüz', 'xp_boost', 0.02, '10 kategori sekmesi ve anlık arama çubuğuyla 300 modu sıfır kasma ile yönetin!'],
  ['Sayfalı Sanal Liste (Zero-Lag DOM)', 'Arayüz', 'speed_boost', 0.01, 'Binlerce kartı sayfalandırarak en düşük donanımlı telefonlarda bile anında açılır.'],
  ['Tek Tık Hızlı Tarif Kitabı (Recipe Book)', 'Arayüz', 'mining_haste', 0.02, 'Çalışma masasında ve envanterde malzemesi yeten eşyaları tek dokunuşla üretir!'],
  ['Hızlı Kuşanma (Shift-Click / Mobil Buton)', 'Arayüz', 'speed_boost', 0.01, 'Zırhları, kalkanı ve araç çubuğu eşyalarını tek tıkla doğru yuvaya yerleştirir.'],
  ['Yarıya Böl & Al/Koy Dokunmatik Desteği', 'Mobil', 'mining_haste', 0.01, 'Sağ tık olmayan dokunmatik cihazlarda eşya yığınlarını kolayca bölme ve taşıma.'],
  ['Bölge Tehlike Yıldızı & Mesafe Göstergesi', 'Harita', 'xp_boost', 0.01, '200 bölgenin her biri için anlık uzaklık (metre) ve zorluk derecesi bilgisi.'],
  ['Koordinat, Biyom & Aktif Güç Şeridi', 'Harita', 'xp_boost', 0.01, 'Sağ üstte anlık X/Y/Z koordinatı, biyom adı ve aktif görev özeti.'],
  [' Çok Oyunculu Oda & Canlı Oyuncu Senkronu', 'Ağ', 'xp_boost', 0.02, 'Aynı odadaki oyuncuların karakter formunu, kalkanını ve bloklarını canlı paylaşır.'],
  ['Komut Satırı & Hızlı Slash Komutları', 'Arayüz', 'xp_boost', 0.01, '/tp, /karakter, /yetenek, /isim, /give, /time ve /gamemode komut desteği.'],
  ['Büyük Bilge / Ciel Canlı Sohbet Kutusu', 'Arayüz', 'magicule_regen', 0.02, 'Oyun içi sorularınızı yanıtlayan ve hedef analizi yapan yapay zeka sekmesi.'],
  ['Tablet & Katlanır Ekran Duyarlı Izgara', 'Mobil', 'speed_boost', 0.01, 'iPad, Android tablet ve geniş monitörlerde otomatik ölçeklenen envanter ızgarası.'],
  ['Güvenli Alan (Safe-Area Notch) Uyumu', 'Mobil', 'speed_boost', 0.01, 'Çentikli telefon ekranlarında butonların kenar altında kalmasını engeller.'],
  ['Anlık Bildirim (Toast) Geri Bildirimi', 'Arayüz', 'xp_boost', 0.01, 'Görev tamamlama, bölge keşfi ve boss ödüllerini şık üst bildirimlerle duyurur.'],
  ['Can, Zırh, Açlık, Hava & XP Çubukları', 'Arayüz', 'armor_boost', 0.5, 'Klasik piksel ikonlu kalp, zırh, baget, oksijen baloncuğu ve seviye göstergesi.'],
  ['Eşya Dayanıklılık & Adet Göstergesi', 'Arayüz', 'mining_haste', 0.01, 'Araç çubuğundaki aletlerin kalan ömrünü renkli alt çubukla net gösterir.'],
  ['Klavye Kısayol Rehberi & İpuçları', 'Arayüz', 'xp_boost', 0.01, 'Yeni başlayanlar için tüm tuşları özetleyen temiz alt kontrol şeridi.'],
  ['Oyun Menüsü Hızlı Kamera & Sprint Ayarı', 'Kontrol', 'speed_boost', 0.01, 'Duraklatma ve Ayarlar menüsünden tek tıkla 1./3. Şahıs ve Oto-Koşu kontrolü.'],
  ['Sıfır Bellek Sızıntısı Sahne Temizleyici', 'Arayüz', 'speed_boost', 0.01, 'Uzaktaki yaratık ve efekt geometrilerini GPU\'dan temizleyerek uzun süreli akıcılık sağlar.']
];

const YASAM_SEEDS: RawModSeed[] = [
  ['Mıknatıs Ganimet Çekimi (Loot Magnet)', 'Yaşam', 'magnet_loot', 0.85, 'Yere düşen madenleri, ejderha pullarını ve XP kürelerini uzaktan çantanıza çeker!'],
  ['Madenci Damar Hızı (Vein Haste)', 'Yaşam', 'mining_haste', 0.08, 'Taş, cevher ve obsidyen bloklarını kazma hızını hissedilir biçimde artırır!'],
  ['Kereste Ustası Hızlı Odunculuk', 'Yaşam', 'mining_haste', 0.06, 'Meşe, ladin ve kiraz kütüklerini baltayla çok daha seri kesmenizi sağlar.'],
  ['Bereketli Hasat & Çiftçilik', 'Yaşam', 'xp_boost', 0.03, 'Çapa ile sürülen topraklardan, meyve çalılarından ve ekinlerden bol ürün verir.'],
  ['Kamp Ateşi & Fırın Hızlı Pişirme', 'Yaşam', 'xp_boost', 0.02, 'Çiğ etleri ve maden cevherlerini fırın ve kamp ateşinde hızla işler.'],
  ['Köylü Zümrüt Ticaret Loncası', 'Yaşam', 'xp_boost', 0.04, 'Köylü ve Gezgin Tüccar takaslarında efsanevi silah, zırh ve parşömen seçenekleri!'],
  ['Sadık Kurt (Ranga) Evcilleştirme', 'Yaşam', 'attack_boost', 0.015, 'Kemikle evcilleştirilen kurtlar büyür, tasması parlar ve düşmanlarınıza saldırır.'],
  ['Şanslı Köy Kedisi Dostluğu', 'Yaşam', 'magnet_loot', 0.1, 'Balık/et ile evcilleştirilen kediler yanınızda gezer ve huzur verir.'],
  ['Allay Peri Yenilenme Aurası', 'Yaşam', 'magicule_regen', 0.04, 'Ametist ile dost olan Allay perileri yanınızda uçarak can/büyü yeniler.'],
  ['Demir Golem Köy Muhafızı Onarımı', 'Yaşam', 'armor_boost', 0.5, 'Demir külçesiyle onarılan Golemler düşmanları gökyüzüne fırlatarak korur.'],
  ['Kar Golemi Kartopu Kulesi', 'Yaşam', 'xp_boost', 0.02, 'Gezdiği çimleri karla kaplar ve yaklaşan düşmanları kartopu yağmuruna tutar.'],
  ['Bakır Golem (26.3) Mekanik Dost', 'Yaşam', 'mining_haste', 0.02, 'Tuzak kapılarıyla etkileşime giren sevimli bakır yardımcı.'],
  ['Mutlu Ghast (26.3) Gökyüzü Bineği', 'Yaşam', 'speed_boost', 0.015, 'Sağ tıkla binip gökyüzünde özgürce yükselip alçalabileceğiniz uçan binek!'],
  ['Çöl Devesi İleri Atılma Bineği', 'Yaşam', 'speed_boost', 0.015, 'Çöllerde Boşluk tuşuyla uzun mesafe ileri atılan dayanıklı binek.'],
  ['Asil Savaş Atı Engel Atlama', 'Yaşam', 'jump_boost', 0.02, 'Ovalarda yüksek hızla koşan ve çitlerin üzerinden atlayan binek atlar.'],
  ['Piglin Altın Takas (Bartering) Sanatı', 'Yaşam', 'magnet_loot', 0.15, 'Nether\'da Piglinlere altın külçesi vererek Ender İncisi ve Obsidyen kazanın!'],
  ['Koyun Kırkma & Renkli Yün Dokuma', 'Yaşam', 'xp_boost', 0.02, 'Makasla zarar vermeden yün kırkma ve yatak/halı üretimi.'],
  ['Su & Lav Kovası Akışkan Kontrolü', 'Yaşam', 'swim_speed', 0.02, 'Kovayla kendi yüzme havuzunuzu, şelalenizi veya obsidyen dökümünüzü yapın.'],
  ['TNT & Kızıltaş Patlayıcı Madencilik', 'Yaşam', 'mining_haste', 0.04, 'Geniş mağaralar açmak için kontrollü TNT ateşleme ve patlama fiziği.'],
  ['Müzik Kutusu & Nota Bloğu Melodisi', 'Yaşam', 'magicule_regen', 0.02, 'Köy meydanlarında neşeli melodiler çalarak atmosferi canlandırır.'],
  ['Büyüleyici Ametist Kristal Sesleri', 'Yaşam', 'xp_boost', 0.02, 'Ametist bloklarının üzerinde yürürken ve kazarken kristal çınlama efektleri.'],
  ['Dسم (Doygunluk) & Ziyafet Dengesi', 'Yaşam', 'armor_boost', 0.5, 'Biftek, ekmek ve altın elma yediğinizde uzun süreli tokluk ve can onarımı.'],
  ['Hızlı Envanter Başlangıç Ekipmanı', 'Yaşam', 'attack_boost', 0.015, 'Oyuna kaliteli aletler, kalkan, yay, yiyecek ve meşalelerle güçlü başlangıç!'],
  ['Sandık Saklama & Düzenleme Sistemi', 'Yaşam', 'magnet_loot', 0.1, 'Evlerinize koyduğunuz sandıklarda fazla eşyalarınızı güvenle depolayın.'],
  ['Merdiven, Çit, Levha & Kapı Mimari Seti', 'Yaşam', 'mining_haste', 0.02, 'Kendi kalenizi ve köşkünüzü detaylı inşa etmeniz için tam blok çeşitliliği.'],
  ['Kiraz & Ladin Dekoratif Ahşap Seti', 'Yaşam', 'xp_boost', 0.02, 'Pembe kiraz tahtaları ve koyu ladin kütükleriyle Japon/Kuzey mimarisi.'],
  ['Bakır Izgara & Tuff Saray Blokları', 'Yaşam', 'armor_boost', 0.5, 'Modern 26.3 zindan ve saray tasarımları için özel yapı taşları.'],
  ['Deniz Feneri & Işıktaşı Sualtı Aydınlatma', 'Yaşam', 'night_vision', 0.05, 'Lagünlerin ve limanların tabanını ışıl ışıl aydınlatan su geçirmez bloklar.'],
  ['Otomatik Görev Ödülü Teslimatı', 'Yaşam', 'xp_boost', 0.04, 'Tamamlanan her görevin Zümrüt, XP ve Ejderha Pulu ödülünü anında çantanıza aktarır!'],
  ['Ölümsüz Kayıt & Hızlı Yeniden Doğuş', 'Yaşam', 'armor_boost', 0.5, 'Yeniden doğuşta eşyalarınızı korur ve sizi güvenli zemine yerleştirir.']
];

const EFSANE_SEEDS: RawModSeed[] = [
  ['Horizon 26.3 Ultimate Parity Core', 'Paket', 'xp_boost', 0.05, 'Orijinal 26.3 mekaniklerini, bloklarını ve yaratıklarını eksiksiz birleştiren ana çekirdek.'],
  ['Multiverse Anime Legends Mega Pack', 'Paket', 'attack_boost', 0.04, 'Tensura, Naruto, Bleach, Dragon Ball ve One Piece evrenlerinin tam birleşimi!'],
  ['Draconic Sovereignty Expansion', 'Paket', 'dragon_rate', 0.1, 'Element Ejderhaları, Ejderha Pulu zanaatı ve 44 ejderha kalesini güçlendirir.'],
  ['Waystones & 200 Realms Explorer', 'Paket', 'speed_boost', 0.02, '200 benzersiz bölge arasında sıfır sıkışma garantili anında seyahat paketi.'],
  ['1000 Chronicles Questline Saga', 'Paket', 'xp_boost', 0.06, '10 destansı bölüm boyunca uzanan 1000 görevlik devasa RPG ilerleme zinciri!'],
  ['Aqua Dynamics & Ocean Life Suite', 'Paket', 'swim_speed', 0.08, 'Gerçekçi yüzme fiziği, kristal lagünler, korsan gemileri ve su canlıları paketi.'],
  ['True 3D Armory & Relics Forged', 'Paket', 'crit_boost', 0.025, 'Tüm silahları, aletleri ve anime yadigarlarını çok parçalı gerçek 3B modellere taşır.'],
  ['CinemaCam 1st/3rd Person Pro', 'Paket', 'speed_boost', 0.015, '1. Şahıs ve yaylı 3. Şahıs kamera geçişlerini PC ve mobilde kusursuzlaştırır.'],
  ['Pocket Touch & Responsive HUD Ultra', 'Paket', 'mining_haste', 0.03, 'Telefon, tablet ve PC ekranlarında taşmayan, akıcı çok-cihazlı arayüz paketi.'],
  ['Unique Bosses & Nemesis Overhaul', 'Paket', 'lifesteal', 0.02, '★ Unique elit boss ünvanları, aura halkaları ve zengin hazine düşürme paketi.'],
  ['Living Villages & Kingdoms Guard', 'Paket', 'magnet_loot', 0.2, '44 komşu köyü mobilyalı evler, köylüler, tüccarlar ve golemlerle canlandırır.'],
  ['Immortal Sage & Companion Legion', 'Paket', 'magicule_regen', 0.06, 'Manas: Ciel danışmanı ve sınırsız sadık muhafız ordusu yönetim paketi.'],
  ['Sovereign Combat & Critical Mastery', 'Paket', 'crit_boost', 0.025, 'Süpürme vuruşu, hava kritiği, kalkan savuşturma ve geri tepme savaş paketi.'],
  ['Zero-Lag Instanced Renderer Turbo', 'Paket', 'speed_boost', 0.015, 'Paylaşımlı geometri ve doku önbelleğiyle 300 mod aktifken bile 60+ FPS sağlar.'],
  ['Windowed Input Shield & Auto-Sprint', 'Paket', 'auto_sprint', 1, 'Tam ekran zorunluluğu olmadan tarayıcı kısayol çakışmalarını önleyen koruma paketi.'],
  ['Celestial Sky & Night Clarity FX', 'Paket', 'night_vision', 0.08, 'Canlı gökyüzü, ateşböcekleri ve karanlıkta berrak görüş atmosfer paketi.'],
  ['Grand Master Alchemist & Enchanter', 'Paket', 'magicule_regen', 0.04, 'İksir simyası, büyü masası ve çakra parşömeni ustalık paketi.'],
  ['Sky-Islands & Nether Bastions Pack', 'Paket', 'jump_boost', 0.02, 'End gökyüzü adaları ve Nether bazalt kalelerini genişleten boyut paketi.'],
  ['Mythic Harvest & Treasure Hunter', 'Paket', 'magnet_loot', 0.25, 'Bölge sandıklarını, maden kazancını ve mıknatıs toplama menzilini güçlendirir.'],
  ['Shinobi & Soul Reaper Crossover', 'Paket', 'speed_boost', 0.02, 'Konoha ve Seireitei tekniklerini yüksek hız ve keskinlikle harmanlar.'],
  ['Saiyan & Pirate Emperor Crossover', 'Paket', 'attack_boost', 0.03, 'İlahi Ki patlamaları ile Kral Haki şok dalgalarını birleştiren güç paketi.'],
  ['Jura Tempest Royal Architecture', 'Paket', 'xp_boost', 0.03, 'Başkent mimarisini, saat kulesini, kolezyumu ve kiraz bulvarını zenginleştirir.'],
  ['Master Builder\'s Infinite Palette', 'Paket', 'mining_haste', 0.05, 'Tüm yapı bloklarına, kapılara, fenerlere ve dekorasyonlara hızlı erişim sağlar.'],
  ['Beastmaster Mounts & Companions', 'Paket', 'speed_boost', 0.02, 'At, Deve, Mutlu Ghast, Nautilus, Lav Gezgini ve Kurt/Allay dostluk paketi.'],
  ['Vampire & Reaper Blood Pact', 'Paket', 'lifesteal', 0.025, 'Vuruş başına can çalma ve savaş içi hayatta kalma yenilenmesini artırır.'],
  ['Titan Vanguard Bulwark', 'Paket', 'armor_boost', 1.5, 'Zorlu ejderha ve boss savaşlarında ekstra doğal zırh ve darbe direnci verir.'],
  ['Explorer\'s Radar & Cartography', 'Paket', 'speed_boost', 0.015, 'Genişletilmiş sağ üst minimap, pusula yönleri ve canlı varlık simgeleri paketi.'],
  ['Arcane Runes & Astral Sorcery', 'Paket', 'magicule_regen', 0.05, 'Astral Yıldız Asası ve nihai büyüler için ekstra mana verimliliği.'],
  ['eternal Prestij & Efsane Tacı', 'Paket', 'xp_boost', 0.05, 'Tüm ilerlemenizi, karakterinizi ve görev ödüllerinizi kalıcı olarak taçlandırır.'],
  ['Horizon Omega 300. Mod Tamamlayıcı', 'Paket', 'attack_boost', 0.03, '300 kurulu modun tamamını senkronize çalıştıran nihai efsanevi mühür!']
];

function buildModCatalog300(): ModCatalogEntry[] {
  const groups: Array<[Exclude<ModCategoryId, 'all'>, RawModSeed[]]> = [
    ['fizik', FIZIK_SEEDS],
    ['anime', ANIME_SEEDS],
    ['boss', BOSS_SEEDS],
    ['silah', SILAH_SEEDS],
    ['dunya', DUNYA_SEEDS],
    ['buyu', BUYU_SEEDS],
    ['grafik', GRAFIK_SEEDS],
    ['harita', HARITA_SEEDS],
    ['yasam', YASAM_SEEDS],
    ['efsane', EFSANE_SEEDS]
  ];
  const out: ModCatalogEntry[] = [];
  let idx = 1;
  for (const [cat, seeds] of groups) {
    for (let i = 0; i < seeds.length; i++) {
      const [name, universeTag, effectKind, effectValue, desc, defaultEnabled] = seeds[i];
      const minor = (idx % 9) + 1;
      out.push({
        index: idx,
        id: `mod_${cat}_${i + 1}`,
        name,
        version: `v26.3.${minor}`,
        category: cat,
        universeTag,
        desc,
        effectKind,
        effectValue,
        defaultEnabled: defaultEnabled ?? true
      });
      idx++;
    }
  }
  return out;
}

export const MOD_CATALOG_300: ModCatalogEntry[] = buildModCatalog300();

const MOD_DISABLED_STORAGE_KEY = 'horizon_mods_300_disabled_v1';

export class ModRegistryManager {
  private disabledIds = new Set<string>();

  constructor() {
    for (let i = 0; i < MOD_CATALOG_300.length; i++) {
      const m = MOD_CATALOG_300[i];
      if (!m.defaultEnabled) this.disabledIds.add(m.id);
    }
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(MOD_DISABLED_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.disabledIds.clear();
        for (const id of arr) {
          if (typeof id === 'string') this.disabledIds.add(id);
        }
      }
    } catch {
      // ignore storage error
    }
  }

  private save() {
    try {
      localStorage.setItem(MOD_DISABLED_STORAGE_KEY, JSON.stringify(Array.from(this.disabledIds)));
    } catch {
      // ignore quota
    }
  }

  public isEnabled(modId: string): boolean {
    return !this.disabledIds.has(modId);
  }

  public setEnabled(modId: string, enabled: boolean) {
    if (enabled) this.disabledIds.delete(modId);
    else this.disabledIds.add(modId);
    this.save();
  }

  public toggle(modId: string): boolean {
    const next = this.disabledIds.has(modId);
    this.setEnabled(modId, next);
    return next;
  }

  public enableAllSafe() {
    this.disabledIds.clear();
    // Keep Chakra Water-Walk opt-in unless manually enabled so natural swimming stays default
    for (const m of MOD_CATALOG_300) {
      if (m.effectKind === 'chakra_water_walk') this.disabledIds.add(m.id);
    }
    this.save();
  }

  public computeEffects(): ActiveModEffects {
    let enabledCount = 0;
    let chakraWaterWalk = false;
    let autoSprintMod = false;
    let speedAdd = 0;
    let swimAdd = 0;
    let jumpAdd = 0;
    let atkAdd = 0;
    let critAdd = 0;
    let lifeAdd = 0;
    let armorAdd = 0;
    let magnetAdd = 0;
    let xpAdd = 0;
    let dragonAdd = 0;
    let nvAdd = 0;
    let mpAdd = 0;
    let mineAdd = 0;

    for (let i = 0; i < MOD_CATALOG_300.length; i++) {
      const m = MOD_CATALOG_300[i];
      if (this.disabledIds.has(m.id)) continue;
      enabledCount++;
      switch (m.effectKind) {
        case 'chakra_water_walk':
          chakraWaterWalk = true;
          break;
        case 'auto_sprint':
          autoSprintMod = true;
          break;
        case 'speed_boost':
          speedAdd += m.effectValue;
          break;
        case 'swim_speed':
          swimAdd += m.effectValue;
          break;
        case 'jump_boost':
          jumpAdd += m.effectValue;
          break;
        case 'attack_boost':
          atkAdd += m.effectValue;
          break;
        case 'crit_boost':
          critAdd += m.effectValue;
          break;
        case 'lifesteal':
          lifeAdd += m.effectValue;
          break;
        case 'armor_boost':
          armorAdd += m.effectValue;
          break;
        case 'magnet_loot':
          magnetAdd += m.effectValue;
          break;
        case 'xp_boost':
          xpAdd += m.effectValue;
          break;
        case 'dragon_rate':
          dragonAdd += m.effectValue;
          break;
        case 'night_vision':
          nvAdd += m.effectValue;
          break;
        case 'magicule_regen':
          mpAdd += m.effectValue;
          break;
        case 'mining_haste':
          mineAdd += m.effectValue;
          break;
      }
    }

    return {
      enabledCount,
      chakraWaterWalk,
      autoSprintMod,
      speedMult: Math.min(1.38, 1 + speedAdd * 0.45),
      swimSpeedMult: Math.min(1.55, 1 + swimAdd * 0.7),
      jumpBonus: Math.min(0.18, jumpAdd),
      attackMult: Math.min(1.65, 1 + atkAdd * 0.65),
      critBonus: Math.min(0.35, critAdd * 0.75),
      lifestealRatio: Math.min(0.24, lifeAdd * 0.8),
      armorBonus: Math.min(8, Math.round(armorAdd * 0.45)),
      magnetRadius: Math.min(5.2, 1.85 + magnetAdd * 1.35),
      xpMult: Math.min(2.5, 1 + xpAdd),
      dragonSpawnBoost: Math.min(2.2, 1 + dragonAdd),
      nightVisionBonus: Math.min(0.28, nvAdd * 0.5),
      magiculeRegenMult: Math.min(2.4, 1 + mpAdd),
      miningSpeedMult: Math.min(1.65, 1 + mineAdd * 0.85)
    };
  }
}

// ============================================================================
// 1,000 PROGRESSIVE QUESTS ACROSS 10 CHAPTERS WITH LIVE STAT TRACKING
// ============================================================================

export type QuestChapterId =
  | 'all'
  | 'baslangic'
  | 'kesif_su'
  | 'madencilik'
  | 'insaat'
  | 'zanaat'
  | 'avci'
  | 'anime'
  | 'bolge'
  | 'unique_boss'
  | 'ejderha';

export type QuestStatKey =
  | 'blocksMined'
  | 'oresMined'
  | 'blocksPlaced'
  | 'craftsDone'
  | 'tradesDone'
  | 'chestsLooted'
  | 'swimMeters'
  | 'walkMeters'
  | 'mobsKilled'
  | 'uniquesKilled'
  | 'dragonsKilled'
  | 'skillsCast'
  | 'transformsDone'
  | 'alliesNamed'
  | 'regionsVisited'
  | 'teleportsUsed';

export interface QuestChapterMeta {
  id: QuestChapterId;
  label: string;
}

export const QUEST_CHAPTERS: QuestChapterMeta[] = [
  { id: 'all', label: 'Tümü (1000)' },
  { id: 'baslangic', label: '1. Başlangıç (100)' },
  { id: 'kesif_su', label: '2. Yüzme & Keşif (100)' },
  { id: 'madencilik', label: '3. Madencilik (100)' },
  { id: 'insaat', label: '4. Mimarlık (100)' },
  { id: 'zanaat', label: '5. Zanaat & Takas (100)' },
  { id: 'avci', label: '6. Canavar Avcısı (100)' },
  { id: 'anime', label: '7. Anime & Güç (100)' },
  { id: 'bolge', label: '8. 200 Bölge (100)' },
  { id: 'unique_boss', label: '9. Unique Boss (100)' },
  { id: 'ejderha', label: '10. Ejderha Lordu (100)' }
];

export interface QuestEntry {
  index: number; // 1..1000
  id: string;
  chapter: Exclude<QuestChapterId, 'all'>;
  title: string;
  desc: string;
  statKey: QuestStatKey;
  target: number;
  rewardEmeralds: number;
  rewardXp: number;
  rewardScales: number;
}

const RANK_SUFFIXES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

interface ChapterTemplate {
  chapter: Exclude<QuestChapterId, 'all'>;
  themes: Array<{
    titleBase: string;
    descVerb: string;
    unit: string;
    statKey: QuestStatKey;
    baseStep: number;
  }>;
}

const CHAPTER_TEMPLATES: ChapterTemplate[] = [
  {
    chapter: 'baslangic',
    themes: [
      { titleBase: 'Tempest Öncüsü: İlk Kazı', descVerb: 'Dünyada toplam blok kaz', unit: 'blok', statKey: 'blocksMined', baseStep: 5 },
      { titleBase: 'Başkent Yapıcısı: İlk Temel', descVerb: 'Yapı inşasında blok yerleştir', unit: 'blok', statKey: 'blocksPlaced', baseStep: 5 },
      { titleBase: 'Çırak Zanaatkar', descVerb: 'Üretim ekranında eşya üret', unit: 'üretim', statKey: 'craftsDone', baseStep: 2 },
      { titleBase: 'Jura Gezgini: Adımlar', descVerb: 'Dünyayı yürüyerek/koşarak keşfet', unit: 'metre', statKey: 'walkMeters', baseStep: 60 },
      { titleBase: 'Liman Yüzücüsü', descVerb: 'Kristal sularda batmadan yüz', unit: 'metre', statKey: 'swimMeters', baseStep: 15 },
      { titleBase: 'Bölge Öncüsü', descVerb: 'Farklı bölgeleri keşfet', unit: 'bölge', statKey: 'regionsVisited', baseStep: 1 },
      { titleBase: 'Pazar Dostu', descVerb: 'Köylü veya Tüccarla takas yap', unit: 'takas', statKey: 'tradesDone', baseStep: 1 },
      { titleBase: 'Hazine Arayıcısı', descVerb: 'Bölge sandıklarını açıp yağmala', unit: 'sandık', statKey: 'chestsLooted', baseStep: 1 },
      { titleBase: 'İlk Muhafız Sınavı', descVerb: 'Vahşi düşman yaratıkları alt et', unit: 'düşman', statKey: 'mobsKilled', baseStep: 2 },
      { titleBase: 'Nihai Uyanış', descVerb: '[R] veya [X] ile nihai güç ateşle', unit: 'yetenek', statKey: 'skillsCast', baseStep: 2 }
    ]
  },
  {
    chapter: 'kesif_su',
    themes: [
      { titleBase: 'Lagün Kulaç Ustası', descVerb: 'Su yüzeyinde serbest stil yüz', unit: 'metre', statKey: 'swimMeters', baseStep: 35 },
      { titleBase: 'Okyanus Denizcisi', descVerb: 'Deniz ve koylarda mesafe katet', unit: 'metre', statKey: 'swimMeters', baseStep: 55 },
      { titleBase: 'Korsan Limanı Yüzücüsü', descVerb: 'Grand Line limanlarında yüz', unit: 'metre', statKey: 'swimMeters', baseStep: 80 },
      { titleBase: 'Mercan Dalgıcı', descVerb: 'Derin lagünlerde yüzme antremanı yap', unit: 'metre', statKey: 'swimMeters', baseStep: 110 },
      { titleBase: 'Ufuk Yürüyüşçüsü', descVerb: 'Kıtalar arasında koşarak ilerle', unit: 'metre', statKey: 'walkMeters', baseStep: 180 },
      { titleBase: 'Rüzgar Maratoncusu', descVerb: 'Biyomlar boyunca seyahat et', unit: 'metre', statKey: 'walkMeters', baseStep: 320 },
      { titleBase: 'Waystone Seyyahı', descVerb: 'Güvenli bölge ışınlanmasını kullan', unit: 'ışınlanma', statKey: 'teleportsUsed', baseStep: 2 },
      { titleBase: 'Harita Fatihi', descVerb: 'Benzersiz bölgeleri ziyaret et', unit: 'bölge', statKey: 'regionsVisited', baseStep: 3 },
      { titleBase: 'Sahil Hazinecisi', descVerb: 'Kıyı ve gemi sandıklarını aç', unit: 'sandık', statKey: 'chestsLooted', baseStep: 2 },
      { titleBase: 'Kıta Kaşifi Seferi', descVerb: 'Açık dünyada toplam mesafe katet', unit: 'metre', statKey: 'walkMeters', baseStep: 500 }
    ]
  },
  {
    chapter: 'madencilik',
    themes: [
      { titleBase: 'Taş Ocağı Kalfası', descVerb: 'Kazmayla taş ve zemin blokları kaz', unit: 'blok', statKey: 'blocksMined', baseStep: 25 },
      { titleBase: 'Derin Galeri Madencisi', descVerb: 'Yeraltı galerilerinde blok kır', unit: 'blok', statKey: 'blocksMined', baseStep: 50 },
      { titleBase: 'Dwargon Kazı Loncası', descVerb: 'Dağ ve mağaralarda blok kaz', unit: 'blok', statKey: 'blocksMined', baseStep: 85 },
      { titleBase: 'Kömür & Bakır Damarı', descVerb: 'Değerli maden cevheri bloğu kaz', unit: 'cevher', statKey: 'oresMined', baseStep: 4 },
      { titleBase: 'Demir Döküm Madencisi', descVerb: 'Yeraltından maden cevheri çıkar', unit: 'cevher', statKey: 'oresMined', baseStep: 8 },
      { titleBase: 'Altın & Zümrüt Arayıcısı', descVerb: 'Nadir cevher damarlarını kaz', unit: 'cevher', statKey: 'oresMined', baseStep: 12 },
      { titleBase: 'Elmas & Ametist Jeotu', descVerb: 'Derin katman cevherlerini topla', unit: 'cevher', statKey: 'oresMined', baseStep: 18 },
      { titleBase: 'Obsidyen Kırıcı', descVerb: 'Toplam kazılan blok sayısını artır', unit: 'blok', statKey: 'blocksMined', baseStep: 130 },
      { titleBase: 'Kıta Kazı İmparatoru', descVerb: 'Büyük çaplı madencilik yap', unit: 'blok', statKey: 'blocksMined', baseStep: 180 },
      { titleBase: 'Efsanevi Cevher Efendisi', descVerb: 'Toplam maden cevheri hasadı yap', unit: 'cevher', statKey: 'oresMined', baseStep: 25 }
    ]
  },
  {
    chapter: 'insaat',
    themes: [
      { titleBase: 'Köy Ev Ustası', descVerb: 'Ahşap ve taş yapı blokları koy', unit: 'blok', statKey: 'blocksPlaced', baseStep: 20 },
      { titleBase: 'Sur & Kule Mimarı', descVerb: 'Savunma surları için blok yerleştir', unit: 'blok', statKey: 'blocksPlaced', baseStep: 40 },
      { titleBase: 'Kiraz Köşkü Tasarımcısı', descVerb: 'Estetik yapılar için blok diz', unit: 'blok', statKey: 'blocksPlaced', baseStep: 65 },
      { titleBase: 'Köprü & İskele Mühendisi', descVerb: 'Lagün ve nehir üstüne blok koy', unit: 'blok', statKey: 'blocksPlaced', baseStep: 90 },
      { titleBase: 'Tapınak & Torii İnşası', descVerb: 'Anıtsal yapılar için blok yerleştir', unit: 'blok', statKey: 'blocksPlaced', baseStep: 120 },
      { titleBase: 'Kale & Burç Hükümdarı', descVerb: 'Büyük kaleler inşa et', unit: 'blok', statKey: 'blocksPlaced', baseStep: 155 },
      { titleBase: 'Gökyüzü Adası Mimarı', descVerb: 'Yüksek rakımlarda yapı kur', unit: 'blok', statKey: 'blocksPlaced', baseStep: 190 },
      { titleBase: 'Kolezyum Arena Ustası', descVerb: 'Savaş arenaları için blok yerleştir', unit: 'blok', statKey: 'blocksPlaced', baseStep: 230 },
      { titleBase: 'İmparatorluk Başmimarı', descVerb: 'Şehir ölçeğinde inşaat tamamla', unit: 'blok', statKey: 'blocksPlaced', baseStep: 280 },
      { titleBase: 'Ebedi Anıt Yaratıcısı', descVerb: 'Toplam yerleştirilen blok hedefini aş', unit: 'blok', statKey: 'blocksPlaced', baseStep: 340 }
    ]
  },
  {
    chapter: 'zanaat',
    themes: [
      { titleBase: 'Atölye Çırağı', descVerb: 'Çalışma masasında eşya üret', unit: 'üretim', statKey: 'craftsDone', baseStep: 4 },
      { titleBase: 'Kurobe Demirhanesi', descVerb: 'Silah, alet ve yapı eşyası üret', unit: 'üretim', statKey: 'craftsDone', baseStep: 8 },
      { titleBase: 'Simya & Zırh Ustası', descVerb: 'Üretim tariflerini tamamla', unit: 'üretim', statKey: 'craftsDone', baseStep: 14 },
      { titleBase: 'Efsanevi Silah Dökümü', descVerb: 'Toplam zanaat üretimini artır', unit: 'üretim', statKey: 'craftsDone', baseStep: 20 },
      { titleBase: 'Myourmiles Tüccar Ağı', descVerb: 'Köylü ve tüccarlarla ticaret yap', unit: 'takas', statKey: 'tradesDone', baseStep: 2 },
      { titleBase: 'Zümrüt Kervanı', descVerb: 'Köyler arası karlı takaslar yap', unit: 'takas', statKey: 'tradesDone', baseStep: 4 },
      { titleBase: 'Altın Borsa Efendisi', descVerb: 'Toplam köylü takası sayısını artır', unit: 'takas', statKey: 'tradesDone', baseStep: 7 },
      { titleBase: 'Kayıp Sandık Avcısı', descVerb: 'Dünyadaki hazine sandıklarını aç', unit: 'sandık', statKey: 'chestsLooted', baseStep: 2 },
      { titleBase: 'Kraliyet Hazinecisi', descVerb: 'Kale ve köy sandıklarını yağmala', unit: 'sandık', statKey: 'chestsLooted', baseStep: 4 },
      { titleBase: 'Çoklu-Evren Koleksiyoncusu', descVerb: 'Bölge hazine sandıklarını topla', unit: 'sandık', statKey: 'chestsLooted', baseStep: 6 }
    ]
  },
  {
    chapter: 'avci',
    themes: [
      { titleBase: 'Sınır Devriyesi', descVerb: 'Başkent dışındaki düşmanları temizle', unit: 'düşman', statKey: 'mobsKilled', baseStep: 5 },
      { titleBase: 'Gece Muhafızı', descVerb: 'Saldırgan yaratıkları etkisiz hale getir', unit: 'düşman', statKey: 'mobsKilled', baseStep: 10 },
      { titleBase: 'Shinobi & Yağmacı Avı', descVerb: 'Açık dünya düşmanlarını alt et', unit: 'düşman', statKey: 'mobsKilled', baseStep: 16 },
      { titleBase: 'Oni & Hollow Temizliği', descVerb: 'Elit savaşçıları dize getir', unit: 'düşman', statKey: 'mobsKilled', baseStep: 24 },
      { titleBase: 'Çöl & Kanyon Avcısı', descVerb: 'Toplam avlanan düşman sayısını artır', unit: 'düşman', statKey: 'mobsKilled', baseStep: 32 },
      { titleBase: 'Nether Lejyon Kırıcı', descVerb: 'Boyut yaratıklarına karşı zafer kazan', unit: 'düşman', statKey: 'mobsKilled', baseStep: 42 },
      { titleBase: 'Gümüş Keskin Kılıç', descVerb: 'Savaş meydanında düşman avla', unit: 'düşman', statKey: 'mobsKilled', baseStep: 55 },
      { titleBase: 'Kızıl Savaş Ustası', descVerb: 'Ordulara tek başına meydan oku', unit: 'düşman', statKey: 'mobsKilled', baseStep: 70 },
      { titleBase: 'Efsanevi Gladyatör', descVerb: 'Yüzlerce düşmanı dize getir', unit: 'düşman', statKey: 'mobsKilled', baseStep: 88 },
      { titleBase: 'Kıyamet Biçici', descVerb: 'Toplam düşman avı rekorunu kır', unit: 'düşman', statKey: 'mobsKilled', baseStep: 110 }
    ]
  },
  {
    chapter: 'anime',
    themes: [
      { titleBase: 'Nihai Güç Uyanışı', descVerb: '[R] veya [X] ile anime yeteneği kullan', unit: 'yetenek', statKey: 'skillsCast', baseStep: 5 },
      { titleBase: 'Çakra & Reiatsu Akışı', descVerb: '3B nihai büyüleri savaşta ateşle', unit: 'yetenek', statKey: 'skillsCast', baseStep: 12 },
      { titleBase: 'Ki & Kral Haki Patlaması', descVerb: 'Yıkıcı imza yeteneklerini kullan', unit: 'yetenek', statKey: 'skillsCast', baseStep: 20 },
      { titleBase: 'Azathoth & Mugetsu Ustası', descVerb: 'Nihai yetenek kullanımında ustalaş', unit: 'yetenek', statKey: 'skillsCast', baseStep: 32 },
      { titleBase: 'Çoklu-Evren Kozmik Büyücü', descVerb: 'Toplam yetenek ateşleme hedefini aş', unit: 'yetenek', statKey: 'skillsCast', baseStep: 45 },
      { titleBase: 'Biçim Değiştiren Kahraman', descVerb: '[K] menüsünden farklı karaktere dönüş', unit: 'dönüşüm', statKey: 'transformsDone', baseStep: 1 },
      { titleBase: '96 Efsane Koleksiyoncusu', descVerb: 'Anime ve RPG karakter formlarını dene', unit: 'dönüşüm', statKey: 'transformsDone', baseStep: 3 },
      { titleBase: 'İsim Bahşeden Hükümdar', descVerb: 'Canlılara isim verip sadık orduna kat', unit: 'isim', statKey: 'alliesNamed', baseStep: 1 },
      { titleBase: 'Sadık Tempest Komutanı', descVerb: 'İsimlendirilmiş muhafız ordunu büyüt', unit: 'isim', statKey: 'alliesNamed', baseStep: 2 },
      { titleBase: 'Evrenler Üstü İmparator', descVerb: 'Nihai güçleri durmaksızın konuştur', unit: 'yetenek', statKey: 'skillsCast', baseStep: 60 }
    ]
  },
  {
    chapter: 'bolge',
    themes: [
      { titleBase: 'Başkent Mahalleleri Turu', descVerb: '200 bölgeden yeni yerler keşfet', unit: 'bölge', statKey: 'regionsVisited', baseStep: 2 },
      { titleBase: 'Komşu Köyler Elçisi', descVerb: 'Farklı köy ve krallıkları ziyaret et', unit: 'bölge', statKey: 'regionsVisited', baseStep: 4 },
      { titleBase: 'Anime Diyarları Gezgini', descVerb: 'Konoha, Seireitei ve limanlara ulaş', unit: 'bölge', statKey: 'regionsVisited', baseStep: 7 },
      { titleBase: 'Lagün & Vaha Kaşifi', descVerb: 'Doğa harikası bölgeleri keşfet', unit: 'bölge', statKey: 'regionsVisited', baseStep: 10 },
      { titleBase: 'Ejderha Kaleleri Öncüsü', descVerb: 'Tehlikeli boss bölgelerine ayak bas', unit: 'bölge', statKey: 'regionsVisited', baseStep: 13 },
      { titleBase: 'Boyutlar Arası Seyyah', descVerb: 'Nether, End ve uzak bölgeleri gez', unit: 'bölge', statKey: 'regionsVisited', baseStep: 16 },
      { titleBase: '200 Bölge Atlas Ustası', descVerb: 'Keşfedilen toplam bölge sayısını artır', unit: 'bölge', statKey: 'regionsVisited', baseStep: 20 },
      { titleBase: 'Hızlı Işınlanma Ağı', descVerb: 'Waystone ışınlanmalarını kullan', unit: 'ışınlanma', statKey: 'teleportsUsed', baseStep: 4 },
      { titleBase: 'Uzay-Zaman Kapısı Efendisi', descVerb: 'Bölgeler arası güvenli ışınlan', unit: 'ışınlanma', statKey: 'teleportsUsed', baseStep: 8 },
      { titleBase: 'Horizon Dünya Haritacısı', descVerb: '200 bölgenin tamamına doğru ilerle', unit: 'bölge', statKey: 'regionsVisited', baseStep: 20 }
    ]
  },
  {
    chapter: 'unique_boss',
    themes: [
      { titleBase: 'İlk ★ Unique Avı', descVerb: 'Aura halkalı ★ Unique elit boss yen', unit: 'unique', statKey: 'uniquesKilled', baseStep: 1 },
      { titleBase: 'Kijin & Oni Başkomutan Avı', descVerb: '★ Unique elit düşmanları dize getir', unit: 'unique', statKey: 'uniquesKilled', baseStep: 2 },
      { titleBase: 'Espada & Vasto Lorde Avcısı', descVerb: 'Güçlü ★ Unique bossları ortadan kaldır', unit: 'unique', statKey: 'uniquesKilled', baseStep: 3 },
      { titleBase: 'S-Seviye Kaçak Avcısı', descVerb: 'Aranan ★ Unique hedefleri avla', unit: 'unique', statKey: 'uniquesKilled', baseStep: 4 },
      { titleBase: 'Kale Muhafızı Yıkıcı', descVerb: 'Bölge koruyucusu ★ Unique bossları yen', unit: 'unique', statKey: 'uniquesKilled', baseStep: 5 },
      { titleBase: 'Efsanevi Ödül Avcısı', descVerb: '★ Unique boss zaferlerini biriktir', unit: 'unique', statKey: 'uniquesKilled', baseStep: 7 },
      { titleBase: 'Karanlık Taht Fatihi', descVerb: 'Üst düzey ★ Unique liderleri devir', unit: 'unique', statKey: 'uniquesKilled', baseStep: 9 },
      { titleBase: 'Yenilmez Düellocu', descVerb: '★ Unique elitlere karşı üstünlük kur', unit: 'unique', statKey: 'uniquesKilled', baseStep: 11 },
      { titleBase: 'Unique Kıyamet Getiren', descVerb: 'Onlarca ★ Unique bossu alt et', unit: 'unique', statKey: 'uniquesKilled', baseStep: 13 },
      { titleBase: 'Mitos Avcısı Hükümdar', descVerb: 'En zorlu ★ Unique boss avlarını tamamla', unit: 'unique', statKey: 'uniquesKilled', baseStep: 15 }
    ]
  },
  {
    chapter: 'ejderha',
    themes: [
      { titleBase: 'İlk Ejderha Kanı', descVerb: 'Alev, Buz, Fırtına veya Ender Ejderhası yen', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 1 },
      { titleBase: 'Kızıl Alev Ejderhası Avcısı', descVerb: 'Element ejderhalarını gökyüzünden indir', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 2 },
      { titleBase: 'Mutlak Sıfır Buz Avcısı', descVerb: 'Kadim ejderhalara karşı zafer kazan', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 3 },
      { titleBase: 'Fırtına Kanadı Kırıcı', descVerb: 'Gök yaran ejderhaları alt et', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 4 },
      { titleBase: 'Ejderha Yuvası Fatihi', descVerb: 'Obsidyen yuvalardaki ejderhaları temizle', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 5 },
      { titleBase: 'Ejderha Pulu Efendisi', descVerb: 'Avlanan toplam ejderha sayısını artır', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 6 },
      { titleBase: 'Gökyüzü Tiranı Avcısı', descVerb: 'Efsanevi ejderha sürülerini dize getir', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 8 },
      { titleBase: 'Veldanava\'nın Sınavı', descVerb: 'Gerçek ejderha gücünü kanıtla', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 10 },
      { titleBase: 'Ejderha Katili Efsanesi', descVerb: 'Kıtalardaki dev ejderhaları avla', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 12 },
      { titleBase: '1000. Destan: Ejderha İmparatoru', descVerb: 'Tüm ejderha hükümdarlarını fethet!', unit: 'ejderha', statKey: 'dragonsKilled', baseStep: 15 }
    ]
  }
];

function buildQuestCatalog1000(): QuestEntry[] {
  const out: QuestEntry[] = [];
  let qIndex = 1;
  for (let c = 0; c < CHAPTER_TEMPLATES.length; c++) {
    const chap = CHAPTER_TEMPLATES[c];
    for (let tier = 1; tier <= 10; tier++) {
      for (let t = 0; t < chap.themes.length; t++) {
        const th = chap.themes[t];
        let target = Math.max(1, Math.round(th.baseStep * tier));
        if (th.statKey === 'regionsVisited') {
          target = Math.min(200, target);
        }
        const rankRoman = RANK_SUFFIXES[tier - 1];
        out.push({
          index: qIndex,
          id: `q_${qIndex}`,
          chapter: chap.chapter,
          title: `#${qIndex} ${th.titleBase} ${rankRoman}`,
          desc: `${th.descVerb}: ${target.toLocaleString('tr-TR')} ${th.unit}.`,
          statKey: th.statKey,
          target,
          rewardEmeralds: 2 + Math.floor(c * 0.8) + Math.floor(tier * 0.7),
          rewardXp: 15 + c * 8 + tier * 6,
          rewardScales: c >= 8 && tier >= 5 ? 1 : 0
        });
        qIndex++;
      }
    }
  }
  return out;
}

export const QUEST_CATALOG_1000: QuestEntry[] = buildQuestCatalog1000();

// Pre-index quests by statKey for O(1) zero-lag completion checks during gameplay!
const QUESTS_BY_STAT: Record<QuestStatKey, QuestEntry[]> = {
  blocksMined: [],
  oresMined: [],
  blocksPlaced: [],
  craftsDone: [],
  tradesDone: [],
  chestsLooted: [],
  swimMeters: [],
  walkMeters: [],
  mobsKilled: [],
  uniquesKilled: [],
  dragonsKilled: [],
  skillsCast: [],
  transformsDone: [],
  alliesNamed: [],
  regionsVisited: [],
  teleportsUsed: []
};
for (let i = 0; i < QUEST_CATALOG_1000.length; i++) {
  const q = QUEST_CATALOG_1000[i];
  QUESTS_BY_STAT[q.statKey].push(q);
}

interface PersistedQuestState {
  stats: Partial<Record<QuestStatKey, number>>;
  visitedRegions: string[];
  claimedIds: string[];
}

const QUEST_STORAGE_KEY = 'horizon_quests_1000_v1';

export class QuestTracker1000 {
  public stats: Record<QuestStatKey, number> = {
    blocksMined: 0,
    oresMined: 0,
    blocksPlaced: 0,
    craftsDone: 0,
    tradesDone: 0,
    chestsLooted: 0,
    swimMeters: 0,
    walkMeters: 0,
    mobsKilled: 0,
    uniquesKilled: 0,
    dragonsKilled: 0,
    skillsCast: 0,
    transformsDone: 0,
    alliesNamed: 0,
    regionsVisited: 1,
    teleportsUsed: 0
  };

  public visitedRegionIds = new Set<string>(['cap_plaza']);
  public claimedQuestIds = new Set<string>();
  private dirty = false;
  private saveClock = 0;

  public onQuestCompleted?: (quest: QuestEntry) => void;

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(QUEST_STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<PersistedQuestState>;
      if (d.stats && typeof d.stats === 'object') {
        for (const k of Object.keys(this.stats) as QuestStatKey[]) {
          const v = d.stats[k];
          if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
            this.stats[k] = v;
          }
        }
      }
      if (Array.isArray(d.visitedRegions)) {
        for (const id of d.visitedRegions) {
          if (typeof id === 'string') this.visitedRegionIds.add(id);
        }
        this.stats.regionsVisited = Math.max(this.stats.regionsVisited, this.visitedRegionIds.size);
      }
      if (Array.isArray(d.claimedIds)) {
        for (const id of d.claimedIds) {
          if (typeof id === 'string') this.claimedQuestIds.add(id);
        }
      }
    } catch {
      // ignore storage error
    }
  }

  public saveNow() {
    this.dirty = false;
    try {
      const payload: PersistedQuestState = {
        stats: this.stats,
        visitedRegions: Array.from(this.visitedRegionIds),
        claimedIds: Array.from(this.claimedQuestIds)
      };
      localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota
    }
  }

  public tick(dt: number) {
    if (!this.dirty) return;
    this.saveClock += dt;
    if (this.saveClock >= 4.0) {
      this.saveClock = 0;
      this.saveNow();
    }
  }

  public addStat(key: QuestStatKey, delta = 1) {
    if (delta <= 0) return;
    const prevFloor = Math.floor(this.stats[key]);
    this.stats[key] += delta;
    const nextFloor = Math.floor(this.stats[key]);
    this.dirty = true;
    if (nextFloor <= prevFloor) return;

    const bucket = QUESTS_BY_STAT[key];
    for (let i = 0; i < bucket.length; i++) {
      const q = bucket[i];
      if (nextFloor >= q.target && !this.claimedQuestIds.has(q.id)) {
        this.claimedQuestIds.add(q.id);
        this.onQuestCompleted?.(q);
      }
    }
  }

  public markRegionVisited(regionId: string): boolean {
    if (this.visitedRegionIds.has(regionId)) return false;
    this.visitedRegionIds.add(regionId);
    const prev = this.stats.regionsVisited;
    this.stats.regionsVisited = this.visitedRegionIds.size;
    this.dirty = true;
    if (this.stats.regionsVisited > prev) {
      const bucket = QUESTS_BY_STAT.regionsVisited;
      for (let i = 0; i < bucket.length; i++) {
        const q = bucket[i];
        if (this.stats.regionsVisited >= q.target && !this.claimedQuestIds.has(q.id)) {
          this.claimedQuestIds.add(q.id);
          this.onQuestCompleted?.(q);
        }
      }
    }
    return true;
  }

  public getProgress(q: QuestEntry): { current: number; target: number; done: boolean } {
    const cur = Math.min(q.target, Math.floor(this.stats[q.statKey]));
    const done = this.claimedQuestIds.has(q.id) || cur >= q.target;
    return { current: cur, target: q.target, done };
  }

  public getCompletedCount(): number {
    return this.claimedQuestIds.size;
  }

  public getNextActiveQuest(): QuestEntry {
    for (let i = 0; i < QUEST_CATALOG_1000.length; i++) {
      const q = QUEST_CATALOG_1000[i];
      if (!this.claimedQuestIds.has(q.id)) return q;
    }
    return QUEST_CATALOG_1000[QUEST_CATALOG_1000.length - 1];
  }
}

// =========================================================================
// EPIC MULTI-STAGE STORY SAGAS (Destansı Hikaye Destanları — Oynanışı Sevdiren Ana Senaryo)
// =========================================================================
export interface StorySagaStep {
  id: string;
  chapterNum: number;
  universe: string;
  title: string;
  lore: string;
  objectiveLabel: string;
  targetRegionId: string;
  targetRegionName: string;
  statKey: QuestStatKey;
  targetValue: number;
  rewardEmeralds: number;
  rewardXp: number;
  rewardItemId: number;
  rewardItemCount: number;
  rewardItemName: string;
}

export const STORY_SAGAS: StorySagaStep[] = [
  {
    id: 'saga_1_tempest',
    chapterNum: 1,
    universe: 'Tensura',
    title: 'Destan I: Jura Tempest Kuruluşu',
    lore: 'Rimuru Başkenti sınırlarında düşman öncüleri belirdi. İmza yeteneğini [R] veya [X] ile ateşleyip başkenti güvenceye al!',
    objectiveLabel: 'İmza Becerisi [R / X] Kullan',
    targetRegionId: 'cap_outskirts',
    targetRegionName: 'Jura Av Sınırı',
    statKey: 'skillsCast',
    targetValue: 3,
    rewardEmeralds: 12,
    rewardXp: 350,
    rewardItemId: 344, // ITEM.CHAKRA_SCROLL
    rewardItemCount: 3,
    rewardItemName: 'Çakra & Büyü Parşömeni x3'
  },
  {
    id: 'saga_2_minecraft',
    chapterNum: 2,
    universe: 'Minecraft',
    title: 'Destan II: Kadim Derinlik & Minecraft Mirası',
    lore: '[B] menüsünden Steve/Alex veya favori kahramanını seç, maden kaz ya da Antik Derinlik Muhafızı mahzenini keşfet!',
    objectiveLabel: 'Blok Kaz veya İnşa Et',
    targetRegionId: 'boss_deep_warden',
    targetRegionName: 'Antik Derinlik Warden Mahzeni',
    statKey: 'blocksMined',
    targetValue: 10,
    rewardEmeralds: 18,
    rewardXp: 520,
    rewardItemId: 302, // ITEM.MACE
    rewardItemCount: 1,
    rewardItemName: 'Ağır Şok Gürzü (Mace)'
  },
  {
    id: 'saga_3_naruto',
    chapterNum: 3,
    universe: 'Naruto',
    title: 'Destan III: Son Vadi & Shinobi İttifakı',
    lore: 'Konoha ve Son Vadi’de kaçak Shinobi birlikleri toplandı. Oraya ışınlan ve 5 düşmanı etkisiz hale getir!',
    objectiveLabel: 'Düşman Yaratık / Shinobi Yen',
    targetRegionId: 'ani_valley_end',
    targetRegionName: 'Son Vadi (Valley of the End)',
    statKey: 'mobsKilled',
    targetValue: 5,
    rewardEmeralds: 24,
    rewardXp: 780,
    rewardItemId: 339, // ITEM.SHINOBI_KUNAI
    rewardItemCount: 8,
    rewardItemName: 'Hiraishin Shinobi Kunaisi x8'
  },
  {
    id: 'saga_4_bleach',
    chapterNum: 4,
    universe: 'Bleach',
    title: 'Destan IV: Seireitei & Güneşin Kılıcı',
    lore: 'Gotei 13 Başkaptanı Yamamoto’nun Küller Vadisi’nde Hollow istilası başladı. Bölge keşfini tamamla ve ruh avcılarını temizle!',
    objectiveLabel: 'Farklı Bölge / Meydan Keşfet',
    targetRegionId: 'boss_yamamoto_ash',
    targetRegionName: 'Zanka no Tachi Küller Vadisi',
    statKey: 'regionsVisited',
    targetValue: 4,
    rewardEmeralds: 30,
    rewardXp: 1100,
    rewardItemId: 337, // ITEM.ZANGETSU_BLADE
    rewardItemCount: 1,
    rewardItemName: 'Zangetsu Ruh Kılıcı'
  },
  {
    id: 'saga_5_onepiece',
    chapterNum: 5,
    universe: 'One Piece',
    title: 'Destan V: Wano & Onigashima İmparator Savaşı',
    lore: 'Onigashima Kubbesi’nde İmparator Kaido’nun ordusu bekliyor. Düşman saflarını yararak 15 zafer kazan!',
    objectiveLabel: 'Toplam 15 Düşman Devir',
    targetRegionId: 'boss_kaido_onigashima',
    targetRegionName: 'Onigashima — İmparator Kaido Kubbesi',
    statKey: 'mobsKilled',
    targetValue: 15,
    rewardEmeralds: 40,
    rewardXp: 1500,
    rewardItemId: 338, // ITEM.ENMA_KATANA
    rewardItemCount: 1,
    rewardItemName: 'Cehennem Kralı Enma Katanası'
  },
  {
    id: 'saga_6_dragonball',
    chapterNum: 6,
    universe: 'Dragon Ball',
    title: 'Destan VI: Güç Turnuvası & İlahi Tırpan',
    lore: 'Evrenler Arenası’nda ★ Unique elit savaşçılar çarpışıyor. En az 1 ★ Unique Elit veya Boss düşmanı mağlup et!',
    objectiveLabel: '★ Unique Elit Boss Mağlup Et',
    targetRegionId: 'ani_top_stage',
    targetRegionName: 'Güç Turnuvası (Evrenler Arenası)',
    statKey: 'uniquesKilled',
    targetValue: 1,
    rewardEmeralds: 50,
    rewardXp: 2100,
    rewardItemId: 342, // ITEM.DIVINE_SCYTHE
    rewardItemCount: 1,
    rewardItemName: 'İlahi Boyut Tırpanı'
  },
  {
    id: 'saga_7_dragons',
    chapterNum: 7,
    universe: 'Horizon',
    title: 'Destan VII: Kızıl Kıyamet Ejderhası Avı',
    lore: 'Gökyüzünü kavuran Kadim Ateş, Buz veya Fırtına Ejderhalarından birini avlayarak Ejderha Katili unvanını kazan!',
    objectiveLabel: 'Kadim Ejderha Avla',
    targetRegionId: 'boss_crimson_drake',
    targetRegionName: 'Kızıl Ateş Ejderhası Krateri',
    statKey: 'dragonsKilled',
    targetValue: 1,
    rewardEmeralds: 64,
    rewardXp: 3200,
    rewardItemId: 340, // ITEM.DRAGON_SLAYER
    rewardItemCount: 1,
    rewardItemName: 'Ejderha Biçen Dev Kılıç'
  },
  {
    id: 'saga_8_multiverse',
    chapterNum: 8,
    universe: 'Multiverse',
    title: 'Destan VIII: Çoklu-Evren Hükümdarı',
    lore: 'Yıldız Işığı İmparator Ejderhası Sunağı’nda nihai sınav! Sadık dostlar edin, güçlerini [G] Uyanışı ile birleştir ve 35 düşmanı devir!',
    objectiveLabel: 'Toplam 35 Düşman & Boss Yen',
    targetRegionId: 'boss_celestial_dragon',
    targetRegionName: 'Yıldız Işığı İmparator Ejderhası',
    statKey: 'mobsKilled',
    targetValue: 35,
    rewardEmeralds: 64,
    rewardXp: 5000,
    rewardItemId: 341, // ITEM.ASTRAL_STAFF
    rewardItemCount: 1,
    rewardItemName: 'Astral Yıldız Asası'
  }
];

