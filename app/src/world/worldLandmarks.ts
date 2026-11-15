import { BLOCK } from './blocks';
import type { DimensionId } from './terrainGen';

const CHUNK_SIZE = 16;
const SEA_LEVEL = 42;
const SPAWN_Y = 49;

export type RegionCategory = 'capital' | 'villages' | 'anime' | 'bosses' | 'biomes' | 'dimensions';
export type RegionUniverse = 'Tensura' | 'Naruto' | 'Bleach' | 'Dragon Ball' | 'One Piece' | 'Horizon' | 'Nether' | 'End';
export type LandmarkArchetype =
  | 'capital'
  | 'village'
  | 'anime_konoha'
  | 'anime_seireitei'
  | 'anime_arena'
  | 'anime_harbor'
  | 'dragon_roost'
  | 'shrine'
  | 'lagoon'
  | 'nether_citadel'
  | 'end_island';

export type LandmarkTheme = 'oak' | 'spruce' | 'sand' | 'cherry' | 'crimson' | 'ice' | 'gold' | 'void';

export interface WorldRegionDef {
  id: string;
  index: number;
  name: string;
  category: RegionCategory;
  universe: RegionUniverse;
  dim: DimensionId;
  cx: number;
  cz: number;
  baseY: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  radius: number;
  archetype: LandmarkArchetype;
  theme: LandmarkTheme;
  danger: 1 | 2 | 3 | 4 | 5;
  bossSpecies?: string;
  bossTitle?: string;
  desc: string;
}

interface RawSeed {
  id: string;
  name: string;
  category: RegionCategory;
  universe: RegionUniverse;
  dim: DimensionId;
  cx: number;
  cz: number;
  baseY: number;
  archetype: LandmarkArchetype;
  theme: LandmarkTheme;
  danger: 1 | 2 | 3 | 4 | 5;
  bossSpecies?: string;
  bossTitle?: string;
  desc: string;
  exactPos?: { x: number; y: number; z: number; yaw: number; pitch: number };
}

const CAPITAL_SEEDS: RawSeed[] = [
  { id: 'cap_plaza', name: 'Rimuru Başkenti — Merkez Meydan', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: 0, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'gold', danger: 1, desc: 'Jura Tempest Federasyonu ana Waystone çeşmesi ve altın bulvarlar.', exactPos: { x: 0.5, y: SPAWN_Y, z: 7.5, yaw: 0, pitch: -0.05 } },
  { id: 'cap_mansion', name: 'Rimuru Kraliyet Köşkü & Kütüphane', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: -10, cz: -3, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Büyü masası, kitaplıklar ve üst kat seyir balkonu.', exactPos: { x: -10.5, y: SPAWN_Y, z: -1.5, yaw: 0, pitch: -0.05 } },
  { id: 'cap_smith', name: 'Kaijin Demirci & Örs Atölyesi', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 10, cz: -3, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Efsanevi kılıç dövme ocağı, lav potası ve çifte örs.', exactPos: { x: 10.5, y: SPAWN_Y, z: -1.5, yaw: 0, pitch: -0.05 } },
  { id: 'cap_guild', name: 'Maceracı Loncası & Görev Köşkü', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: -10, cz: 7, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'spruce', danger: 1, desc: 'Lonca görev çanı, kamp ateşi ve üretim köşkü.', exactPos: { x: -10.5, y: SPAWN_Y, z: 2.5, yaw: Math.PI, pitch: -0.05 } },
  { id: 'cap_bazaar', name: 'Tempest Renkli Pazar Çarşısı', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 9, cz: 6, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'gold', danger: 1, desc: 'Kırmızı-mavi tenteli pazar tezgahları ve tüccarlar.', exactPos: { x: 9.5, y: SPAWN_Y, z: 2.5, yaw: Math.PI, pitch: -0.05 } },
  { id: 'cap_harbor', name: 'Güney Kristal Yüzme Lagünü & İskele', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: 24, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'sand', danger: 1, desc: 'Başkent yüzme lagünü, balıkçı iskelesi ve fenerli sahil.', exactPos: { x: 0.5, y: SPAWN_Y + 0.6, z: 20.5, yaw: Math.PI, pitch: -0.10 } },
  { id: 'cap_arena', name: 'Batı Kolezyum Boss & Okçuluk Arenası', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: -22, cz: -13, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'crimson', danger: 3, bossSpecies: 'orc_disaster', bossTitle: '★ Orc Disaster Geld', desc: 'Çanı çalarak 5 dalga Boss mücadelesi başlatabileceğiniz kolezyum.', exactPos: { x: -15.5, y: SPAWN_Y, z: -12.5, yaw: Math.PI * 0.5, pitch: -0.05 } },
  { id: 'cap_clocktower', name: 'Kuzey Saat Kulesi & Elitra Zirvesi', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: -22, baseY: SPAWN_Y + 11, archetype: 'capital', theme: 'gold', danger: 1, desc: 'Elitra atlama tahtası, gökyüzü sandığı ve panoramik kule çatısı.', exactPos: { x: 0.5, y: SPAWN_Y + 12, z: -20.5, yaw: Math.PI, pitch: -0.15 } },
  { id: 'cap_labyrinth', name: 'Ramiris Kadim Yeraltı Labirenti', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: -16, baseY: SPAWN_Y - 14, archetype: 'capital', theme: 'void', danger: 3, bossSpecies: 'oni_warlord', bossTitle: '★ Labirent Muhafızı', desc: 'Başkentin altındaki ametist sütunlu zindan ve hazine sandıkları.', exactPos: { x: -3.5, y: SPAWN_Y - 13, z: -19.5, yaw: Math.PI, pitch: -0.04 } },
  { id: 'cap_nether_gate', name: 'Doğu Kiraz Mabedi & Nether Kapısı', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 19, cz: 8, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'cherry', danger: 2, desc: 'Kiraz Torii kapısı ve aktif obsidyen Nether geçidi.', exactPos: { x: 18.5, y: SPAWN_Y, z: 8.5, yaw: -Math.PI * 0.5, pitch: -0.05 } },
  { id: 'cap_farm', name: 'Tempest Bereket Tarlası & Bahçe', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 9, cz: 12, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Sulamalı buğday tarlası ve kompost üretim bahçesi.', exactPos: { x: 5.5, y: SPAWN_Y, z: 12.5, yaw: -Math.PI * 0.5, pitch: -0.05 } },
  { id: 'cap_stables', name: 'Kraliyet Binek Ahırları (Ranga & Atlar)', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 18, cz: -5, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Binek atlar ve saman balyalarıyla çevrili kraliyet ahırı.', exactPos: { x: 14.5, y: SPAWN_Y, z: -4.5, yaw: -Math.PI * 0.5, pitch: -0.05 } },
  { id: 'cap_roof_view', name: 'Rimuru Köşkü Üst Kat Balkonu', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: -10, cz: -2, baseY: SPAWN_Y + 3, archetype: 'capital', theme: 'spruce', danger: 1, desc: 'Kraliyet caddesine bakan ahşap seyir balkonu.', exactPos: { x: -10.5, y: SPAWN_Y + 4, z: -3.5, yaw: Math.PI, pitch: 0.04 } },
  { id: 'cap_slime_pad', name: 'Saat Kulesi Slime Zıplama Meydanı', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: -16, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Saat kulesi girişindeki dev zümrüt Slime trambolini.', exactPos: { x: 0.5, y: SPAWN_Y, z: -13.5, yaw: 0, pitch: 0.12 } },
  { id: 'cap_west_gate', name: 'Başkent Batı Sınır Yolu', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: -26, cz: 0, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 1, desc: 'Batı ormanlarına ve komşu köylere açılan ana cadde.', exactPos: { x: -16.5, y: SPAWN_Y, z: 0.5, yaw: Math.PI * 0.5, pitch: -0.04 } },
  { id: 'cap_outskirts', name: 'Jura Av Sınırı (Düşman & Ejderha Bölgesi)', category: 'capital', universe: 'Tensura', dim: 'overworld', cx: 0, cz: 58, baseY: SPAWN_Y - 1, archetype: 'capital', theme: 'oak', danger: 2, desc: 'Başkent korumasının hemen dışı — yaratık, Unique ve Ejderha av sahası.', exactPos: { x: 0.5, y: SPAWN_Y, z: 58.5, yaw: Math.PI, pitch: -0.04 } },
];

// Ring coordinates helper so all 184 non-capital regions stay >= 90 blocks apart
function polarCoord(ringIdx: number, slotIdx: number, totalSlots: number, baseDist: number): [number, number] {
  const angle = (slotIdx / totalSlots) * Math.PI * 2 + ringIdx * 0.37;
  const dist = baseDist + (slotIdx % 3) * 34;
  const cx = Math.round((Math.cos(angle) * dist) / 16) * 16;
  const cz = Math.round((Math.sin(angle) * dist) / 16) * 16;
  return [cx, cz];
}

const VILLAGE_DEFS: Array<[string, string, RegionUniverse, LandmarkTheme, 1 | 2 | 3, string]> = [
  ['vil_east_meadow', 'Doğu Çayır Komşu Köyü', 'Horizon', 'oak', 1, 'Başkentin hemen doğusunda tüccar ve çiftçi köyü.'],
  ['vil_west_oak', 'Batı Meşe Oduncu Köyü', 'Horizon', 'oak', 1, 'Meşe ormanı kıyısında marangoz ve demirci evleri.'],
  ['vil_north_pine', 'Kuzey Çam Avcı Köyü', 'Horizon', 'spruce', 2, 'Kuzey yamaçlarında sıcak şömineli ahşap evler.'],
  ['vil_south_harbor', 'Güney Sahil Balıkçı Köyü', 'Horizon', 'sand', 1, 'İskele, kumsal ve taze balık tezgahlarıyla dolu kıyı köyü.'],
  ['vil_cherry_brook', 'Kiraz Çiçeği Komşu Köyü', 'Horizon', 'cherry', 1, 'Pembe kiraz ağaçları altında huzurlu çay evleri.'],
  ['vil_blumund', 'Blumund Sınır Kasabası', 'Tensura', 'oak', 1, 'Özgür Lonca şubesi ve ticaret kervanlarının uğrak noktası.'],
  ['vil_goblin_outpost', 'Gobta Kurt Binici Köyü', 'Tensura', 'spruce', 1, 'Fırtına kurtları ve dost goblin muhafızların yerleşimi.'],
  ['vil_lake_fisher', 'Gümüş Göl İskele Köyü', 'Horizon', 'oak', 1, 'Yüzme gölü kıyısında fenerli ahşap iskele köyü.'],
  ['vil_dwargon', 'Dwargon Demir Krallığı Kapısı', 'Tensura', 'gold', 2, 'Cüce ustaların devasa taş-altın zırh ve silah çarşısı.'],
  ['vil_ingrassia', 'Ingrassia Kraliyet Akademisi', 'Tensura', 'gold', 1, 'Büyü kütüphaneleri ve cam kubbeli akademi meydanı.'],
  ['vil_sarion', 'Sarion Elf Hanedanı Korusu', 'Tensura', 'cherry', 2, 'Kadim ağaçlar arasında büyücü elflerin zarif kasabası.'],
  ['vil_eurazania', 'Eurazania Canavar Krallığı', 'Tensura', 'sand', 2, 'Carrion’un savaşçı klanlarının sıcak savan şehri.'],
  ['vil_lubelius', 'Lubelius Kutsal Katedral Kenti', 'Tensura', 'gold', 2, 'Tapınak şövalyeleri ve mermer meydanlı kutsal şehir.'],
  ['vil_falmuth', 'Yeni Falmuth(Youm) Ticaret Kenti', 'Tensura', 'oak', 2, 'Kral Youm yönetiminde yeniden kurulan bereketli şehir.'],
  ['vil_siltrosso', 'Siltrosso Altın Fener Kasabası', 'Tensura', 'gold', 2, 'Altın kubbeli tüccar konakları ve sanat meydanı.'],
  ['vil_raja', 'Raja Kristal Göl Krallığı', 'Tensura', 'cherry', 2, 'Berrak suların kıyısında şifacıların kurduğu vaha kenti.'],
  ['vil_ulgrasia', 'Ulgrasia Batı Konsey Şehri', 'Tensura', 'oak', 2, 'Batı uluslarının buluştuğu geniş taş meydanlı başkent.'],
  ['vil_jistav', 'Jistav Surları Kasabası', 'Tensura', 'crimson', 3, 'Eski kale kalıntıları üzerinde yükselen gizemli pazar.'],
  ['vil_emerald_vale', 'Zümrüt Vadi Çiftçi Köyü', 'Horizon', 'oak', 1, 'Yemyeşil vadide yel değirmeni ve buğday ambarları.'],
  ['vil_amber_oasis', 'Kehribar Vaha Kervansarayı', 'Horizon', 'sand', 2, 'Çöl ortasında serin su kuyusu ve kumtaşı han.'],
  ['vil_frost_fjord', 'Buzul Fiyort Kuzey Köyü', 'Horizon', 'ice', 2, 'Karlı zirveler altında fenerli ladin kulübeler.'],
  ['vil_red_mesa', 'Kızıl Kanyon Madenci Kasabası', 'Horizon', 'sand', 2, 'Altın madenleri ve terakota evleriyle ünlü kanyon köyü.'],
  ['vil_birch_glade', 'Beyaz Huş Arıcılar Köyü', 'Horizon', 'oak', 1, 'Bal üreticileri ve çiçek bahçeleriyle çevrili köy.'],
  ['vil_savanna_sun', 'Güneş Savanı Akasya Köyü', 'Horizon', 'sand', 2, 'Turuncu akasya çatılı yüksek gözetleme evleri.'],
  ['vil_amethyst_town', 'Ametist Kristal Maden Köyü', 'Horizon', 'void', 2, 'Mor kristal fenerlerle süslü taş ustaları yerleşimi.'],
  ['vil_copper_bell', 'Bakır Çan Saatçi Kasabası', 'Horizon', 'gold', 1, 'Oksitlenmiş bakır çatılı atölyeler ve meydan çanı.'],
  ['vil_windmill_hill', 'Yeldeğirmeni Tepesi Köyü', 'Horizon', 'oak', 1, 'Rüzgarlı tepede ekmek fırınları ve saman balyaları.'],
  ['vil_lantern_bay', 'Yüzen Fenerler Koyu Köyü', 'Horizon', 'cherry', 1, 'Gece parlayan su fenerleriyle ünlü romantik kıyı kasabası.'],
  ['vil_iron_bridge', 'Demir Köprü Muhafız Kasabası', 'Horizon', 'spruce', 2, 'Nehir geçişini koruyan zırhlı golem ve muhafız köyü.'],
  ['vil_star_observatory', 'Yıldız Rasathanesi Köyü', 'Horizon', 'gold', 2, 'Yüksek tepede teleskop kulesi ve simya bilginleri.'],
  ['vil_bamboo_spring', 'Sıcak Kaplıca Dağ Köyü', 'Horizon', 'cherry', 1, 'Buharlı şifalı su havuzları ve dinlenme köşkleri.'],
  ['vil_coral_port', 'Mercan İskelesi Denizci Kasabası', 'Horizon', 'sand', 1, 'Yüzücüler ve kaşifler için mavi lagün limanı.'],
  ['vil_snow_lantern', 'Kar Feneri Kızağı Köyü', 'Horizon', 'ice', 2, 'Toz kar tepeleri yanında sıcak kamp ateşli meydan.'],
  ['vil_mossy_ruin_vil', 'Yosunlu Kemer Arkeolog Köyü', 'Horizon', 'oak', 2, 'Antik taş kemerleri inceleyen kaşiflerin kamp kasabası.'],
  ['vil_golden_wheat', 'Altın Başak Hasat Kasabası', 'Horizon', 'gold', 1, 'Büyük tahıl siloları ve çiftçi festivali meydanı.'],
  ['vil_wolf_ridge', 'Bozkurt Sırtı Korucu Köyü', 'Horizon', 'spruce', 2, 'Evcil kurtlar ve okçu korucuların orman karakolu.'],
  ['vil_silk_road', 'İpek Yolu Doğu Kervan Şehri', 'Horizon', 'sand', 2, 'Baharat, kumaş ve nadir maden takas merkezi.'],
  ['vil_cloud_terrace', 'Bulut Terası Yayla Köyü', 'Horizon', 'spruce', 2, 'Yüksek rakımlı çam yaylasında taş temel evler.'],
  ['vil_lotus_pond', 'Nilüfer Göleti Bilge Köyü', 'Horizon', 'cherry', 1, 'Su üstü yürüyüş köprüleri ve kitap evleri.'],
  ['vil_obsidian_watch', 'Obsidyen Sınır Kalesi Köyü', 'Horizon', 'crimson', 3, 'Ejderha vadilerine yakın tahkim edilmiş şövalye kasabası.'],
  ['vil_maple_hearth', 'Kızıl Çınar Ocak Köyü', 'Horizon', 'oak', 1, 'Büyük ortak şömine etrafında kurulmuş dost canlısı köy.'],
  ['vil_pearl_cove', 'İnci Koyu Dalgıçlar Köyü', 'Horizon', 'sand', 1, 'Derin suya dalış ve yüzme eğitimi verilen sahil köyü.'],
  ['vil_thunder_pass', 'Yıldırım Geçidi Demir Köyü', 'Horizon', 'spruce', 2, 'Dağ geçidinde paratonerli taş kuleler ve han.'],
  ['vil_aurora_haven', 'Kutup Işığı Kuzey Sığınağı', 'Horizon', 'ice', 2, 'Uzak kuzeyin en parlak fenerli sıcak sığınak kasabası.'],
];

const ANIME_DEFS: Array<[string, string, RegionUniverse, LandmarkArchetype, LandmarkTheme, 1 | 2 | 3 | 4, string, string?, string?]> = [
  // Tensura Landmarks (6)
  ['ani_jura_heart', 'Büyük Jura Ormanı Kalbi', 'Tensura', 'shrine', 'oak', 2, 'Dryad Treyni’nin koruduğu kadim orman sunağı.'],
  ['ani_veldora_cave', 'Veldora Mühür Mağarası Tapınağı', 'Tensura', 'dragon_roost', 'void', 4, 'Fırtına Ejderhası Veldora’nın kristalleşmiş büyü sunağı.', 'storm_dragon', '★ Veldora Tempest (Fırtına Ejderhası)'],
  ['ani_ramiris_lab', 'Ramiris 100 Katlı Labirent Girişi', 'Tensura', 'anime_arena', 'gold', 3, 'Peri Kraliçesi Ramiris’in hazine ve düello arenası.'],
  ['ani_walpurgis', 'Walpurgis İblis Lordları Salonu', 'Tensura', 'dragon_roost', 'crimson', 4, 'Sekiz Yıldız İblis Lordu’nun toplandığı karanlık ziyafet tahtı.', 'oni_warlord', '★ Guy Crimson (Kızıl İblis Lordu)'],
  ['ani_ice_continent', 'Buz Kıtası Beyaz Saray', 'Tensura', 'anime_seireitei', 'ice', 4, 'Velzard ve Guy Crimson’un donmuş kristal kalesi.', 'ice_dragon', '★ Velzard (Beyaz Buz Ejderhası)'],
  ['ani_milim_star', 'Yıldız Ejderha Sarayı (Milim)', 'Tensura', 'anime_konoha', 'cherry', 3, 'Milim Nava’nın gökyüzü tapınağı ve bal hazinesi.'],

  // Naruto Universe (12)
  ['ani_konoha_gate', 'Konoha — Gizli Yaprak Köyü Kapısı', 'Naruto', 'anime_konoha', 'oak', 2, 'İkonik kırmızı-yeşil Konoha giriş kapısı, Ichiraku ve eğitim alanı.'],
  ['ani_hokage_plaza', 'Konoha — Hokage Kayası & Dojo', 'Naruto', 'anime_konoha', 'crimson', 2, 'Yedi Hokage’nin mirasını taşıyan Büyük Shinobi Konağı.'],
  ['ani_chunin_arena', 'Chunin Sınavı Düello Arenası', 'Naruto', 'anime_arena', 'oak', 3, 'Genin ve Jonin savaşçılarının kozlarını paylaştığı taş ring.', 'rogue_shinobi', '★ Gaara & Rock Lee Düello Ustası'],
  ['ani_valley_end', 'Son Vadi (Valley of the End)', 'Naruto', 'lagoon', 'oak', 4, 'Naruto ve Sasuke’nin çarpıştığı dev şelale ve yüzme gölü.', 'rogue_shinobi', '★ Uchiha Madara (Efsanevi Shinobi)'],
  ['ani_mount_myoboku', 'Myoboku Kurbağa Bilge Dağı', 'Naruto', 'shrine', 'cherry', 2, 'Senjutsu (Doğa Çakrası) pınarları ve bilge tapınağı.'],
  ['ani_sunagakure', 'Sunagakure — Gizli Kum Köyü', 'Naruto', 'anime_konoha', 'sand', 3, 'Kazekage kubbesi ve çöl fırtınası savunma surları.'],
  ['ani_kirigakure', 'Kirigakure — Sisli Su Köyü', 'Naruto', 'lagoon', 'ice', 3, 'Yedi Kılıç Ustası’nın su üstü çakra eğitim koyu.'],
  ['ani_kumogakure', 'Kumogakure — Yıldırım Bulut Köyü', 'Naruto', 'anime_konoha', 'gold', 3, 'Raikage kulesi ve yıldırım çakra sütunları.'],
  ['ani_iwagakure', 'Iwagakure — Kayalık Taş Köyü', 'Naruto', 'anime_konoha', 'spruce', 3, 'Tsuchikage taş köprüleri ve kanyon kalesi.'],
  ['ani_amegakure', 'Amegakure — Yağmur Kulesi', 'Naruto', 'anime_seireitei', 'void', 4, 'Pain’in gözetlediği yüksek metalik kule ve su terası.', 'rogue_shinobi', '★ Pain (Altı Yolun Rikudo’su)'],
  ['ani_uchiha_shrine', 'Uchiha Nakano Gizli Tapınağı', 'Naruto', 'anime_konoha', 'crimson', 3, 'Sharingan taş tableti ve kırmızı Torii kapıları.'],
  ['ani_akatsuki_lair', 'Akatsuki Mühür Mağarası', 'Naruto', 'dragon_roost', 'crimson', 4, 'Kızıl bulut pelerinli savaşçıların gizli karargahı.', 'rogue_shinobi', '★ Uchiha Itachi (Tsukuyomi Ustası)'],

  // Bleach Universe (11)
  ['ani_seireitei_hq', 'Seireitei — Gotei 13 Başkomutanlığı', 'Bleach', 'anime_seireitei', 'gold', 3, 'Soul Society beyaz taş surları ve 1. Bölük Kaptan Salonu.'],
  ['ani_sokyoku_hill', 'Sokyoku Tepesi (Ichigo Kurtarış)', 'Bleach', 'anime_arena', 'crimson', 4, 'Zanpakuto mühür anıtı ve yüksek düello platosu.', 'hollow_menos', '★ Kaptan Byakuya Kuchiki'],
  ['ani_urahara_shop', 'Karakura — Urahara Dükkanı', 'Bleach', 'anime_konoha', 'oak', 2, 'Kisuke Urahara’nın gizli yeraltı eğitim sahası ve dükkanı.'],
  ['ani_kuchiki_manor', 'Kuchiki Klanı Kiraz Malikanesi', 'Bleach', 'anime_konoha', 'cherry', 2, 'Senbonzakura yapraklarıyla bezeli asilzade bahçesi.'],
  ['ani_zaraki_pit', '11. Bölük Zaraki Savaş Meydanı', 'Bleach', 'anime_arena', 'spruce', 4, 'Saf Reiatsu çarpışmaları için yapılmış taş gladyatör arenası.', 'oni_warlord', '★ Kenpachi Zaraki'],
  ['ani_las_noches', 'Las Noches — Espada Kubbe Sarayı', 'Bleach', 'anime_seireitei', 'void', 4, 'Aizen ve 10 Espada’nın beyaz-siyah sütunlu devasa sarayı.', 'hollow_menos', '★ Ulquiorra Cifer (Segunda Etapa)'],
  ['ani_hueco_dunes', 'Hueco Mundo Kuvars Çölü', 'Bleach', 'shrine', 'sand', 3, 'Ebedi hilal altında kristal ağaçlar ve Menos kalıntıları.'],
  ['ani_reiokyu', 'Reiokyu — Ruh Kralı Gökyüzü Sarayı', 'Bleach', 'anime_seireitei', 'gold', 4, 'Sıfırıncı Bölük (Squad Zero) altın mermer platformu.'],
  ['ani_wandenreich', 'Wandenreich Buz İmparatorluğu', 'Bleach', 'anime_seireitei', 'ice', 4, 'Quincy şövalyelerinin mavi buz-kuvars kalesi.', 'hollow_menos', '★ Yhwach (Her Şeyi Gören)'],
  ['ani_senkaimon', 'Senkaimon Boyut Geçidi Sunağı', 'Bleach', 'shrine', 'crimson', 2, 'Ruh Toplumuna açılan geleneksel kelebek geçidi.'],
  ['ani_dangai_hall', 'Dangai Son Getsuga Koridoru', 'Bleach', 'anime_arena', 'void', 4, 'Zamanın farklı aktığı Mugetsu eğitim boyutu.'],

  // Dragon Ball Universe (11)
  ['ani_tenkaichi', 'Tenkaichi Budokai Turnuva Arenası', 'Dragon Ball', 'anime_arena', 'gold', 3, 'Dünya Dövüş Sanatları Turnuvası beyaz karo ringi ve tribünleri!'],
  ['ani_kame_house', 'Kame House — Usta Roshi Adası', 'Dragon Ball', 'lagoon', 'cherry', 1, 'Turkuaz okyanus ortasında pembe kulübe, kumsal ve yüzme denizi!'],
  ['ani_kami_lookout', 'Kami Gözetleme Kulesi (Gökyüzü)', 'Dragon Ball', 'anime_arena', 'gold', 2, 'Gökyüzüne yakın beyaz mermer tapınak ve Senzu fasulyesi sandığı.'],
  ['ani_korin_tower', 'Korin Kutsal Sütun Kulesi', 'Dragon Ball', 'shrine', 'gold', 2, 'Bulutların üstüne yükselen kutsal dövüş sanatları mabedi.'],
  ['ani_hyperbolic_chamber', 'Zaman ve Ruh Odası (1 Gün = 1 Yıl)', 'Dragon Ball', 'anime_seireitei', 'ice', 3, 'Saf beyaz sonsuzluk boyutu ve Super Saiyan eğitim tapınağı.'],
  ['ani_king_kai', 'Kuzey Kaio Gezegeni Eğitim Tepesi', 'Dragon Ball', 'shrine', 'oak', 2, '10x yerçekimi eğitimi, Kaio-ken ve Genki Dama çimenliği.'],
  ['ani_namek_village', 'Yeni Namek — Ejderha Topları Köyü', 'Dragon Ball', 'lagoon', 'oak', 3, 'Zümrüt sular ve mavi Ajisa ağaçları arasındaki Namek evleri.'],
  ['ani_capsule_corp', 'Batı Şehri — Capsule Corp', 'Dragon Ball', 'anime_seireitei', 'gold', 2, 'Bulma ve Vegeta’nın yerçekimi odası ve teknoloji merkezi.'],
  ['ani_cell_games', 'Cell Oyunları Turnuva Ringi', 'Dragon Ball', 'anime_arena', 'spruce', 4, 'Gohan’ın SSJ2 uyandığı ikonik yeşil-beyaz taş dövüş ringi!', 'oni_warlord', '★ Kusursuz Cell (Solar Kamehameha)'],
  ['ani_mount_paozu', 'Paozu Dağı — Goku’nun Evi', 'Dragon Ball', 'village', 'oak', 1, 'Dört Yıldızlı Ejderha Topu hatırasını taşıyan dağ evi ve nehir.'],
  ['ani_top_stage', 'Güç Turnuvası (Evrenler Arenası)', 'Dragon Ball', 'dragon_roost', 'void', 4, 'Ultra İçgüdü Goku ve Jiren’in çarpıştığı Kachi Katchin ringi!', 'oni_warlord', '★ Jiren (Gri Savaşçı)'],

  // One Piece Universe (12)
  ['ani_foosha_vil', 'Foosha Yel Değirmeni Köyü (Doğu Mavi)', 'One Piece', 'anime_harbor', 'oak', 1, 'Luffy’nin maceraya yelken açtığı liman, Makino’nun hanı ve gemi!'],
  ['ani_sunny_bay', 'Thousand Sunny Demirleme Koyu', 'One Piece', 'anime_harbor', 'gold', 2, 'Hasır Şapka Korsanları’nın aslan başlı yelkenli gemisi ve yüzme koyu!'],
  ['ani_baratie', 'Baratie Yüzen Deniz Restoranı', 'One Piece', 'anime_harbor', 'spruce', 2, 'Sanji’nin mutfağı, deniz üstü güverte ve Mihawk düello iskelesi.'],
  ['ani_alabasta', 'Alabasta — Alubarna Çöl Sarayı', 'One Piece', 'anime_konoha', 'sand', 3, 'Prenses Vivi’nin kumtaşı sarayı ve vaha çeşmesi.'],
  ['ani_skypiea', 'Skypiea — Gökyüzü Altın Çan Adası', 'One Piece', 'shrine', 'gold', 3, 'Beyaz bulut denizi üzerinde Shandora altın çan tapınağı!'],
  ['ani_water7', 'Water 7 — Su Kanalları Tersanesi', 'One Piece', 'anime_harbor', 'ice', 2, 'Franky’nin gemi inşa kızakları ve yüzülebilir mavi kanallar.'],
  ['ani_enies_lobby', 'Enies Lobby — Adalet Kapısı', 'One Piece', 'anime_seireitei', 'gold', 4, 'CP9 kulesi ve Hasır Şapkaların bayrak yaktığı mahkeme köprüsü!'],
  ['ani_sabaody', 'Sabaody Köpük Takımadası', 'One Piece', 'lagoon', 'cherry', 3, 'Dev mangrov kökleri, Rayleigh’in mekanı ve Yeni Dünya limanı.'],
  ['ani_marineford', 'Marineford — Denizci Karargah Meydanı', 'One Piece', 'anime_harbor', 'ice', 4, 'Beyazsakal ve Amirallerin çarpıştığı hilal koy ve dev kale!', 'oni_warlord', '★ Amiral Akainu (Magma Yumruğu)'],
  ['ani_dressrosa', 'Dressrosa — Corrida Kolezyumu', 'One Piece', 'anime_arena', 'sand', 4, 'Mera Mera no Mi için kurulan su çevrili gladyatör kolezyumu!'],
  ['ani_wano_capital', 'Wano Ülkesi — Çiçek Başkenti', 'One Piece', 'anime_konoha', 'cherry', 4, 'Samuray katanaları, kiraz ağaçları ve Kozuki kalesi!'],
  ['ani_laugh_tale', 'Laugh Tale — Korsanlar Kralı Adası', 'One Piece', 'anime_harbor', 'gold', 4, 'Grand Line’ın sonundaki efsanevi One Piece hazine adası!'],
];

const BOSS_DEFS: Array<[string, string, RegionUniverse, LandmarkTheme, 3 | 4 | 5, string, string, string]> = [
  ['boss_crimson_drake', 'Kızıl Ateş Ejderhası Krateri', 'Horizon', 'crimson', 4, 'fire_dragon', '★ Ignis — Kızıl Ateş Ejderhası', 'Lav sütunlarıyla çevrili kadim ateş ejderhası yuvası.'],
  ['boss_frost_wyrm', 'Buzul Ejderhası Kristal Zirvesi', 'Horizon', 'ice', 4, 'ice_dragon', '★ Boreas — Ebedi Buz Ejderhası', 'Donmuş taht üzerinde kanat çırpan buzul ejderhası.'],
  ['boss_storm_dragon', 'Gök Gürültüsü Ejderha Kulesi', 'Horizon', 'gold', 5, 'storm_dragon', '★ Tempestia — Yıldırım Ejderhası', 'Şimşek çakan bulut sütunları arasındaki fırtına ejderhası.'],
  ['boss_kurama_seal', 'Kurama — Dokuz Kuyruk Sunağı', 'Naruto', 'crimson', 5, 'fire_dragon', '★ Kurama (Kyubi Bijuu)', 'Devasa çakra mühür kapısı ve Bijudama çarpışma alanı.'],
  ['boss_susanoo_ridge', 'Madara Mükemmel Susanoo Vadisi', 'Naruto', 'void', 5, 'rogue_shinobi', '★ Uchiha Madara (Rinnegan)', 'Meteor kraterleri ortasında efsanevi savaş alanı.'],
  ['boss_kaguya_palace', 'Kaguya Başlangıç Boyutu Sunağı', 'Naruto', 'ice', 5, 'rogue_shinobi', '★ Otsutsuki Kaguya', 'Kemik külü ve boyut kapılarıyla dolu kadim sunak.'],
  ['boss_obito_juubi', 'On Kuyruk (Juubi) Krateri', 'Naruto', 'crimson', 5, 'oni_warlord', '★ Juubi Jinchuriki Obito', 'Dördüncü Büyük Shinobi Savaşı’nın merkez krateri.'],
  ['boss_orochimaru_den', 'Orochimaru Yılan Tapınağı', 'Naruto', 'void', 4, 'rogue_shinobi', '★ Efsanevi Sannin Orochimaru', 'Kusanagi kılıcı ve yasak parşömen mahzeni.'],
  ['boss_aizen_throne', 'Hogyoku Aizen Gökyüzü Tahtı', 'Bleach', 'void', 5, 'hollow_menos', '★ Sosuke Aizen (Hogyoku Evrimi)', 'Kurohitsugi ve Kyoka Suigetsu illüzyon tahtı.'],
  ['boss_grimmjow_ring', 'Grimmjow Pantera Çöl Arenası', 'Bleach', 'ice', 4, 'hollow_menos', '★ Espada #6 Grimmjow', 'Gran Rey Cero izleriyle dolu Hueco Mundo düello ringi.'],
  ['boss_starrk_pillars', 'Primera Espada Starrk Sütunları', 'Bleach', 'void', 4, 'hollow_menos', '★ Coyote Starrk (Los Lobos)', 'Ruh kurtlarıyla korunan yalnız sütunlar.'],
  ['boss_yamamoto_ash', 'Zanka no Tachi Küller Vadisi', 'Bleach', 'crimson', 5, 'fire_dragon', '★ Kaptan-Komutan Yamamoto', 'Güneşin çekirdeği kadar sıcak kılıç mührü alanı.'],
  ['boss_ichigo_vasto', 'Vasto Lorde Hollow Çukuru', 'Bleach', 'crimson', 5, 'hollow_menos', '★ Tam Hollow Ichigo', 'Las Noches kubbesi üstündeki yıkıcı Cero arenası.'],
  ['boss_frieza_crater', 'İmparator Frieza İniş Krateri', 'Dragon Ball', 'void', 5, 'oni_warlord', '★ Altın Frieza (Death Ball)', 'Gezegen yıkıcı süpernova enerjisiyle kavrulmuş krater.'],
  ['boss_broly_wastes', 'Efsanevi Super Saiyan Broly Vadisi', 'Dragon Ball', 'gold', 5, 'oni_warlord', '★ Efsanevi Broly (Tam Güç)', 'Yeşil Ki patlamalarıyla parçalanmış volkanik vadi.'],
  ['boss_kid_buu', 'Majin Buu Kaioshin Gezegeni', 'Dragon Ball', 'cherry', 5, 'oni_warlord', '★ Kid Buu (Saf Yıkım)', 'Genki Dama ile korunan kutsal Kaioshin savaş alanı.'],
  ['boss_beerus_temple', 'Yıkım Tanrısı Beerus Tapınağı', 'Dragon Ball', 'void', 5, 'storm_dragon', '★ Lord Beerus (Hakai)', 'Mor Hakai kristalleri ve Whis’in asasıyla mühürlü tapınak.'],
  ['boss_shenron_altar', 'Ebedi Ejderha Shenron Çağrı Sunağı', 'Dragon Ball', 'gold', 4, 'storm_dragon', '★ Kutsal Ejderha Shenron', 'Yedi Ejderha Topu birleştiğinde göğü karartan altın sunak!'],
  ['boss_goku_black', 'Kızıl Yırtık — Goku Black Kalesi', 'Dragon Ball', 'crimson', 5, 'rogue_shinobi', '★ Super Saiyan Rosé Goku Black', 'İlahi tırpan boyut yırtığı ve gelecek harabesi.'],
  ['boss_kaido_onigashima', 'Onigashima — İmparator Kaido Kubbesi', 'One Piece', 'crimson', 5, 'storm_dragon', '★ Yonko Kaido (Gök Ejderhası)', 'Yıldırım ve Bolo Breath saçan dev kafatası kubbesi!'],
  ['boss_katakuri_mirror', 'Katakuri Ayna Dünyası Arenası', 'One Piece', 'cherry', 4, 'oni_warlord', '★ Charlotte Katakuri (Gözlem Haki)', 'Kırık aynalar ve Kral Haki şimşekleriyle dolu zindan.'],
  ['boss_mihawk_castle', 'Kuraigana — Şahin Göz Mihawk Şatosu', 'One Piece', 'void', 5, 'rogue_shinobi', '★ Dracule Mihawk (Kara Kılıç Yoru)', 'Dünyanın en güçlü kılıç ustasının gotik şatosu!'],
  ['boss_blackbeard_island', 'Hachinosu — Karasakal Korsan Adası', 'One Piece', 'void', 5, 'oni_warlord', '★ Yonko Marshall D. Teach', 'Karanlık ve Deprem meyvelerinin çarpıştığı korsan kalesi.'],
  ['boss_doflamingo_cage', 'Kuş Kafesi — Doflamingo Sarayı', 'One Piece', 'gold', 4, 'rogue_shinobi', '★ Donquixote Doflamingo', 'Uyanmış iplik sütunlarıyla çevrili kraliyet tepesi.'],
  ['boss_big_mom_chateau', 'Whole Cake — Big Mom Ruh Şatosu', 'One Piece', 'cherry', 5, 'fire_dragon', '★ Yonko Big Mom (Prometheus & Zeus)', 'Ateş güneşi ve fırtına bulutuyla korunan tatlı şatosu.'],
  ['boss_enel_ark', 'Ark Maxim — Yıldırım Tanrısı Enel', 'One Piece', 'gold', 4, 'storm_dragon', '★ Tanrı Enel (200 Milyon Volt)', 'Altın iletken sütunlar arasında şimşek yağdıran sunak.'],
  ['boss_ifrit_caldera', 'Ateş Ruhu Ifrit Yanardağı', 'Tensura', 'crimson', 4, 'fire_dragon', '★ Üst Ruh Ifrit', 'Shizu’nun miras bıraktığı alev sütunları kalderası.'],
  ['boss_charybdis_abyss', 'Gökyüzü Felaketi Charybdis Koyu', 'Tensura', 'ice', 5, 'storm_dragon', '★ Felaket Charybdis', 'Büyü paraziti zırhlı dev uçan ejderha canavarı koyu.'],
  ['boss_clayman_stage', 'Kukla Ustası Clayman Zindanı', 'Tensura', 'void', 4, 'hollow_menos', '★ Uyanmış Clayman', 'Mistik kuklalar ve ruh kristalleriyle korunan zindan.'],
  ['boss_hinata_colosseum', 'Kutsal Şövalye Hinata Meydanı', 'Tensura', 'gold', 5, 'rogue_shinobi', '★ Hinata Sakaguchi (Melt Slash)', 'Yedi Gökkuşağı Kılıç darbesinin sınandığı şövalye ringi.'],
  ['boss_feldway_gate', 'Hayalet Kral Feldway Yıldız Kapısı', 'Tensura', 'gold', 5, 'hollow_menos', '★ Başmelek Feldway', 'İlahi kalkanlar ve boyut kapısıyla korunan son kale.'],
  ['boss_velgrynd_palace', 'Kavurucu Ejderha Velgrynd Kalesi', 'Tensura', 'crimson', 5, 'fire_dragon', '★ Velgrynd (Doğu İmparatorluk Ejderhası)', 'İvmeli alev nefesiyle korunan kızıl imparatorluk kalesi.'],
  ['boss_zelanus_hive', 'Böcek Kral Zelanus Kovan Zindanı', 'Tensura', 'spruce', 5, 'oni_warlord', '★ Yıkım Kralı Zelanus', 'Sert kitin zırhlı elit muhafızların koruduğu kovan.'],
  ['boss_fenn_chains', 'Devler Kralı Fenn Fırtına Tepesi', 'Tensura', 'ice', 4, 'oni_warlord', '★ Gleipnir Zincirli Fenn', 'Toprağı sarsan dev adımların yankılandığı dağ zirvesi.'],
  ['boss_jahil_pyre', 'Kızıl Büyücü Jahil Güneş Sunağı', 'Tensura', 'crimson', 4, 'fire_dragon', '★ Cehennem Alevi Jahil', 'Antik yüksek insanların kor ateş sunağı.'],
  ['boss_obsidian_hydra', 'Obsidyen Ejderha İkiz Krateri', 'Horizon', 'void', 5, 'fire_dragon', '★ Obsidyen Hükümdar Ejderhası', 'Netherite ve Ejderha Pulu düşüren efsanevi krater.'],
  ['boss_glacial_monarch', 'Kuzey Tacı Buz Hükümdarı', 'Horizon', 'ice', 5, 'ice_dragon', '★ Kutup Tacı Buz Ejderhası', 'Mavi buz kristalleri arasında uyuyan kadim ejderha.'],
  ['boss_emerald_leviathan', 'Zümrüt Deniz Ejderhası Koyu', 'Horizon', 'oak', 4, 'storm_dragon', '★ Okyanus Ejderhası Leviathan', 'Derin suların üstünde süzülen fırtına ejderhası koyu.'],
  ['boss_deep_warden', 'Antik Derinlik Muhafızı Mahzeni', 'Horizon', 'void', 5, 'warden', '★ Kadim Derinlik Warden’ı', 'Sonik patlama saçan Deepslate yeraltı kalesi.'],
  ['boss_wither_sanctum', 'Kara Ruh Wither Kalesi', 'Horizon', 'crimson', 5, 'wither_boss', '★ Yozlaşmış Wither Hükümdarı', 'Ruh kumu ve obsidyen sütunlu karanlık kale.'],
  ['boss_solar_phoenix', 'Altın Anka Ejderhası Zirvesi', 'Horizon', 'gold', 4, 'fire_dragon', '★ Güneş Kanatlı Ejderha', 'Şafak vakti altın alevler saçan gökyüzü zirvesi.'],
  ['boss_blood_oni', 'Kızıl Boynuz Oni Savaş Kalesi', 'Horizon', 'crimson', 4, 'oni_warlord', '★ Kızıl Savaş Lordu Oni', 'Dev demir gürzlü savaş lordunun kale avlusu.'],
  ['boss_void_reaper', 'Hiçlik Tırpanı Gölge Sunağı', 'Horizon', 'void', 5, 'hollow_menos', '★ Hiçlik Tırpanı Hükümdarı', 'Ametist ve Purpur sütunlu gece yarısı boss arenası.'],
  ['boss_celestial_dragon', 'Yıldız Işığı İmparator Ejderhası', 'Horizon', 'gold', 5, 'storm_dragon', '★ Astral İmparator Ejderhası', 'Tüm evrenlerin zirvesindeki efsanevi ejderha sunağı!'],
];

const BIOME_DEFS: Array<[string, string, LandmarkArchetype, LandmarkTheme, string]> = [
  ['bio_turquoise_lagoon', 'Turkuaz Yüzme Lagünü & Plaj', 'lagoon', 'sand', 'Berrak mavi sular, mercan tabanı ve güneşli yüzme iskelesi!'],
  ['bio_emerald_falls', 'Zümrüt Şelale Yüzme Havuzu', 'lagoon', 'oak', 'Doğal taş teraslar ve serin yüzme göleti.'],
  ['bio_coral_reef_bay', 'Mercan Resifi Dalış Koyu', 'lagoon', 'cherry', 'Deniz fenerleriyle aydınlatılmış sualtı mercan bahçesi.'],
  ['bio_crystal_glacier_lake', 'Kristal Buzul Gölü Kıyısı', 'lagoon', 'ice', 'Karlı dağların eteğinde ayna gibi parlayan mavi göl.'],
  ['bio_cherry_valley', 'Sonsuz Kiraz Çiçeği Vadisi', 'shrine', 'cherry', 'Pembe yaprakların süzüldüğü panoramik seyir köşkü.'],
  ['bio_golden_dunes', 'Altın Kumullar Günbatımı Vahası', 'shrine', 'sand', 'Uçsuz bucaksız çöl ortasında serin palmiye çeşmesi.'],
  ['bio_crimson_canyon', 'Kızıl Kanyon Kemer Köprüsü', 'shrine', 'crimson', 'Terakota katmanları üzerinde yükselen seyir kulesi.'],
  ['bio_ancient_oak_grove', 'Kadim Meşe Işık Korusu', 'shrine', 'oak', 'Güneş huzmelerinin süzüldüğü huzurlu orman mabedi.'],
  ['bio_silver_birch_woods', 'Gümüş Huş Rüzgar Korusu', 'shrine', 'oak', 'Beyaz gövdeli huş ağaçları ve papatya çayırı.'],
  ['bio_savanna_plateau', 'Kızıl Güneş Savan Platosu', 'shrine', 'sand', 'Akasya ağaçları üstünden geniş ovayı gören teras.'],
  ['bio_snowy_summit', 'Beyaz Bulut Karlı Zirve', 'shrine', 'ice', 'Dünyanın çatısından dört bir yanı izleyen fener kulesi.'],
  ['bio_flower_meadow', 'Yedi Renk Çiçek Çayırı', 'shrine', 'cherry', 'Gelincik, peygamber çiçeği ve papatyalarla kaplı vadi.'],
  ['bio_amethyst_ridge', 'Ametist Jeot Kayalığı', 'shrine', 'void', 'Mor kristallerin yüzeye çıktığı ışıltılı yamaç.'],
  ['bio_sunset_cliff', 'Kızıl Ufuk Sahil Feneri', 'lagoon', 'gold', 'Okyanus dalgalarına bakan altın kubbeli deniz feneri.'],
  ['bio_misty_fjords', 'Sisli Kuzey Fiyort Koyu', 'lagoon', 'spruce', 'Ladin ormanlarıyla çevrili derin mavi yüzme fiyordu.'],
  ['bio_bamboo_zen', 'Huzur Bahçesi Taş Fener Köşkü', 'shrine', 'oak', 'Su sesi ve fenerlerle çevrili meditasyon pavilyonu.'],
  ['bio_starfall_crater', 'Yıldız Kayması Gölü', 'lagoon', 'void', 'Gece parlayan deniz fenerli dairesel göktaşı gölü!'],
  ['bio_honeycomb_hills', 'Altın Petek Arı Tepeleri', 'shrine', 'gold', 'Çiçek tarlaları ve vahşi bal arılarının güneşli tepesi.'],
  ['bio_pine_highlands', 'Kuzey Rüzgarı Çam Yaylası', 'shrine', 'spruce', 'Serin dağ havası ve kamp ateşli seyir noktası.'],
  ['bio_red_oasis_lagoon', 'Kızıl Kum Turkuaz Vaha Gölü', 'lagoon', 'sand', 'Kızıl kanyon ortasında yüzülebilir zümrüt vaha gölü!'],
  ['bio_twin_rivers', 'İkiz Nehirler Birleşim İskelesi', 'lagoon', 'oak', 'İki nehrin buluştuğu geniş yüzme ve balıkçılık koyu.'],
  ['bio_ice_spire_pass', 'Buz Sütunları Kuzey Geçidi', 'shrine', 'ice', 'Parlak buz heykelleriyle çevrili kutup geçidi.'],
  ['bio_emerald_terrace', 'Zümrüt Basamaklı Çayır Tepesi', 'shrine', 'oak', 'Katmanlı yeşil tepelerde rüzgar çanlı çardak.'],
  ['bio_copper_coast', 'Bakır Kayalıklar Kumsal Koyu', 'lagoon', 'gold', 'Sıcak kumlar ve sığdan derine uzanan yüzme sahili.'],
  ['bio_moonlight_bay', 'Ayışığı Koy İskelesi', 'lagoon', 'cherry', 'Gece yıldızların suya yansıdığı fenerli yüzme koyu.'],
  ['bio_thunder_mesa', 'Şimşekli Kızıl Masa Dağı', 'shrine', 'crimson', 'Yüksek terakota platosu ve panoramik çöl manzarası.'],
  ['bio_rainbow_blossom', 'Bahar Esintisi Çiçek Tepesi', 'shrine', 'cherry', 'Kiraz ve meşe ağaçlarının birleştiği renkli tepe.'],
  ['bio_world_edge_beacon', 'Ufuk Sınırı Büyük Deniz Feneri', 'lagoon', 'gold', 'Uzak okyanus kaşifleri için kurulmuş anıtsal fener adası!'],
];

const DIMENSION_DEFS: Array<[string, string, DimensionId, number, number, number, LandmarkArchetype, LandmarkTheme, 3 | 4 | 5, string, string?, string?]> = [
  ['dim_nether_hub', 'Nether — Merkez Dönüş Kalesi', 'nether', 0, 0, 45, 'capital', 'crimson', 3, 'Overworld’e güvenli dönüş portalı bulunan merkez platform.'],
  ['dim_nether_bridge', 'Nether — Kale Köprüsü Gözetleme', 'nether', 0, 26, 44, 'nether_citadel', 'crimson', 4, 'Blaze ve Wither İskeletlerinin devriye gezdiği Nether tuğlası köprü.'],
  ['dim_crimson_bastion', 'Nether — Kızıl Orman Tabyası', 'nether', 128, -96, 45, 'nether_citadel', 'crimson', 4, 'Dev kızıl mantarlar arasında Piglin altın hazine tabyası!'],
  ['dim_warped_sanctum', 'Nether — Çarpık Orman Sığınağı', 'nether', -144, 112, 45, 'nether_citadel', 'void', 3, 'Mavi çarpık orman içinde güvenli Ender İncisi av noktası.'],
  ['dim_soul_valley_altar', 'Nether — Ruh Kumu Wither Sunağı', 'nether', 192, 160, 45, 'nether_citadel', 'void', 5, 'Wither Boss çağırmak için hazırlanmış obsidyen kale!', 'wither_boss', '★ Nether Wither Hükümdarı'],
  ['dim_magma_forge', 'Nether — Antik Kalıntı (Netherite) Ocağı', 'nether', -208, -176, 45, 'nether_citadel', 'gold', 4, 'Derin Netherite madenciliği için güvenli iniş kalesi.'],
  ['dim_blaze_citadel', 'Nether — Kızıl Alev Ejderha Kalesi', 'nether', 272, -240, 45, 'nether_citadel', 'crimson', 5, 'Lav denizi üstünde yükselen ejderha ve Blaze kalesi!', 'fire_dragon', '★ Cehennem Alevi Ejderhası'],
  ['dim_bastion_treasury', 'Nether — Kraliyet Altın Hazinesi', 'nether', -288, 256, 45, 'nether_citadel', 'gold', 4, 'Altın bloklar ve nadir ganimet sandığıyla dolu tabya.'],

  ['dim_end_arrival', 'End — Obsidyen Başlangıç Platformu', 'end', 10, 0, 52, 'capital', 'void', 4, 'Merkez End adasındaki güvenli obsidyen varış noktası.'],
  ['dim_end_fountain', 'End — Merkez Ejderha Podyumu', 'end', 0, 0, 55, 'capital', 'void', 5, 'Ender Ejderhası kristalleri ve dönüş çeşmesi merkezi.', 'ender_dragon', '★ Ender Ejderhası'],
  ['dim_end_city_alpha', 'End — Kuzey Purpur Gökyüzü Şehri', 'end', 128, -128, 54, 'end_island', 'void', 4, 'Uçan End Taşı adası üzerinde yükselen Purpur kulesi ve hazine!'],
  ['dim_end_ship_dock', 'End — Uçan End Gemisi Güvertesi', 'end', -144, 128, 56, 'end_island', 'gold', 4, 'Elitra ve Ejderha Pulu sandığı barındıran gökyüzü gemisi adası!'],
  ['dim_end_crystal_isle', 'End — Astral Kristal Adası', 'end', 192, 176, 54, 'end_island', 'ice', 4, 'Ametist ve End Kristalleriyle parlayan dış halka adası.'],
  ['dim_end_void_colosseum', 'End — Hiçlik Ejderhası Kolezyumu', 'end', -224, -192, 54, 'end_island', 'void', 5, 'Yıldız boşluğunda süzülen efsanevi ejderha düello adası!', 'storm_dragon', '★ Hiçlik Fırtına Ejderhası'],
  ['dim_end_chorus_garden', 'End — Alacakaranlık Purpur Bahçesi', 'end', 272, -240, 54, 'end_island', 'cherry', 4, 'Deniz fenerleri ve Purpur kemerleriyle süslü dış ada.'],
  ['dim_end_omega_citadel', 'End — Sonsuzluk Taht Adası', 'end', -304, 272, 56, 'end_island', 'gold', 5, 'End boyutunun en uzak ucundaki altın-purpur imparatorluk kalesi!', 'ender_dragon', '★ Kadim Hiçlik Ejderhası'],
];

function buildAllRegions(): WorldRegionDef[] {
  const seeds: RawSeed[] = [...CAPITAL_SEEDS];

  // Place 44 Villages across concentric rings (128m .. 2,600m)
  for (let i = 0; i < VILLAGE_DEFS.length; i++) {
    const [id, name, universe, theme, danger, desc] = VILLAGE_DEFS[i];
    const ring = Math.floor(i / 8);
    const slot = i % 8;
    const baseDist = 144 + ring * 380;
    const [cx, cz] = polarCoord(ring * 3 + 1, slot, 8, baseDist);
    const isCoastal = theme === 'sand' && i % 3 === 0;
    seeds.push({
      id,
      name,
      category: 'villages',
      universe,
      dim: 'overworld',
      cx,
      cz,
      baseY: isCoastal ? SEA_LEVEL + 2 : SPAWN_Y + (i % 4),
      archetype: 'village',
      theme,
      danger,
      desc,
    });
  }

  // Place 52 Anime Universe Landmarks across concentric rings (280m .. 3,200m)
  for (let i = 0; i < ANIME_DEFS.length; i++) {
    const [id, name, universe, archetype, theme, danger, desc, bossSpecies, bossTitle] = ANIME_DEFS[i];
    const ring = Math.floor(i / 10);
    const slot = i % 10;
    const baseDist = 290 + ring * 520;
    const [cx, cz] = polarCoord(ring * 3 + 2, slot, 10, baseDist);
    const nearWater = archetype === 'lagoon' || archetype === 'anime_harbor';
    seeds.push({
      id,
      name,
      category: 'anime',
      universe,
      dim: 'overworld',
      cx,
      cz,
      baseY: nearWater ? SEA_LEVEL + 2 : SPAWN_Y + 2 + (i % 5),
      archetype,
      theme,
      danger,
      bossSpecies,
      bossTitle,
      desc,
    });
  }

  // Place 44 Elemental Dragon Roosts & Mythic Boss Citadels (360m .. 3,550m)
  for (let i = 0; i < BOSS_DEFS.length; i++) {
    const [id, name, universe, theme, danger, bossSpecies, bossTitle, desc] = BOSS_DEFS[i];
    const ring = Math.floor(i / 9);
    const slot = i % 9;
    const baseDist = 410 + ring * 610;
    const [cx, cz] = polarCoord(ring * 3 + 4, slot, 9, baseDist);
    seeds.push({
      id,
      name,
      category: 'bosses',
      universe,
      dim: 'overworld',
      cx,
      cz,
      baseY: SPAWN_Y + 3 + (i % 6),
      archetype: 'dragon_roost',
      theme,
      danger,
      bossSpecies,
      bossTitle,
      desc,
    });
  }

  // Place 28 Scenic Biome Wonders & Swimming Lagoons (190m .. 2,900m)
  for (let i = 0; i < BIOME_DEFS.length; i++) {
    const [id, name, archetype, theme, desc] = BIOME_DEFS[i];
    const ring = Math.floor(i / 7);
    const slot = i % 7;
    const baseDist = 210 + ring * 560;
    const [cx, cz] = polarCoord(ring * 5 + 3, slot, 7, baseDist);
    seeds.push({
      id,
      name,
      category: 'biomes',
      universe: 'Horizon',
      dim: 'overworld',
      cx,
      cz,
      baseY: archetype === 'lagoon' ? SEA_LEVEL + 1 : SPAWN_Y + 4 + (i % 5),
      archetype,
      theme,
      danger: 1,
      desc,
    });
  }

  // Place 16 Nether & End Dimension Fortresses / Sky-Islands
  for (const [id, name, dim, cx, cz, baseY, archetype, theme, danger, desc, bossSpecies, bossTitle] of DIMENSION_DEFS) {
    seeds.push({
      id,
      name,
      category: 'dimensions',
      universe: dim === 'nether' ? 'Nether' : 'End',
      dim,
      cx,
      cz,
      baseY,
      archetype,
      theme,
      danger,
      bossSpecies,
      bossTitle,
      desc,
      exactPos:
        id === 'dim_nether_hub'
          ? { x: 0.5, y: 46, z: 0.5, yaw: 0, pitch: -0.05 }
          : id === 'dim_end_arrival'
          ? { x: 10.5, y: 53, z: 0.5, yaw: Math.PI * 0.5, pitch: -0.05 }
          : id === 'dim_end_fountain'
          ? { x: 0.5, y: 58, z: 4.5, yaw: 0, pitch: -0.05 }
          : undefined,
    });
  }

  // Guarantee zero overlap among non-capital Overworld landmarks (>= 88 blocks separation)
  const placedOw: Array<{ cx: number; cz: number }> = [{ cx: 0, cz: 0 }];
  for (const s of seeds) {
    if (s.dim !== 'overworld' || s.archetype === 'capital') continue;
    let guard = 0;
    while (guard < 40 && placedOw.some((p) => Math.hypot(s.cx - p.cx, s.cz - p.cz) < 88)) {
      const ang = (guard * 0.785) + (s.cx * 0.01);
      s.cx += Math.round(Math.cos(ang) * 3) * 16;
      s.cz += Math.round(Math.sin(ang) * 3) * 16;
      guard++;
    }
    placedOw.push({ cx: s.cx, cz: s.cz });
  }

  return seeds.map((s, idx) => {
    const radius =
      s.archetype === 'capital' ? 10 :
      s.archetype === 'village' ? 16 :
      s.archetype === 'dragon_roost' ? 15 :
      s.archetype === 'anime_arena' || s.archetype === 'anime_harbor' || s.archetype === 'lagoon' ? 16 : 14;

    // Guaranteed open arrival plaza at (cx + 0.5, baseY + 1, cz + 8.5) facing North (yaw = 0) toward the landmark!
    const arrivalX = s.exactPos ? s.exactPos.x : s.cx + 0.5;
    const arrivalY = s.exactPos ? s.exactPos.y : s.baseY + 1;
    const arrivalZ = s.exactPos ? s.exactPos.z : s.cz + 8.5;
    const yaw = s.exactPos ? s.exactPos.yaw : 0;
    const pitch = s.exactPos ? s.exactPos.pitch : -0.05;

    return {
      id: s.id,
      index: idx + 1,
      name: s.name,
      category: s.category,
      universe: s.universe,
      dim: s.dim,
      cx: s.cx,
      cz: s.cz,
      baseY: s.baseY,
      x: arrivalX,
      y: arrivalY,
      z: arrivalZ,
      yaw,
      pitch,
      radius,
      archetype: s.archetype,
      theme: s.theme,
      danger: s.danger,
      bossSpecies: s.bossSpecies,
      bossTitle: s.bossTitle,
      desc: s.desc,
    };
  });
}

export const WORLD_REGIONS: WorldRegionDef[] = buildAllRegions();

// ============================================================================
// O(1) SPATIAL HASH FOR ZERO-LAG TERRAIN BLENDING & CHUNK STAMPING
// ============================================================================
const CELL_SIZE = 64;
const owSpatialGrid = new Map<string, WorldRegionDef[]>();
const netherSpatialGrid = new Map<string, WorldRegionDef[]>();
const endSpatialGrid = new Map<string, WorldRegionDef[]>();

function cellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

for (const reg of WORLD_REGIONS) {
  if (reg.archetype === 'capital') continue;
  const grid = reg.dim === 'nether' ? netherSpatialGrid : reg.dim === 'end' ? endSpatialGrid : owSpatialGrid;
  const reach = reg.radius + 20;
  const minGx = Math.floor((reg.cx - reach) / CELL_SIZE);
  const maxGx = Math.floor((reg.cx + reach) / CELL_SIZE);
  const minGz = Math.floor((reg.cz - reach) / CELL_SIZE);
  const maxGz = Math.floor((reg.cz + reach) / CELL_SIZE);
  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const k = cellKey(gx, gz);
      let list = grid.get(k);
      if (!list) {
        list = [];
        grid.set(k, list);
      }
      list.push(reg);
    }
  }
}

export function queryNearbyLandmark(wx: number, wz: number, dim: DimensionId = 'overworld'): WorldRegionDef | null {
  const grid = dim === 'nether' ? netherSpatialGrid : dim === 'end' ? endSpatialGrid : owSpatialGrid;
  const list = grid.get(cellKey(Math.floor(wx / CELL_SIZE), Math.floor(wz / CELL_SIZE)));
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (Math.abs(wx - r.cx) <= r.radius + 18 && Math.abs(wz - r.cz) <= r.radius + 18) {
      return r;
    }
  }
  return null;
}

export function isInsideLandmarkClearZone(wx: number, wz: number): boolean {
  const r = queryNearbyLandmark(wx, wz, 'overworld');
  if (!r) return false;
  return Math.hypot(wx - r.cx, wz - r.cz) <= r.radius + 3;
}

export function blendLandmarkHeight(wx: number, wz: number, rawH: number): number {
  const r = queryNearbyLandmark(wx, wz, 'overworld');
  if (!r) return rawH;
  const dist = Math.hypot(wx - r.cx, wz - r.cz);
  const flatR = r.radius + 1;
  const blendR = r.radius + 16;
  if (dist >= blendR) return rawH;
  if (dist <= flatR) {
    // Carve deep crystal-clear swimming lagoon on the North half of 'lagoon' & 'anime_harbor' landmarks!
    if ((r.archetype === 'lagoon' || r.archetype === 'anime_harbor') && wz < r.cz - 1) {
      const poolDist = Math.hypot(wx - r.cx, wz - (r.cz - 7));
      if (poolDist < 8.5) {
        return SEA_LEVEL - 5;
      }
    }
    return r.baseY;
  }
  const t = (dist - flatR) / (blendR - flatR);
  const smooth = t * t * (3 - 2 * t);
  return r.baseY * (1 - smooth) + rawH * smooth;
}

function getPalette(theme: LandmarkTheme): { floor: number; wall: number; roof: number; pillar: number; trim: number; slab: number } {
  switch (theme) {
    case 'sand':
      return { floor: BLOCK.SANDSTONE, trim: BLOCK.GOLD_BLOCK, wall: BLOCK.SANDSTONE, roof: BLOCK.ACACIA_PLANKS, pillar: BLOCK.ACACIA_LOG, slab: BLOCK.OAK_SLAB };
    case 'cherry':
      return { floor: BLOCK.STONE_BRICKS, trim: BLOCK.CHERRY_PLANKS, wall: BLOCK.BIRCH_PLANKS, roof: BLOCK.CHERRY_PLANKS, pillar: BLOCK.CHERRY_LOG, slab: BLOCK.STONE_BRICK_SLAB };
    case 'crimson':
      return { floor: BLOCK.DEEPSLATE, trim: BLOCK.GOLD_BLOCK, wall: BLOCK.NETHER_BRICKS, roof: BLOCK.WOOL_RED, pillar: BLOCK.CRIMSON_STEM, slab: BLOCK.STONE_BRICK_SLAB };
    case 'ice':
      return { floor: BLOCK.SNOW_BLOCK, trim: BLOCK.SEA_LANTERN, wall: BLOCK.SNOW_BLOCK, roof: BLOCK.ICE, pillar: BLOCK.SPRUCE_LOG, slab: BLOCK.SPRUCE_SLAB };
    case 'gold':
      return { floor: BLOCK.STONE_BRICKS, trim: BLOCK.GOLD_BLOCK, wall: BLOCK.BIRCH_PLANKS, roof: BLOCK.GOLD_BLOCK, pillar: BLOCK.OAK_LOG, slab: BLOCK.STONE_BRICK_SLAB };
    case 'void':
      return { floor: BLOCK.DEEPSLATE, trim: BLOCK.HORIZON_PURPUR, wall: BLOCK.OBSIDIAN, roof: BLOCK.AMETHYST_BLOCK, pillar: BLOCK.HORIZON_PURPUR, slab: BLOCK.STONE_BRICK_SLAB };
    case 'spruce':
      return { floor: BLOCK.COBBLESTONE, trim: BLOCK.STONE_BRICKS, wall: BLOCK.SPRUCE_PLANKS, roof: BLOCK.SPRUCE_PLANKS, pillar: BLOCK.SPRUCE_LOG, slab: BLOCK.SPRUCE_SLAB };
    default:
      return { floor: BLOCK.STONE_BRICKS, trim: BLOCK.GOLD_BLOCK, wall: BLOCK.OAK_PLANKS, roof: BLOCK.SPRUCE_PLANKS, pillar: BLOCK.OAK_LOG, slab: BLOCK.OAK_SLAB };
  }
}

export function stampLandmarksInChunk(
  dim: DimensionId,
  baseX: number,
  baseZ: number,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
): void {
  const grid = dim === 'nether' ? netherSpatialGrid : dim === 'end' ? endSpatialGrid : owSpatialGrid;
  const list = grid.get(cellKey(Math.floor((baseX + 8) / CELL_SIZE), Math.floor((baseZ + 8) / CELL_SIZE)));
  if (!list) return;

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const reach = r.radius + 3;
    if (baseX > r.cx + reach || baseX + CHUNK_SIZE < r.cx - reach || baseZ > r.cz + reach || baseZ + CHUNK_SIZE < r.cz - reach) {
      continue;
    }
    stampSingleLandmark(r, setSafe);
  }
}

function stampHouse(
  hx: number,
  fy: number,
  hz: number,
  halfW: number,
  halfD: number,
  pal: ReturnType<typeof getPalette>,
  doorSide: 'S' | 'N' | 'E' | 'W',
  setSafe: (wx: number, y: number, wz: number, blockId: number) => void
) {
  for (let dz = -halfD; dz <= halfD; dz++) {
    for (let dx = -halfW; dx <= halfW; dx++) {
      const wx = hx + dx;
      const wz = hz + dz;
      setSafe(wx, fy, wz, pal.wall);
      const edgeX = Math.abs(dx) === halfW;
      const edgeZ = Math.abs(dz) === halfD;
      const isDoor =
        (doorSide === 'S' && dz === halfD && dx === 0) ||
        (doorSide === 'N' && dz === -halfD && dx === 0) ||
        (doorSide === 'E' && dx === halfW && dz === 0) ||
        (doorSide === 'W' && dx === -halfW && dz === 0);

      for (let dy = 1; dy <= 3; dy++) {
        if (!edgeX && !edgeZ) {
          setSafe(wx, fy + dy, wz, BLOCK.AIR);
          continue;
        }
        if (isDoor && dy <= 2) {
          setSafe(wx, fy + dy, wz, BLOCK.OAK_DOOR_CLOSED);
        } else if (edgeX && edgeZ) {
          setSafe(wx, fy + dy, wz, pal.pillar);
        } else if (dy === 2 && ((edgeX && dz === 0) || (edgeZ && Math.abs(dx) === Math.max(1, halfW - 1)))) {
          setSafe(wx, fy + dy, wz, BLOCK.GLASS_PANE);
        } else {
          setSafe(wx, fy + dy, wz, dy === 1 ? pal.floor : pal.wall);
        }
      }
    }
  }
  // Pitched pyramid/gable roof
  for (let layer = 0; layer <= Math.min(halfW, halfD) + 1; layer++) {
    const rw = halfW + 1 - layer;
    const rd = halfD + 1 - layer;
    if (rw < 0 || rd < 0) break;
    for (let dz = -rd; dz <= rd; dz++) {
      for (let dx = -rw; dx <= rw; dx++) {
        setSafe(hx + dx, fy + 4 + layer, hz + dz, layer === 0 ? pal.slab : pal.roof);
      }
    }
  }
  setSafe(hx, fy + 3, hz, BLOCK.LANTERN);
}

function stampWaystonePedestal(
  wx: number,
  fy: number,
  wz: number,
  setSafe: (x: number, y: number, z: number, id: number) => void
) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      setSafe(wx + dx, fy, wz + dz, dx === 0 && dz === 0 ? BLOCK.GOLD_BLOCK : BLOCK.HORIZON_PURPUR);
    }
  }
  setSafe(wx, fy + 1, wz, BLOCK.HORIZON_PURPUR);
  setSafe(wx, fy + 2, wz, BLOCK.SEA_LANTERN);
  setSafe(wx, fy + 3, wz, BLOCK.STONE_BRICK_SLAB);
}

function stampSingleLandmark(
  r: WorldRegionDef,
  setSafe: (wx: number, y: number, wz: number, blockId: number, onlyReplaceSoft?: boolean) => void
) {
  const cx = r.cx;
  const cz = r.cz;
  const fy = r.baseY;
  const pal = getPalette(r.theme);

  // 1. Clear airspace & build solid foundation for every landmark so teleports NEVER clip!
  if (r.archetype === 'nether_citadel') {
    for (let dz = -11; dz <= 12; dz++) {
      for (let dx = -11; dx <= 11; dx++) {
        if (Math.hypot(dx, dz) > 12.5) continue;
        setSafe(cx + dx, fy - 1, cz + dz, BLOCK.NETHER_BRICKS);
        setSafe(cx + dx, fy, cz + dz, Math.abs(dx) <= 2 || Math.abs(dz) <= 2 ? pal.trim : BLOCK.NETHER_BRICKS);
        for (let y = fy + 1; y <= fy + 10; y++) setSafe(cx + dx, y, cz + dz, BLOCK.AIR);
        if (Math.abs(Math.hypot(dx, dz) - 11.2) < 0.75) {
          setSafe(cx + dx, fy + 1, cz + dz, BLOCK.NETHER_BRICKS);
          if (((dx + dz) & 3) === 0) setSafe(cx + dx, fy + 2, cz + dz, BLOCK.LANTERN);
        }
      }
    }
    stampWaystonePedestal(cx, fy, cz + 5, setSafe);
    setSafe(cx, fy + 1, cz, BLOCK.GOLD_BLOCK);
    setSafe(cx, fy + 2, cz, BLOCK.BELL_BLOCK);
    setSafe(cx + 2, fy + 1, cz, BLOCK.CHEST);
    // Safe Return Portal on West edge
    for (let pz = -1; pz <= 2; pz++) {
      for (let py = 1; py <= 5; py++) {
        const frame = pz === -1 || pz === 2 || py === 1 || py === 5;
        setSafe(cx - 7, fy + py, cz + pz, frame ? BLOCK.OBSIDIAN : BLOCK.NETHER_PORTAL);
      }
    }
    return;
  }

  if (r.archetype === 'end_island') {
    for (let dz = -13; dz <= 13; dz++) {
      for (let dx = -13; dx <= 13; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > 13.2) continue;
        const depth = Math.max(2, Math.round((1 - d / 13.5) * 8));
        for (let dy = -depth; dy <= 0; dy++) {
          setSafe(cx + dx, fy + dy, cz + dz, dy === 0 && d < 9 ? BLOCK.HORIZON_PURPUR : BLOCK.END_STONE);
        }
        for (let y = fy + 1; y <= fy + 14; y++) setSafe(cx + dx, y, cz + dz, BLOCK.AIR);
      }
    }
    // Purpur Spire / End Ship Cabin on North side
    stampHouse(cx, fy, cz - 4, 3, 3, { ...pal, wall: BLOCK.HORIZON_PURPUR, roof: BLOCK.GOLD_BLOCK, pillar: BLOCK.OBSIDIAN }, 'S', setSafe);
    stampWaystonePedestal(cx, fy, cz + 5, setSafe);
    setSafe(cx, fy + 1, cz + 1, BLOCK.OBSIDIAN);
    setSafe(cx, fy + 2, cz + 1, BLOCK.BELL_BLOCK);
    setSafe(cx + 2, fy + 1, cz + 1, BLOCK.CHEST);
    setSafe(cx - 2, fy + 1, cz + 1, BLOCK.END_CRYSTAL_BLOCK);
    // Return End Portal Pad on East side
    setSafe(cx + 6, fy, cz + 4, BLOCK.END_PORTAL);
    return;
  }

  // Overworld Landmarks: Clear sky above plaza & pave arrival courtyard at South (cz + 6..10)
  for (let dz = -r.radius; dz <= r.radius; dz++) {
    for (let dx = -r.radius; dx <= r.radius; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > r.radius + 0.5) continue;
      const isLagoonWater = (r.archetype === 'lagoon' || r.archetype === 'anime_harbor') && dz < -1 && Math.hypot(dx, dz + 7) < 8.5;
      if (isLagoonWater) {
        // Crystal-clear swimmable lagoon with glowing Sea Lantern coral floor!
        for (let y = SEA_LEVEL - 5; y <= SEA_LEVEL; y++) {
          setSafe(cx + dx, y, cz + dz, y === SEA_LEVEL - 5 ? (((dx + dz) & 3) === 0 ? BLOCK.SEA_LANTERN : BLOCK.SAND) : BLOCK.WATER);
        }
        for (let y = SEA_LEVEL + 1; y <= fy + 14; y++) setSafe(cx + dx, y, cz + dz, BLOCK.AIR);
        continue;
      }

      for (let y = fy + 1; y <= fy + 15; y++) setSafe(cx + dx, y, cz + dz, BLOCK.AIR);
      const inPlaza = Math.abs(dx) <= 4 && dz >= -2 && dz <= 10;
      const inCrossRoad = Math.abs(dz - 3) <= 1 && Math.abs(dx) <= 10;
      if (inPlaza || inCrossRoad) {
        setSafe(cx + dx, fy, cz + dz, (dx === 0 && dz === 8) ? pal.trim : pal.floor);
      }
    }
  }

  // Universal Waystone Obelisk at (cx + 4, fy, cz + 6) leaving (cx, cz + 8.5) 100% wide-open arrival pad!
  stampWaystonePedestal(cx + 4, fy, cz + 6, setSafe);
  // Decorative Lanterns flanking arrival pad
  setSafe(cx - 4, fy + 1, cz + 8, BLOCK.STONE_BRICKS);
  setSafe(cx - 4, fy + 2, cz + 8, BLOCK.LANTERN);
  setSafe(cx + 4, fy + 1, cz + 10, BLOCK.STONE_BRICKS);
  setSafe(cx + 4, fy + 2, cz + 10, BLOCK.LANTERN);

  if (r.archetype === 'village') {
    // 3 Furnished Village Houses around central Town Bell & Treasure Chest
    stampHouse(cx, fy, cz - 6, 4, 3, pal, 'S', setSafe);
    stampHouse(cx - 9, fy, cz + 1, 3, 3, pal, 'E', setSafe);
    stampHouse(cx + 9, fy, cz + 1, 3, 3, pal, 'W', setSafe);
    setSafe(cx, fy + 1, cz - 4, BLOCK.CRAFTING_TABLE);
    setSafe(cx - 2, fy + 1, cz - 7, BLOCK.BED_BLOCK);
    setSafe(cx + 2, fy + 1, cz - 7, BLOCK.CHEST);
    setSafe(cx - 9, fy + 1, cz, BLOCK.FURNACE_LIT);
    setSafe(cx + 9, fy + 1, cz, BLOCK.ANVIL);
    // Town Bell Fountain at (cx, cz + 2)
    setSafe(cx, fy + 1, cz + 2, BLOCK.GOLD_BLOCK);
    setSafe(cx, fy + 2, cz + 2, BLOCK.BELL_BLOCK);
  } else if (r.archetype === 'anime_konoha') {
    // Vermilion Torii Gate at (cx, cz + 3) + Grand Kage / Samurai Dojo at (cx, cz - 6)
    for (let py = 1; py <= 5; py++) {
      setSafe(cx - 3, fy + py, cz + 3, BLOCK.WOOL_RED);
      setSafe(cx + 3, fy + py, cz + 3, BLOCK.WOOL_RED);
    }
    for (let dx = -5; dx <= 5; dx++) {
      setSafe(cx + dx, fy + 5, cz + 3, BLOCK.WOOL_RED);
      setSafe(cx + dx, fy + 6, cz + 3, Math.abs(dx) === 5 ? BLOCK.GOLD_BLOCK : BLOCK.DEEPSLATE);
    }
    stampHouse(cx, fy, cz - 6, 5, 4, pal, 'S', setSafe);
    setSafe(cx - 3, fy + 1, cz - 7, BLOCK.ENCHANTING_TABLE);
    setSafe(cx + 3, fy + 1, cz - 7, BLOCK.CHEST);
    setSafe(cx, fy + 1, cz - 1, BLOCK.GOLD_BLOCK);
    setSafe(cx, fy + 2, cz - 1, BLOCK.BELL_BLOCK);
  } else if (r.archetype === 'anime_seireitei') {
    // Soul Society / Las Noches White-Gold Colonnade & Captain's Hall
    for (let k = -8; k <= 8; k += 4) {
      if (k === 0) continue;
      for (let py = 1; py <= 5; py++) setSafe(cx + k, fy + py, cz + 2, BLOCK.IRON_BLOCK);
      setSafe(cx + k, fy + 6, cz + 2, BLOCK.SEA_LANTERN);
    }
    stampHouse(cx, fy, cz - 6, 5, 4, { ...pal, wall: BLOCK.IRON_BLOCK }, 'S', setSafe);
    setSafe(cx, fy + 1, cz - 7, BLOCK.CHEST);
    setSafe(cx, fy + 1, cz, BLOCK.HORIZON_PURPUR);
    setSafe(cx, fy + 2, cz, BLOCK.BELL_BLOCK);
  } else if (r.archetype === 'anime_arena') {
    // Authentic Tenkaichi Budokai / Chunin / Cell Games Tournament Ring!
    for (let dz = -9; dz <= 3; dz++) {
      for (let dx = -6; dx <= 6; dx++) {
        const border = Math.abs(dx) === 6 || dz === -9 || dz === 3;
        const checker = ((dx + dz) & 1) === 0 ? BLOCK.BIRCH_PLANKS : BLOCK.STONE_BRICKS;
        setSafe(cx + dx, fy + 1, cz + dz, border ? pal.trim : checker);
      }
    }
    // Entry steps on South edge of ring (dz = 4)
    for (let dx = -2; dx <= 2; dx++) setSafe(cx + dx, fy + 1, cz + 4, BLOCK.STONE_BRICK_SLAB);
    // 4 Corner Pillars with Lanterns
    for (const [px, pz] of [[-6, -9], [6, -9], [-6, 3], [6, 3]]) {
      for (let py = 2; py <= 4; py++) setSafe(cx + px, fy + py, cz + pz, pal.pillar);
      setSafe(cx + px, fy + 5, cz + pz, BLOCK.SEA_LANTERN);
    }
    setSafe(cx, fy + 2, cz - 3, BLOCK.GOLD_BLOCK);
    setSafe(cx, fy + 3, cz - 3, BLOCK.BELL_BLOCK);
    setSafe(cx - 4, fy + 2, cz - 8, BLOCK.CHEST);
  } else if (r.archetype === 'anime_harbor' || r.archetype === 'lagoon') {
    // Wooden Swimming Pier extending over the Crystal Lagoon + Sailing Ship / Beach House!
    for (let dz = -5; dz <= 2; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        setSafe(cx + dx, SEA_LEVEL + 1, cz + dz, BLOCK.SPRUCE_PLANKS);
      }
    }
    // Ladder on pier tip so swimmers climb effortlessly back onto the dock!
    setSafe(cx, SEA_LEVEL, cz - 5, BLOCK.SPRUCE_PLANKS);
    setSafe(cx, SEA_LEVEL + 1, cz - 6, BLOCK.LADDER);

    if (r.archetype === 'anime_harbor') {
      // Sculpted 3D Pirate Ship floating at (cx - 5, SEA_LEVEL, cz - 8) with billowing White & Gold Sails!
      for (let sx = -9; sx <= -3; sx++) {
        for (let sz = -10; sz <= -6; sz++) {
          if ((sx === -9 || sx === -3) && (sz === -10 || sz === -6)) continue;
          setSafe(cx + sx, SEA_LEVEL, cz + sz, BLOCK.OAK_PLANKS);
          setSafe(cx + sx, SEA_LEVEL + 1, cz + sz, sx === -9 || sx === -3 || sz === -10 || sz === -6 ? BLOCK.SPRUCE_PLANKS : BLOCK.AIR);
        }
      }
      for (let my = 1; my <= 7; my++) setSafe(cx - 6, SEA_LEVEL + my, cz - 8, BLOCK.OAK_LOG);
      for (let sy = 3; sy <= 6; sy++) {
        for (let sx = -8; sx <= -4; sx++) {
          setSafe(cx + sx, SEA_LEVEL + sy, cz - 7, sy === 5 && sx === -6 ? BLOCK.GOLD_BLOCK : BLOCK.WOOL_WHITE);
        }
      }
    }
    stampHouse(cx + 8, fy, cz + 1, 3, 3, pal, 'W', setSafe);
    setSafe(cx + 8, fy + 1, cz, BLOCK.CHEST);
    setSafe(cx - 2, fy + 1, cz + 2, BLOCK.GOLD_BLOCK);
    setSafe(cx - 2, fy + 2, cz + 2, BLOCK.BELL_BLOCK);
  } else if (r.archetype === 'dragon_roost') {
    // Mythic Dragon & Unique Boss Ritual Colosseum!
    for (let dz = -11; dz <= 3; dz++) {
      for (let dx = -10; dx <= 10; dx++) {
        const d = Math.hypot(dx, dz + 4);
        if (d <= 9.5) {
          const ring = Math.abs(d - 8.5) < 0.8;
          setSafe(cx + dx, fy, cz + dz, ring ? pal.trim : pal.floor);
        }
      }
    }
    // 6 Elemental Brazier Pillars around the circle
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const px = Math.round(Math.cos(ang) * 8);
      const pz = -4 + Math.round(Math.sin(ang) * 8);
      for (let py = 1; py <= 4; py++) setSafe(cx + px, fy + py, cz + pz, BLOCK.OBSIDIAN);
      setSafe(cx + px, fy + 5, cz + pz, r.theme === 'ice' ? BLOCK.SEA_LANTERN : BLOCK.CAMPFIRE);
    }
    // Central Dragon Summoning Altar + Bell + Dragon Egg + Hoard Chest
    for (let dz = -5; dz <= -3; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        setSafe(cx + dx, fy + 1, cz + dz, BLOCK.OBSIDIAN);
      }
    }
    setSafe(cx, fy + 2, cz - 4, BLOCK.GOLD_BLOCK);
    setSafe(cx, fy + 3, cz - 4, BLOCK.BELL_BLOCK);
    setSafe(cx, fy + 2, cz - 5, BLOCK.DRAGON_EGG);
    setSafe(cx + 2, fy + 1, cz - 4, BLOCK.CHEST);
  } else {
    // Scenic Shrine Gazebo Pavilion
    for (let dz = -5; dz <= 1; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        setSafe(cx + dx, fy, cz + dz, Math.abs(dx) === 3 || dz === -5 || dz === 1 ? pal.trim : pal.floor);
      }
    }
    for (const [px, pz] of [[-3, -5], [3, -5], [-3, 1], [3, 1]]) {
      for (let py = 1; py <= 3; py++) setSafe(cx + px, fy + py, cz + pz, pal.pillar);
    }
    for (let dz = -6; dz <= 2; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        setSafe(cx + dx, fy + 4, cz + dz, pal.roof);
      }
    }
    setSafe(cx, fy + 3, cz - 2, BLOCK.SEA_LANTERN);
    setSafe(cx, fy + 1, cz - 3, BLOCK.CHEST);
  }
}
