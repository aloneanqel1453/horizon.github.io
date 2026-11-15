// Tensura: Ultimate Jura Tempest & Top-50 Canonical Powerhouse RPG System
// Includes:
//  - Top 50 Strongest Tensura & Jura Tempest Characters (1-click restriction-free 3D transformation)
//  - 16 Real Canonical Ultimate Skills (all unlocked, paired with 3D VFX in tensuraVfx.ts)
//  - Universal Loyal Monster Naming (converts ANY mob into a 100% loyal Tempest bodyguard)
//  - Interactive Manas: Ciel / Büyük Bilge AI Advisor

import { MobEntity, MobSpecies } from '../entities/mobSystem';
import { CharacterVisualSpec } from '../entities/avatars';

export type TensuraFaction = 'all' | 'tempest' | 'dragon' | 'octagram' | 'primordial' | 'awakened';
export type AnimeUniverse =
  | 'all'
  | 'Tensura'
  | 'Naruto'
  | 'Bleach'
  | 'Dragon Ball'
  | 'One Piece'
  | 'RPG Sınıf'
  | 'Minecraft';

export type TensuraSkillId =
  | 'beelzebuth'
  | 'void_god_azathoth'
  | 'storm_king_veldora'
  | 'hellflare_amaterasu'
  | 'mephisto_illusions'
  | 'sephirot_dimension_ray'
  | 'susanoo_chaotic_fate'
  | 'satanael_drago_nova'
  | 'lucifer_crimson_prominence'
  | 'yog_sothoth_time_stop'
  | 'abaddon_extinction'
  | 'belial_white_world'
  | 'samael_death_poison'
  | 'cthulhu_absolute_zero'
  | 'tsukuyomi_shadow_kill'
  | 'uriel_absolute_guard'
  | 'naruto_rasenshuriken'
  | 'sasuke_kirin_chidori'
  | 'kurama_bijudama'
  | 'uchiha_susanoo_slash'
  | 'sasuke_indra_arrow'
  | 'madara_tengai_shinsei'
  | 'itachi_tsukuyomi_crows'
  | 'minato_hiraishin_lvl2'
  | 'kakashi_kamui_raikiri'
  | 'hashirama_mokuton_buddha'
  | 'pain_shinra_chibaku'
  | 'jiraiya_toad_oil_inferno'
  | 'gaara_sand_mausoleum'
  | 'ichigo_mugetsu'
  | 'byakuya_senbonzakura'
  | 'aizen_kurohitsugi'
  | 'yamamoto_zanka_no_tachi'
  | 'ichigo_gran_rey_getsuga'
  | 'aizen_kyoka_fragor'
  | 'yamamoto_zanka_minami'
  | 'kenpachi_nozarashi_cleave'
  | 'byakuya_hakuteiken'
  | 'ulquiorra_lanza_relampago'
  | 'grimmjow_desgarron'
  | 'hitsugaya_hyorinmaru_dragon'
  | 'rukia_hakka_no_togame'
  | 'urahara_benihime_net'
  | 'goku_kamehameha'
  | 'vegeta_final_flash'
  | 'goku_genki_dama'
  | 'ultra_instinct_aura'
  | 'vegeta_ultra_ego_hakai'
  | 'gohan_makankosappo'
  | 'broly_gigantic_catastrophe'
  | 'gogeta_stardust_breaker'
  | 'beerus_hakai_sphere'
  | 'goku_black_scythe_rift'
  | 'frieza_black_supernova'
  | 'piccolo_hellzone_orange'
  | 'trunks_sword_of_hope'
  | 'luffy_bajrang_gun'
  | 'zoro_king_of_hell'
  | 'law_ope_room'
  | 'whitebeard_gura_haki'
  | 'luffy_dawn_gatling'
  | 'zoro_dragon_damnation'
  | 'shanks_kamusari'
  | 'kaido_thunder_bagua'
  | 'mihawk_kokuto_yoru'
  | 'sanji_ifrit_boeuf_burst'
  | 'ace_dai_enkai_entei'
  | 'sabo_flame_dragon_king'
  | 'rpg_dragon_slayer_cleave'
  | 'rpg_astral_meteor_storm'
  | 'rpg_shadow_lotus_assault'
  | 'rpg_paladin_divine_sanctuary'
  | 'mc_steve_creative_anvil'
  | 'mc_herobrine_fog_wrath'
  | 'mc_technoblade_blood_god'
  | 'mc_warden_sonic_boom'
  | 'shunsui_karamatsu_shinju'
  | 'yhwach_almighty_auswahlen'
  | 'ichibe_shirafude_ichimonji'
  | 'unohana_minazuki'
  | 'yoruichi_raijin_senkei'
  | 'gin_kamishini_no_yari'
  | 'mayuri_ashisogi_jizo'
  | 'renji_soo_zabimaru'
  | 'komamura_tengen_myoo'
  | 'uryu_antithesis_licht'
  | 'jugram_balance_shield'
  | 'starrk_cero_metralleta'
  | 'barragan_respira'
  | 'shinji_sakanade'
  | 'obito_kamui_nunoboko'
  | 'might_guy_night_guy'
  | 'rock_lee_ura_renge'
  | 'kaguya_expansive_tsb'
  | 'hagoromo_creation_seal'
  | 'tobirama_suiryudan'
  | 'hiruzen_five_elements'
  | 'tsunade_byakugo_smash'
  | 'orochimaru_hydra'
  | 'killer_bee_lariat_bijudama'
  | 'kisame_water_shark_dome'
  | 'shisui_kotoamatsukami'
  | 'deidara_c4_karura'
  | 'hidan_jashin_ritual'
  | 'hinata_twin_lion_64palms';

export interface TensuraSkillDef {
  id: TensuraSkillId;
  universe?: Exclude<AnimeUniverse, 'all'>;
  name: string;
  subName: string;
  cost: number;
  cooldown: number;
  damageLabel: string;
  desc: string;
  accent: string;
}

export const TENSURA_SKILLS: Record<TensuraSkillId, TensuraSkillDef> = {
  beelzebuth: {
    id: 'beelzebuth',
    name: 'Oburluk Kralı Beelzebuth',
    subName: 'Hiçlik Yutuşu & Özümseme',
    cost: 35,
    cooldown: 0.55,
    damageLabel: '36 Hasar + Can/EP Çekme',
    desc: 'Önündeki düşmanları ve ganimetleri karanlık girdaba çekip yutar, Can/Açlık/EP kazandırır.',
    accent: '#a855f7'
  },
  void_god_azathoth: {
    id: 'void_god_azathoth',
    name: 'Hiçlik Tanrısı Azathoth',
    subName: 'Turn Null · Yok Oluş Tekilliği',
    cost: 110,
    cooldown: 1.9,
    damageLabel: '120 Gerçek Hasar (9.5m)',
    desc: 'Rimuru\'nun nihai gücü: çöken siyah-altın hiçlik küresi düşmanları siler, dostlara dokunmaz.',
    accent: '#facc15'
  },
  storm_king_veldora: {
    id: 'storm_king_veldora',
    name: 'Fırtına Kralı Veldora',
    subName: 'Ölüm Çağıran Kara Yıldırımlar',
    cost: 70,
    cooldown: 1.2,
    damageLabel: '68 Hasar × 6 Zincir Yıldırım',
    desc: 'Gökyüzünden 18m içindeki tüm düşmanların tepesine gerçek 3B siyah-altın yıldırımlar indirir.',
    accent: '#fde047'
  },
  hellflare_amaterasu: {
    id: 'hellflare_amaterasu',
    name: 'Güneş Tanrısı Amaterasu',
    subName: 'Benimaru · Cehennem Alevi Kubbesi',
    cost: 65,
    cooldown: 1.15,
    damageLabel: '74 Plazma Hasarı (8m)',
    desc: 'Hedef noktada kızıl-siyah sıkıştırılmış plazma kubbesi açarak tüm düşmanları kül eder.',
    accent: '#ef4444'
  },
  mephisto_illusions: {
    id: 'mephisto_illusions',
    name: 'Yanılsama Kralı Mephisto',
    subName: 'Diablo · Dünyanın Sonu (End of World)',
    cost: 50,
    cooldown: 0.85,
    damageLabel: '66 Hasar + Uzay Işınlanması',
    desc: 'Hedef düşmanın arkasına anında ışınlanıp gerçekliği yaran çapraz kızıl-mor kesiş indirir.',
    accent: '#c084fc'
  },
  sephirot_dimension_ray: {
    id: 'sephirot_dimension_ray',
    name: 'Boyut Fırtınası Sephirot',
    subName: 'Zegion · Boyut Delici Işın',
    cost: 75,
    cooldown: 1.25,
    damageLabel: '82 Delici Hasar (28m Hat)',
    desc: '28 metre boyunca uzayı delen dev turkuaz-mor enerji ışını ateşler; hattaki tüm düşmanları vurur.',
    accent: '#22d3ee'
  },
  susanoo_chaotic_fate: {
    id: 'susanoo_chaotic_fate',
    name: 'Tiran Kral Susanoo',
    subName: 'Shion · Gerçeklik Yaran Kader Kesisi',
    cost: 55,
    cooldown: 0.9,
    damageLabel: '78 Zırh Delen Kesiş',
    desc: 'Devasa mor Odachi dalgasıyla 8.5m ön cephedeki tüm düşmanların savunmasını yarıp havaya savurur.',
    accent: '#d946ef'
  },
  satanael_drago_nova: {
    id: 'satanael_drago_nova',
    name: 'Gazap Kralı Satanael',
    subName: 'Milim Nava · Drago Nova',
    cost: 100,
    cooldown: 1.8,
    damageLabel: '110 Yıldız Tozu Hasarı',
    desc: 'Saf yıldız parçacıklarından oluşan 30m pembe-altın ejderha ışını ve süpernova patlaması.',
    accent: '#ec4899'
  },
  lucifer_crimson_prominence: {
    id: 'lucifer_crimson_prominence',
    name: 'Kibir Kralı Lucifer',
    subName: 'Guy Crimson · Kızıl Kıyamet Sütunu',
    cost: 85,
    cooldown: 1.5,
    damageLabel: '92 Sütun Hasarı (18m Gök)',
    desc: 'Yerden gökyüzüne yükselen 18 metrelik kızıl-altın uçurum sütunuyla alanı yakıp yıkar.',
    accent: '#f43f5e'
  },
  yog_sothoth_time_stop: {
    id: 'yog_sothoth_time_stop',
    name: 'Zaman Tanrısı Yog-Sothoth',
    subName: 'Chloe · Durmuş Dünya (Time Stop 6sn)',
    cost: 90,
    cooldown: 2.8,
    damageLabel: '6.0 Saniye Zaman Durdurma',
    desc: 'Zamanı 6 saniye tamamen durdurur! Tüm düşmanlar ve mermileri donar; siz ve dostlarınız özgürce vurursunuz.',
    accent: '#38bdf8'
  },
  abaddon_extinction: {
    id: 'abaddon_extinction',
    name: 'Yıkım Kralı Abaddon',
    subName: 'Carrera · Yok Oluş Mızrağı (Necrosis)',
    cost: 90,
    cooldown: 1.6,
    damageLabel: '98 Nükleer Büyü Hasarı',
    desc: 'Altın büyü çemberinden 32m menzilli yerçekimi çökerten nükleer büyü mızrağı ateşler.',
    accent: '#fbbf24'
  },
  belial_white_world: {
    id: 'belial_white_world',
    name: 'Ölüm Kralı Belial',
    subName: 'Testarossa · Beyaz Cehennem Hasadı',
    cost: 60,
    cooldown: 1.15,
    damageLabel: '62 Hasar + +10 Can Çalma',
    desc: '9.5m beyaz kül küresiyle düşmanların yaşam enerjisini sömürür, canınızı ve büyü özünüzü doldurur.',
    accent: '#f8fafc'
  },
  samael_death_poison: {
    id: 'samael_death_poison',
    name: 'Zehir Kralı Samael',
    subName: 'Ultima · Ölüm Gülü Korozyonu',
    cost: 55,
    cooldown: 1.1,
    damageLabel: '48 Anlık + 60 Erime Hasarı',
    desc: 'Mor ölüm toksini patlamasıyla düşmanları zehirler; 6.5 saniye boyunca eriterek canlarını tüketir.',
    accent: '#a855f7'
  },
  cthulhu_absolute_zero: {
    id: 'cthulhu_absolute_zero',
    name: 'Buz Tanrısı Cthulhu',
    subName: 'Velzard · Mutlak Sıfır Kristalleri',
    cost: 70,
    cooldown: 1.4,
    damageLabel: '60 Hasar + 5sn Buz Hapsi',
    desc: 'Yerden devasa elmas buz kristalleri fışkırtarak 9m içindeki tüm düşmanları 5 saniye dondurur.',
    accent: '#67e8f9'
  },
  tsukuyomi_shadow_kill: {
    id: 'tsukuyomi_shadow_kill',
    name: 'Ay Kralı Tsukuyomi',
    subName: 'Souei & Hakurou · Gölge İnfazı',
    cost: 40,
    cooldown: 0.7,
    damageLabel: '58 Hasar + Gölge Adımı',
    desc: '13m ileri gölge adımıyla süzülüp hilal kılıç kesisi indirir ve hedefleri 2.5sn gölgeye mıhlar.',
    accent: '#818cf8'
  },
  uriel_absolute_guard: {
    id: 'uriel_absolute_guard',
    name: 'Antlaşma Kralı Uriel',
    subName: 'Mutlak Bariyer & Ordu İyileştirme',
    cost: 60,
    cooldown: 1.8,
    damageLabel: '6sn Ölümsüz Kalkan + Tam Şifa',
    desc: '3B altın altıgen kristal bariyer açar (6sn tam hasar bağışıklığı) ve sizi + tüm dostlarınızı tam iyileştirir.',
    accent: '#fde047'
  },
  naruto_rasenshuriken: {
    id: 'naruto_rasenshuriken',
    universe: 'Naruto',
    name: 'Rüzgar Stili: Dev Rasenshuriken',
    subName: 'Naruto Uzumaki · Hücresel Rüzgar Bıçakları',
    cost: 60,
    cooldown: 1.05,
    damageLabel: '88 Rüzgar Hasarı + Girdap Çekimi',
    desc: 'Hedef noktada 4 bıçaklı dev 3B çakra shurikeni döndürerek 9m içindeki tüm düşmanları girdaba çekip parçalar.',
    accent: '#38bdf8'
  },
  sasuke_kirin_chidori: {
    id: 'sasuke_kirin_chidori',
    universe: 'Naruto',
    name: 'Rinnegan: Kirin & Chidori',
    subName: 'Sasuke Uchiha · Gök Ejderhası Yıldırımı',
    cost: 65,
    cooldown: 1.1,
    damageLabel: '92 Yıldırım Hasarı + Şimşek Adımı',
    desc: 'İleri şimşek hızında atılıp gökyüzünden mavi-altın Kirin yıldırımları indirir ve hedefleri sersemletir.',
    accent: '#60a5fa'
  },
  kurama_bijudama: {
    id: 'kurama_bijudama',
    universe: 'Naruto',
    name: 'Baryon: Kuyruklu Canavar Topu',
    subName: 'Kurama & Naruto · Bijudama Yıkım Işını',
    cost: 95,
    cooldown: 1.65,
    damageLabel: '115 Çakra Işın Hasarı (30m)',
    desc: 'Yoğunlaştırılmış kızıl-mor Bijudama çakra küresinden 30 metrelik devasa yıkım ışını ve patlama ateşler.',
    accent: '#f97316'
  },
  uchiha_susanoo_slash: {
    id: 'uchiha_susanoo_slash',
    universe: 'Naruto',
    name: 'Kusursuz Susanoo Kılıcı',
    subName: 'Madara & Itachi · Gök Yaran Çapraz Kesiş',
    cost: 70,
    cooldown: 1.15,
    damageLabel: '96 Zırh Delen Susanoo Kesisi',
    desc: 'Devasa mavi-mor Susanoo kılıcıyla 10m ön cephedeki tüm düşmanları çapraz kesip havaya savurur.',
    accent: '#818cf8'
  },
  ichigo_mugetsu: {
    id: 'ichigo_mugetsu',
    universe: 'Bleach',
    name: 'Son Getsuga Tensho: Mugetsu',
    subName: 'Ichigo Kurosaki · Karanlık Gök Yaran Hilal',
    cost: 95,
    cooldown: 1.6,
    damageLabel: '118 Ruhsal Karanlık Kesiş',
    desc: 'Zangetsu\'dan yükselen dev siyah-kızıl Mugetsu ruh dalgasıyla önünüzdeki tüm düşmanları biçer.',
    accent: '#ef4444'
  },
  byakuya_senbonzakura: {
    id: 'byakuya_senbonzakura',
    universe: 'Bleach',
    name: 'Senbonzakura Kageyoshi',
    subName: 'Byakuya Kuchiki · Bin Kiraz Kılıcı Fırtınası',
    cost: 65,
    cooldown: 1.15,
    damageLabel: '86 Kılıç Fırtınası Hasarı (9m)',
    desc: 'Etrafınızda dönen binlerce 3B pembe-gümüş kiraz çiçeği bıçağıyla tüm yakın düşmanları doğrar.',
    accent: '#f472b6'
  },
  aizen_kurohitsugi: {
    id: 'aizen_kurohitsugi',
    universe: 'Bleach',
    name: 'Hado #90: Kurohitsugi',
    subName: 'Sosuke Aizen · Kara Tabut Yerçekimi Mühürü',
    cost: 85,
    cooldown: 1.45,
    damageLabel: '104 Ezici Yerçekimi Hasarı',
    desc: 'Hedef alanı 3B mor-siyah Kurohitsugi tabutuna hapsedip karanlık mızraklarla ezer.',
    accent: '#a855f7'
  },
  yamamoto_zanka_no_tachi: {
    id: 'yamamoto_zanka_no_tachi',
    universe: 'Bleach',
    name: 'Zanka no Tachi: Güneş Çekirdeği',
    subName: 'Genryusai Yamamoto · 15 Milyon Derece Sütun',
    cost: 90,
    cooldown: 1.55,
    damageLabel: '112 Cehennem Sütunu Hasarı',
    desc: 'Ryujin Jakka\'nın tüm alevini 20 metrelik akkor güneş sütununa dönüştürerek alanı kül eder.',
    accent: '#fb923c'
  },
  goku_kamehameha: {
    id: 'goku_kamehameha',
    universe: 'Dragon Ball',
    name: 'İlahi Super Kamehameha',
    subName: 'Son Goku · Saf Mavi Ki Plazma Işını',
    cost: 80,
    cooldown: 1.35,
    damageLabel: '108 İlahi Ki Hasarı (32m)',
    desc: '32 metre boyunca uzanan saf mavi-beyaz Kamehameha enerji dalgasıyla hattaki tüm düşmanları uçurur.',
    accent: '#38bdf8'
  },
  vegeta_final_flash: {
    id: 'vegeta_final_flash',
    universe: 'Dragon Ball',
    name: 'Ultra Ego: Final Flash',
    subName: 'Vegeta · Altın Elektrik Yıkım Işını',
    cost: 85,
    cooldown: 1.4,
    damageLabel: '110 Altın Ki Hasarı (32m)',
    desc: 'Altın yıldırım halkalarıyla çevrili dev Final Flash ışını ateşleyerek yüksek kritik hasar vurur.',
    accent: '#facc15'
  },
  goku_genki_dama: {
    id: 'goku_genki_dama',
    universe: 'Dragon Ball',
    name: 'Evrensel Genki Dama (Ruh Bombası)',
    subName: 'Son Goku · Gökyüzünden İnen Yıldız Küresi',
    cost: 110,
    cooldown: 1.95,
    damageLabel: '128 Süper Alan Patlaması (10m)',
    desc: 'Gökyüzünden süzülen devasa gök mavisi yaşam enerjisi küresiyle 10m alandaki tüm düşmanları siler.',
    accent: '#7dd3fc'
  },
  ultra_instinct_aura: {
    id: 'ultra_instinct_aura',
    universe: 'Dragon Ball',
    name: 'Otonom Ultra Instinct Aurası',
    subName: 'Goku & Beerus · Gümüş İlahi Refleks + Şok',
    cost: 70,
    cooldown: 1.75,
    damageLabel: '6sn Dokunulmazlık + 72 Gümüş Şok',
    desc: 'Gümüş ilahi refleks kalkanı açar (6sn tam dokunulmazlık + şifa) ve çevredeki düşmanları şok dalgasıyla savurur.',
    accent: '#e2e8f0'
  },
  luffy_bajrang_gun: {
    id: 'luffy_bajrang_gun',
    universe: 'One Piece',
    name: 'Gear 5: Bajrang Gun',
    subName: 'Monkey D. Luffy · Güneş Tanrısı Nika Yumruğu',
    cost: 100,
    cooldown: 1.75,
    damageLabel: '122 Kral Haki Şok Hasarı',
    desc: 'Gökyüzünden kızıl-siyah Kral Haki yıldırımlarıyla kaplı dev yumruk indirerek yeri sarsar!',
    accent: '#f8fafc'
  },
  zoro_king_of_hell: {
    id: 'zoro_king_of_hell',
    universe: 'One Piece',
    name: 'Cehennem Kralı: Kyutoryu Ashura',
    subName: 'Roronoa Zoro · Enma Üç Başlı Ejderha Kesisi',
    cost: 70,
    cooldown: 1.1,
    damageLabel: '102 Zümrüt-Kızıl Haki Kesisi',
    desc: 'Enma\'nın zümrüt alevi ve Kral Haki ile ileri atılıp ölümcül çapraz kılıç kesisi indirir.',
    accent: '#4ade80'
  },
  law_ope_room: {
    id: 'law_ope_room',
    universe: 'One Piece',
    name: 'Ope Ope no Mi: ROOM Gamma Knife',
    subName: 'Trafalgar Law · Taktik Cerrah Küresi',
    cost: 65,
    cooldown: 1.15,
    damageLabel: '90 İç Hasar + Shambles Işınlanma',
    desc: '9m mavi ROOM ameliyat küresi açar, hedefin yanına Shambles ile ışınlanıp zırh delen darbe vurur.',
    accent: '#22d3ee'
  },
  whitebeard_gura_haki: {
    id: 'whitebeard_gura_haki',
    universe: 'One Piece',
    name: 'Gura Gura Depremi & Kral Haki',
    subName: 'Edward Newgate · Uzay Çatlatan Deprem Yumruğu',
    cost: 90,
    cooldown: 1.55,
    damageLabel: '114 Deprem + Haki Patlaması',
    desc: 'Atmosferi çatlatan deprem küresi ve kızıl Kral Haki yıldırımlarıyla 10m çevredeki tüm düşmanları yıkar.',
    accent: '#ef4444'
  },

  // --- EXPANDED CANONICAL NARUTO SKILLS ---
  sasuke_indra_arrow: {
    id: 'sasuke_indra_arrow',
    universe: 'Naruto',
    name: 'Rinnegan: İndra\'nın Oku',
    subName: 'Sasuke Uchiha · Gök Yaran Susanoo Yıldırım Oku',
    cost: 85,
    cooldown: 1.35,
    damageLabel: '112 Delici Yıldırım + 5 Zincir Şok',
    desc: 'Susanoo yayından 34m menzilli mor-mavi İndra Oku ateşler ve çarpışma noktasında yıldırım fırtınası koparır.',
    accent: '#818cf8'
  },
  madara_tengai_shinsei: {
    id: 'madara_tengai_shinsei',
    universe: 'Naruto',
    name: 'Tengai Shinsei (Çift Göktaşı)',
    subName: 'Madara Uchiha · Gökyüzünden İnen İki Dev Meteor',
    cost: 105,
    cooldown: 1.85,
    damageLabel: '126 Çift Meteor Ezici Hasar (11m)',
    desc: 'Rinnegan mührüyle gökyüzünden art arda iki devasa kor meteor indirerek savaş alanını dümdüz eder.',
    accent: '#c084fc'
  },
  itachi_tsukuyomi_crows: {
    id: 'itachi_tsukuyomi_crows',
    universe: 'Naruto',
    name: 'Tsukuyomi & Amaterasu Kuzgunları',
    subName: 'Itachi Uchiha · Kızıl Ay İllüzyonu & Kara Alev',
    cost: 70,
    cooldown: 1.2,
    damageLabel: '90 Hasar + 4.5sn Genjutsu Felci',
    desc: 'Kızıl Ay Genjutsu alanıyla düşmanları 4.5sn hareketsiz bırakır ve dönen kara alev kuzgunlarıyla biçer.',
    accent: '#dc2626'
  },
  minato_hiraishin_lvl2: {
    id: 'minato_hiraishin_lvl2',
    universe: 'Naruto',
    name: 'Hiraishin Seviye 2: Sarı Şimşek',
    subName: 'Minato Namikaze · Zincirleme Kunai Işınlanması & Rasengan',
    cost: 60,
    cooldown: 0.95,
    damageLabel: '94 Zincir Rasengan + Anında Flash',
    desc: 'Altın Hiraishin kunaisiyle düşmanların arasına şimşek hızında ışınlanıp her birine Rasengan indirir.',
    accent: '#facc15'
  },
  kakashi_kamui_raikiri: {
    id: 'kakashi_kamui_raikiri',
    universe: 'Naruto',
    name: 'Çift Mangekyo: Kamui Raikiri',
    subName: 'Kakashi Hatake · Boyut Büken Kamui Shuriken & Yıldırım',
    cost: 75,
    cooldown: 1.2,
    damageLabel: '98 Uzay Yaran Yıldırım Kesisi',
    desc: 'Kamui dokunulmazlığıyla ileri atılıp uzayı büken siyah-turkuaz Kamui Shuriken girdabı fırlatır.',
    accent: '#38bdf8'
  },
  hashirama_mokuton_buddha: {
    id: 'hashirama_mokuton_buddha',
    universe: 'Naruto',
    name: 'Bilge Sanatı: Bin Elli Ahşap Buda',
    subName: 'Hashirama Senju · Mokuton Ejderha Sütunları & Şifa',
    cost: 85,
    cooldown: 1.45,
    damageLabel: '104 Ahşap Sütun + Mühür + Tam Şifa',
    desc: 'Yerden zümrüt Mokuton ejderha sütunları çıkararak düşmanları köklerle mühürler, sizi ve dostları iyileştirir.',
    accent: '#22c55e'
  },
  pain_shinra_chibaku: {
    id: 'pain_shinra_chibaku',
    universe: 'Naruto',
    name: 'Chibaku Tensei & Shinra Tensei',
    subName: 'Pain (Nagato) · Rinnegan Gezegen Çekimi & İlahi İtiş',
    cost: 85,
    cooldown: 1.4,
    damageLabel: '102 Çekim + Gök Fırlatma Şoku',
    desc: 'Önce karanlık yerçekimi çekirdeğiyle tüm düşmanları merkeze toplar, ardından İlahi İtiş ile göğe savurur.',
    accent: '#a855f7'
  },
  jiraiya_toad_oil_inferno: {
    id: 'jiraiya_toad_oil_inferno',
    universe: 'Naruto',
    name: 'Bilge Sanatı: Goemon Yağ Cehennemi',
    subName: 'Jiraiya · Kurbağa Yağı Alev Tufanı & Dev Rasengan',
    cost: 70,
    cooldown: 1.2,
    damageLabel: '92 Yakıcı Alev + Yanma Hasarı',
    desc: 'Kurbağa Bilgesi çakrasıyla devasa kızıl-altın alev dalgası ve Odama Rasengan patlaması oluşturur.',
    accent: '#f97316'
  },
  gaara_sand_mausoleum: {
    id: 'gaara_sand_mausoleum',
    universe: 'Naruto',
    name: 'Sabaku Sotaiso (Çöl Piramidi Mührü)',
    subName: 'Kazekage Gaara · Mutlak Kum Kalkanı & Ezici Piramit',
    cost: 70,
    cooldown: 1.3,
    damageLabel: '88 Ezici Kum + 4sn Kum Zırhı',
    desc: 'Hedef alanı dev 3B altın kum piramidine hapsedip ezer ve etrafınıza koruyucu Kum Kalkanı örer.',
    accent: '#eab308'
  },

  // --- EXPANDED CANONICAL BLEACH SKILLS ---
  ichigo_gran_rey_getsuga: {
    id: 'ichigo_gran_rey_getsuga',
    universe: 'Bleach',
    name: 'Gran Rey Cero: Getsuga Jujisho',
    subName: 'Ichigo Kurosaki · Hollow Boynuzu Çapraz Getsuga',
    cost: 75,
    cooldown: 1.15,
    damageLabel: '104 Çapraz Ruh + Cero Delici Işın',
    desc: 'Gran Rey Cero ile birleşmiş çift bıçaklı Getsuga Jujisho çapraz dalgası ateşler.',
    accent: '#fb7185'
  },
  aizen_kyoka_fragor: {
    id: 'aizen_kyoka_fragor',
    universe: 'Bleach',
    name: 'Kyoka Suigetsu & Ultra Fragor',
    subName: 'Sosuke Aizen · Mutlak Hipnoz Cam Kırılması & 6 Halka',
    cost: 80,
    cooldown: 1.35,
    damageLabel: '98 Fragor Patlaması + 4sn Hipnoz',
    desc: 'Cam gibi kırılan hipnoz halkalarıyla düşmanları dondurur ve 6 mor Hogyoku Fragor topuyla vurur.',
    accent: '#c084fc'
  },
  yamamoto_zanka_minami: {
    id: 'yamamoto_zanka_minami',
    universe: 'Bleach',
    name: 'Zanka no Tachi: Kaka Jumanokushi',
    subName: 'Genryusai Yamamoto · Küllerden Yükselen Obsidyen Alevler',
    cost: 85,
    cooldown: 1.45,
    damageLabel: '108 Volkanik Kül Mızrakları (10m)',
    desc: 'Yeri kavurup 10m alandan siyah-turuncu volkanik kül mızrakları fışkırtarak düşmanları yakar.',
    accent: '#ea580c'
  },
  kenpachi_nozarashi_cleave: {
    id: 'kenpachi_nozarashi_cleave',
    universe: 'Bleach',
    name: 'Bankai: Yachiru Nozarashi İnfazı',
    subName: 'Kenpachi Zaraki · Göktaşını İkiye Yaran Savaş İblisi',
    cost: 80,
    cooldown: 1.15,
    damageLabel: '120 Zırh Yaran Vahşi Balta Kesisi',
    desc: 'Kızıl Savaş İblisi aurasıyla ileri sıçrayıp önündeki her şeyi ikiye bölen devasa dikey-çapraz kesiş indirir!',
    accent: '#ef4444'
  },
  byakuya_hakuteiken: {
    id: 'byakuya_hakuteiken',
    universe: 'Bleach',
    name: 'Shukei: Hakuteiken (Beyaz İmparator)',
    subName: 'Byakuya Kuchiki · Saf Beyaz Kılıç Kanatları Hücumu',
    cost: 70,
    cooldown: 1.15,
    damageLabel: '96 Delici İmparator Hamlesi',
    desc: 'Binlerce bıçağı parlayan saf beyaz-pembe kanatlı tek bir imparator kılıcında toplayıp hedefi deler.',
    accent: '#f9a8d4'
  },
  ulquiorra_lanza_relampago: {
    id: 'ulquiorra_lanza_relampago',
    universe: 'Bleach',
    name: 'Segunda Etapa: Lanza del Relampago',
    subName: 'Ulquiorra Cifer · Zümrüt-Siyah Cehennem Mızrağı',
    cost: 85,
    cooldown: 1.4,
    damageLabel: '114 Zümrüt Sütun Patlaması (30m)',
    desc: 'Saf zümrüt-siyah ruh enerjisinden oluşan mızrağı fırlatarak ufukta dev bir yeşil sütun patlaması yaratır.',
    accent: '#10b981'
  },
  grimmjow_desgarron: {
    id: 'grimmjow_desgarron',
    universe: 'Bleach',
    name: 'Pantera: Desgarron (Kralın Pençeleri)',
    subName: 'Grimmjow Jaegerjaquez · 5 Dev Turkuaz Panter Pençesi',
    cost: 65,
    cooldown: 1.0,
    damageLabel: '95 × 5 Yırtıcı Pençe Dalgası',
    desc: '24 metre ileri uzanan 5 paralel dev neon-mavi enerji pençesiyle hattaki tüm düşmanları parçalar.',
    accent: '#06b6d4'
  },
  hitsugaya_hyorinmaru_dragon: {
    id: 'hitsugaya_hyorinmaru_dragon',
    universe: 'Bleach',
    name: 'Daiguren Hyorinmaru: Buz Ejderhası',
    subName: 'Toshiro Hitsugaya · Tenso Jurin Kış Ejderhası Kasırgası',
    cost: 75,
    cooldown: 1.3,
    damageLabel: '96 Buz Kasırgası + 5.5sn Donma',
    desc: 'Gökyüzünden dönen dev turkuaz buz ejderhası kasırgası indirip 10m içindeki tüm hedefleri buz kristaline hapseder.',
    accent: '#22d3ee'
  },
  rukia_hakka_no_togame: {
    id: 'rukia_hakka_no_togame',
    universe: 'Bleach',
    name: 'Bankai: Hakka no Togame (-273.15°C)',
    subName: 'Rukia Kuchiki · Mutlak Sıfır Beyaz Kar Kubbesi',
    cost: 80,
    cooldown: 1.4,
    damageLabel: '100 Mutlak Sıfır + 6sn Tam Buzul',
    desc: '11m yarıçaplı saf beyaz mutlak sıfır sisi yayarak temas eden tüm düşmanları anında dondurup kırar.',
    accent: '#e0f2fe'
  },
  urahara_benihime_net: {
    id: 'urahara_benihime_net',
    universe: 'Bleach',
    name: 'Bankai: Kannonbiraki Benihime',
    subName: 'Kisuke Urahara · Kızıl Yeniden Yapılandırma Ağı',
    cost: 75,
    cooldown: 1.25,
    damageLabel: '94 Zırh Söken Kızıl Ağ + Tam Onarım',
    desc: 'Kızıl-altın dikiş halkalarıyla düşmanların savunmasını parçalar, canınızı ve kalkanınızı yeniden yapılandırır.',
    accent: '#f43f5e'
  },

  // --- EXPANDED CANONICAL DRAGON BALL SKILLS ---
  vegeta_ultra_ego_hakai: {
    id: 'vegeta_ultra_ego_hakai',
    universe: 'Dragon Ball',
    name: 'Ultra Ego: Yıkım Küresi (Hakai)',
    subName: 'Prens Vegeta · Mor Yıkım Tanrısı İmha Enerjisi',
    cost: 90,
    cooldown: 1.45,
    damageLabel: '116 Hakai İmha Hasarı + Güç Artışı',
    desc: 'Koyu eflatun Hakai yıkım küresiyle hedefleri siler ve savaş coşkusuyla 15sn ekstra saldırı gücü verir.',
    accent: '#c026d3'
  },
  gohan_makankosappo: {
    id: 'gohan_makankosappo',
    universe: 'Dragon Ball',
    name: 'Beast Gohan: İlahi Makankosappo',
    subName: 'Son Gohan · Kızıl-Gümüş Çift Sarmal Delici Işın',
    cost: 80,
    cooldown: 1.25,
    damageLabel: '118 Zırh Delen Kritik Matkap Işını',
    desc: '36 metre boyunca uzayı matkap gibi delen kızıl-gümüş sarmal Makankosappo ışını ateşler.',
    accent: '#f43f5e'
  },
  broly_gigantic_catastrophe: {
    id: 'broly_gigantic_catastrophe',
    universe: 'Dragon Ball',
    name: 'Efsanevi: Gigantic Omegastorm',
    subName: 'Broly · Zümrüt Süpernova & Yeşil Ki Yağmuru',
    cost: 95,
    cooldown: 1.55,
    damageLabel: '122 Zümrüt Ki Tufanı (10.5m)',
    desc: 'Devasa zümrüt yeşili Ki küresi ve 8 patlayıcı plazma meteoruyla alanı yerle bir eder.',
    accent: '#4ade80'
  },
  gogeta_stardust_breaker: {
    id: 'gogeta_stardust_breaker',
    universe: 'Dragon Ball',
    name: 'Stardust Breaker (Soul Punisher)',
    subName: 'Gogeta Blue · Gökkuşağı Prizma Yıldız Arındırması',
    cost: 95,
    cooldown: 1.55,
    damageLabel: '124 Prizmatik Yıldız Patlaması',
    desc: 'Gökkuşağı prizması enerjisini hedefte 12 kristal yıldız ışınına ayırarak kötülüğü tamamen arındırır.',
    accent: '#38bdf8'
  },
  beerus_hakai_sphere: {
    id: 'beerus_hakai_sphere',
    universe: 'Dragon Ball',
    name: 'Yıkım Tanrısı: Hakai Güneşi',
    subName: 'Lord Beerus · 7. Evren Mutlak İmha Küresi',
    cost: 105,
    cooldown: 1.75,
    damageLabel: '130 Tanrısal Hakai Silici Hasar',
    desc: 'Gökyüzünden mor-altın Yıkım Güneşi indirerek 10m içindeki tüm düşmanları mor yıldız tozuna çevirir.',
    accent: '#a855f7'
  },
  goku_black_scythe_rift: {
    id: 'goku_black_scythe_rift',
    universe: 'Dragon Ball',
    name: 'Super Saiyan Rosé: Boyut Tırpanı',
    subName: 'Goku Black · İlahi Keder Tırpanı & Pembe Ki Yarığı',
    cost: 80,
    cooldown: 1.25,
    damageLabel: '108 Boyut Yarığı + Ki İğneleri',
    desc: 'Pembe-kızıl Ki Tırpanıyla uzayı yırtıp içinden patlayıcı ilahi Ki mızrakları saçar.',
    accent: '#ec4899'
  },
  frieza_black_supernova: {
    id: 'frieza_black_supernova',
    universe: 'Dragon Ball',
    name: 'Black Frieza: İmparator Ölüm Küresi',
    subName: 'Frieza · Siyah-Altın Gezegen Yıkan Supernova',
    cost: 95,
    cooldown: 1.55,
    damageLabel: '124 Karanlık Altın Supernova',
    desc: 'Obsidyen-altın Ölüm Küresiyle düşmanları merkeze çekip devasa mor yıldırımlarla patlatır.',
    accent: '#eab308'
  },
  piccolo_hellzone_orange: {
    id: 'piccolo_hellzone_orange',
    universe: 'Dragon Ball',
    name: 'Orange Piccolo: Hellzone Bombardımanı',
    subName: 'Piccolo · 10 Güdümlü Turuncu Ki Küresi + Dev Yumruk',
    cost: 75,
    cooldown: 1.25,
    damageLabel: '102 Çevreleme Patlaması + Kalkan',
    desc: 'Hedefin etrafını 10 turuncu Ki küresiyle sarıp aynı anda patlatır ve Namek zırh yenilenmesi verir.',
    accent: '#fb923c'
  },
  trunks_sword_of_hope: {
    id: 'trunks_sword_of_hope',
    universe: 'Dragon Ball',
    name: 'Gelecek Trunks: Umut Ruhu Kılıcı',
    subName: 'Trunks · Gök Mavisi Dev Genki Kılıcı İnfazı',
    cost: 80,
    cooldown: 1.25,
    damageLabel: '110 Dev Ruh Kılıcı Kesisi',
    desc: 'Tüm dünyadan toplanan mavi-altın Genki enerjisini dev bir kılıca dönüştürüp ileri atılarak biçer.',
    accent: '#60a5fa'
  },

  // --- EXPANDED CANONICAL ONE PIECE SKILLS ---
  luffy_dawn_gatling: {
    id: 'luffy_dawn_gatling',
    universe: 'One Piece',
    name: 'Gear 5: Gomu Gomu no Dawn Star Gun',
    subName: 'Monkey D. Luffy · Beyaz Nika Yıldız Yumruğu Yağmuru',
    cost: 70,
    cooldown: 1.1,
    damageLabel: '98 Yıldız Halkalı Haki Darbesi',
    desc: 'Güneş Tanrısı Nika hızıyla ileri fırlayıp beyaz bulut halkaları ve yıldız şok dalgalarıyla sersemletir.',
    accent: '#fde047'
  },
  zoro_dragon_damnation: {
    id: 'zoro_dragon_damnation',
    universe: 'One Piece',
    name: 'Santoryu: Kokujo O Tatsumaki',
    subName: 'Roronoa Zoro · Zümrüt-Siyah Haki Ejderha Kasırgası',
    cost: 75,
    cooldown: 1.2,
    damageLabel: '104 Dönen Kılıç Kasırgası (9.5m)',
    desc: 'Üç kılıcıyla gökyüzüne uzanan yeşil-kızıl Kral Haki kasırgası yaratarak tüm düşmanları havaya savurup doğrar.',
    accent: '#22c55e'
  },
  shanks_kamusari: {
    id: 'shanks_kamusari',
    universe: 'One Piece',
    name: 'Kızıl Saç: İlahi Kalkış (Kamusari)',
    subName: 'Shanks · Gryphon Kral Haki Şimşek İnfazı',
    cost: 85,
    cooldown: 1.3,
    damageLabel: '120 Kızıl-Siyah Kral Haki Yarığı',
    desc: 'Göz açıp kapayıncaya kadar ileri atılıp kızıl-siyah Kral Haki yıldırımlarıyla dev şok dalgası vurur!',
    accent: '#dc2626'
  },
  kaido_thunder_bagua: {
    id: 'kaido_thunder_bagua',
    universe: 'One Piece',
    name: 'Kaido: Ölüm Yıkan Raimei Hakke',
    subName: 'Canavarlar Kralı · Gök Gürültüsü Bagua & Ejderha Nefesi',
    cost: 90,
    cooldown: 1.4,
    damageLabel: '118 Yıldırım Kanabo + Ejderha Alevi',
    desc: 'Mavi ejderha alevi ve mor-siyah Kral Haki kaplı gürz atılışıyla önündeki her şeyi ezer.',
    accent: '#3b82f6'
  },
  mihawk_kokuto_yoru: {
    id: 'mihawk_kokuto_yoru',
    universe: 'One Piece',
    name: 'Şahin Göz: Kara Kılıç Yoru Gece Kesisi',
    subName: 'Dracule Mihawk · Buzdağı Yaran Zümrüt Kılıç Dalgası',
    cost: 80,
    cooldown: 1.2,
    damageLabel: '116 34m Geniş Zümrüt Kılıç Dalgası',
    desc: 'Dünyanın en güçlü kara kılıcı Yoru ile 34 metre boyunca her engeli ikiye bölen zümrüt-mor dalga gönderir.',
    accent: '#10b981'
  },
  sanji_ifrit_boeuf_burst: {
    id: 'sanji_ifrit_boeuf_burst',
    universe: 'One Piece',
    name: 'Ifrit Jambe: Boeuf Burst Mavi Alev',
    subName: 'Vinsmoke Sanji · Beyaz-Mavi Yıldırımlı Plazma Tekmesi',
    cost: 65,
    cooldown: 1.0,
    damageLabel: '96 Mavi Plazma Tekmesi + Hava Adımı',
    desc: 'Gökyüzü Yürüyüşü ile hedefin üstüne atılıp beyaz yıldırımlı kobalt-mavi Ifrit Jambe patlaması indirir.',
    accent: '#38bdf8'
  },
  ace_dai_enkai_entei: {
    id: 'ace_dai_enkai_entei',
    universe: 'One Piece',
    name: 'Ateş Yumruk: Dai Enkai — Entei',
    subName: 'Portgas D. Ace · Alev İmparatoru Güneş Küresi',
    cost: 85,
    cooldown: 1.4,
    damageLabel: '112 Minyatür Güneş Patlaması (10m)',
    desc: 'Gökyüzünde devasa bir Mera Mera güneş küresi oluşturup savaş meydanının ortasına indirir.',
    accent: '#f97316'
  },
  sabo_flame_dragon_king: {
    id: 'sabo_flame_dragon_king',
    universe: 'One Piece',
    name: 'Ryusoken: Alev Ejderha Kralının Pençesi',
    subName: 'Sabo · Çekirdek Kırıcı Haki & Alev Sarmalı',
    cost: 75,
    cooldown: 1.2,
    damageLabel: '104 Çekirdek Kırıcı Alev Sarmalı',
    desc: 'Ejderha Pençesi Haki ile zeminin çekirdeğini kırıp döner alev sütunuyla düşmanları havaya uçurur.',
    accent: '#fbbf24'
  },

  // --- MYTHIC RPG CLASS SIGNATURE SKILLS ---
  rpg_dragon_slayer_cleave: {
    id: 'rpg_dragon_slayer_cleave',
    universe: 'RPG Sınıf',
    name: 'Ejderha Şövalyesi: Kızıl Ejderbiçer Yargısı',
    subName: 'Sınıf İmza Gücü · Lav Yarığı & Alev Zırhı',
    cost: 70,
    cooldown: 1.2,
    damageLabel: '106 Ağır Kılıç Yarığı + Zırh Kalkanı',
    desc: 'Ejderha Biçen kılıçla yeri yarıp kızıl magma sütunu çıkarır ve 4sn ejderha pulu zırhı verir.',
    accent: '#ef4444'
  },
  rpg_astral_meteor_storm: {
    id: 'rpg_astral_meteor_storm',
    universe: 'RPG Sınıf',
    name: 'Astral Başbüyücü: Kozmik Meteor Yağmuru',
    subName: 'Sınıf İmza Gücü · Yıldız Kümeleri & Büyü Dolumu',
    cost: 85,
    cooldown: 1.45,
    damageLabel: '116 Çift Astral Meteor + Alan Şoku',
    desc: 'Yıldız haritası mührü açarak hedef bölgeye kozmik kristal meteorlar yağdırır.',
    accent: '#818cf8'
  },
  rpg_shadow_lotus_assault: {
    id: 'rpg_shadow_lotus_assault',
    universe: 'RPG Sınıf',
    name: 'Gölge Suikastçı: Bin Bıçak Gölge Dansı',
    subName: 'Sınıf İmza Gücü · Sırt İnfazı & Görünmez Adım',
    cost: 55,
    cooldown: 0.9,
    damageLabel: '98 Kritik Sırt İnfazı + Hız',
    desc: 'Gölge dumanıyla hedefin arkasına süzülüp 360° mor hançer fırtınasıyla kritik darbe vurur.',
    accent: '#c084fc'
  },
  rpg_paladin_divine_sanctuary: {
    id: 'rpg_paladin_divine_sanctuary',
    universe: 'RPG Sınıf',
    name: 'Kutsal Paladin: Cennet Mabedi & Çekiç',
    subName: 'Sınıf İmza Gücü · Altın Işık Sütunu & Tam Koruma',
    cost: 70,
    cooldown: 1.4,
    damageLabel: '92 Kutsal Işık + 6sn Ölümsüz Kalkan',
    desc: 'Gökyüzünden kutsal altın ışık sütunu indirerek düşmanları yakar, sizi ve tüm dostları tam iyileştirir.',
    accent: '#fde047'
  },

  // --- ORIGINAL & LEGENDARY MINECRAFT SKILLS ---
  mc_steve_creative_anvil: {
    id: 'mc_steve_creative_anvil',
    universe: 'Minecraft',
    name: 'Minecraft Ustası: Örs & TNT Fırtınası',
    subName: 'Steve & Alex · Gökten İnen 3B Demir Örsler & Elmas Kesiş',
    cost: 55,
    cooldown: 1.05,
    damageLabel: '96 Ezici Örs + TNT Şok Dalgası',
    desc: 'Hedef düşmanların tepesine ağır 3B demir örsler ve güvenli kızıltaş şok dalgası indirip sersemletir!',
    accent: '#22d3ee'
  },
  mc_herobrine_fog_wrath: {
    id: 'mc_herobrine_fog_wrath',
    universe: 'Minecraft',
    name: 'Herobrine: Beyaz Gözlü Sis & Yıldırım',
    subName: 'Efsanevi Herobrine · Hayalet Işınlanma & 8 Beyaz Şimşek',
    cost: 75,
    cooldown: 1.25,
    damageLabel: '112 Beyaz Yıldırım + Korku Felci',
    desc: 'Beyaz göz parlamasıyla ileri ışınlanır ve 16m içindeki tüm düşmanlara bembeyaz şimşekler indirir!',
    accent: '#f8fafc'
  },
  mc_technoblade_blood_god: {
    id: 'mc_technoblade_blood_god',
    universe: 'Minecraft',
    name: 'Technoblade Never Dies: Kraliyet Hücumu',
    subName: 'Kan Tanrısı · Ölümsüz Altın Taç + Havai Fişek Yaylımı',
    cost: 70,
    cooldown: 1.2,
    damageLabel: '108 Kraliyet Darbesi + 5sn Ölümsüzlük',
    desc: '5sn ölümsüz Kraliyet Tacı kalkanı açar, ileri atılıp kızıl-altın havai fişek patlamalarıyla orduları devirir!',
    accent: '#f43f5e'
  },
  mc_warden_sonic_boom: {
    id: 'mc_warden_sonic_boom',
    universe: 'Minecraft',
    name: 'Antik Derinlik: Sculk Sonik Patlama',
    subName: 'Warden Şövalyesi · Zırh Delen 28m Sonik Ses Halkaları',
    cost: 70,
    cooldown: 1.15,
    damageLabel: '110 Zırh Delen Sonik Şok Halkası',
    desc: 'Göğüs çekirdeğinden 28m boyunca tüm zırhları ve kalkanları delen turkuaz Sculk sonik halkaları ateşler!',
    accent: '#14b8a6'
  },

  // --- WAVE 18: COMPLETE BLEACH THOUSAND-YEAR BLOOD WAR CAPTAINS, STERNNRITTER & ESPADA ---
  shunsui_karamatsu_shinju: {
    id: 'shunsui_karamatsu_shinju',
    universe: 'Bleach',
    name: 'Bankai: Katen Kyōkotsu Karamatsu Shinjū',
    subName: 'Shunsui Kyōraku · Dört Perdelik Uçurum & Kızıl İplik İnfazı',
    cost: 120,
    cooldown: 12.5,
    damageLabel: '124 Uçurum Perdesi + İto Kiri İnfazı',
    desc: '12m alanı karanlık su uçurumuna ve kara çam ağaçlarına boğar, Shime no Dan kızıl ipliğiyle düşmanları infaz eder.',
    accent: '#e11d48'
  },
  yhwach_almighty_auswahlen: {
    id: 'yhwach_almighty_auswahlen',
    universe: 'Bleach',
    name: 'Schrift A: The Almighty & Auswählen',
    subName: 'Yhwach · Geleceği Değiştiren Kutsal Quincy Işık Sütunları',
    cost: 135,
    cooldown: 14.0,
    damageLabel: '132 Kutsal Yargı + Can/Özümseme',
    desc: 'Gökyüzünden 6 kutsal Quincy Auswählen ışık sütunu indirerek düşmanların yaşam gücünü emer ve geleceği yazar.',
    accent: '#38bdf8'
  },
  ichibe_shirafude_ichimonji: {
    id: 'ichibe_shirafude_ichimonji',
    universe: 'Bleach',
    name: 'Shin\'uchi: Shirafude Ichimonji (İsim Mührü)',
    subName: 'Ichibē Hyōsube · Futen Taisatsuryō Siyah Mürekkep Mabedi',
    cost: 130,
    cooldown: 13.5,
    damageLabel: '128 İsim Silme + Karanlık Mabed',
    desc: 'Kraliyet mürekkebiyle düşmanların adını ve savunmasını siler, kara anıt mezarla 11m alanı mühürler.',
    accent: '#f8fafc'
  },
  unohana_minazuki: {
    id: 'unohana_minazuki',
    universe: 'Bleach',
    name: 'Bankai: Minazuki (Kızıl Kan Denizi)',
    subName: 'Retsu Unohana · İlk Kenpachi Asidik Kan Dalgaları & Tam Şifa',
    cost: 115,
    cooldown: 11.5,
    damageLabel: '118 Kızıl Kan Kesisi + Tam Yenilenme',
    desc: 'Etrafı kızıl Minazuki kan denizine çevirir, ölümcül kavisli kan bıçaklarıyla biçerken sizi tamamen iyileştirir.',
    accent: '#dc2626'
  },
  yoruichi_raijin_senkei: {
    id: 'yoruichi_raijin_senkei',
    universe: 'Bleach',
    name: 'Shunkō: Raijin Senkei — Yıldırım Tanrıçası',
    subName: 'Yoruichi Shihōin · Mor Yıldırım Pençesi & Anında Shunpo',
    cost: 95,
    cooldown: 8.5,
    damageLabel: '110 Yıldırım Pençesi + Şok Felci',
    desc: 'Shunpo ile hedefin tepesine ışınlanıp devasa mor Shunkō yıldırım sütunu ve kedi-tanrıça pençesi indirir.',
    accent: '#a855f7'
  },
  gin_kamishini_no_yari: {
    id: 'gin_kamishini_no_yari',
    universe: 'Bleach',
    name: 'Bankai: Kamishini no Yari — Korose',
    subName: 'Gin Ichimaru · Mach 500 Hızında 13km Hücresel Zehir Mızrağı',
    cost: 105,
    cooldown: 9.5,
    damageLabel: '122 Anında Delici Kılıç + Hücre Zehri',
    desc: 'Göz açıp kapayıncaya kadar 38m boyunca tüm hedefleri delip içlerinde ölümcül Korose hücre zehri patlatır.',
    accent: '#67e8f9'
  },
  mayuri_ashisogi_jizo: {
    id: 'mayuri_ashisogi_jizo',
    universe: 'Bleach',
    name: 'Bankai: Konjiki Ashisogi Jizō',
    subName: 'Mayuri Kurotsuchi · Altın Jizō Bıçakları & Ölümcül Sinir Sisi',
    cost: 110,
    cooldown: 11.0,
    damageLabel: '108 Zehirli Bıçak + 6sn Sinir Felci',
    desc: '11m alana mor ölümcül sinir gazı ve altın Ashisogi bıçakları yayarak tüm düşmanları felç edip eritir.',
    accent: '#facc15'
  },
  renji_soo_zabimaru: {
    id: 'renji_soo_zabimaru',
    universe: 'Bleach',
    name: 'Gerçek Bankai: Sōō Zabimaru — Zaga Teppō',
    subName: 'Renji Abarai · Dev Kızıl Yılan Çenesi Reiatsu Patlaması',
    cost: 105,
    cooldown: 10.0,
    damageLabel: '116 Yılan Çenesi + Ruh Alevi Sütunu',
    desc: 'İleri atılıp hedefi dev kızıl kemik yılan çenesine kıstırır ve Zaga Teppō Reiatsu topuyla küle çevirir.',
    accent: '#ef4444'
  },
  komamura_tengen_myoo: {
    id: 'komamura_tengen_myoo',
    universe: 'Bleach',
    name: 'Bankai: Kokujō Tengen Myō\'ō — Dangai Jōe',
    subName: 'Sajin Komamura · Göğe Uzanan Ölümsüz Dev Samuray Kesisi',
    cost: 115,
    cooldown: 11.5,
    damageLabel: '124 Dev Samuray Odachi Yargısı',
    desc: 'Arkanızda yükselen 7 metrelik kızıl zırhlı Dev Samuray, kılıcını yere indirerek 12m şok yarığı açar!',
    accent: '#f97316'
  },
  uryu_antithesis_licht: {
    id: 'uryu_antithesis_licht',
    universe: 'Bleach',
    name: 'Vollständig: Licht Regen & The Antithesis',
    subName: 'Uryū Ishida · 1000 Kutsal Quincy Işık Oku Yağmuru',
    cost: 100,
    cooldown: 9.5,
    damageLabel: '112 Kutsal Reishi Ok Fırtınası',
    desc: 'Gökyüzünde Quincy yıldızı açarak hedef alana yüzlerce delici mavi Reishi ışık oku yağdırır ve yaraları yansıtır.',
    accent: '#38bdf8'
  },
  jugram_balance_shield: {
    id: 'jugram_balance_shield',
    universe: 'Bleach',
    name: 'Schrift B: The Balance (Talih Terazisi)',
    subName: 'Jugram Haschwalth · Freund Schild Mutlak Kalkan & Çifte Yargı',
    cost: 110,
    cooldown: 11.0,
    damageLabel: '118 Terazi İnfazı + 5sn Kalkan',
    desc: 'Altın Sternritter terazisiyle düşmanlara iki kat talihsizlik hasarı indirir ve sizi koruma kalkanına alır.',
    accent: '#fde047'
  },
  starrk_cero_metralleta: {
    id: 'starrk_cero_metralleta',
    universe: 'Bleach',
    name: 'Los Lobos: Cero Metralleta & Ruh Kurtları',
    subName: 'Primera Espada Starrk · Sonsuz Mavi Cero & Patlayan Kurt Sürüsü',
    cost: 110,
    cooldown: 10.5,
    damageLabel: '116 Çoklu Mavi Cero Bombardımanı',
    desc: '1. Espada gücüyle art arda mavi Cero ışınları ve hedeflere atılıp patlayan mavi ruh kurtları salar.',
    accent: '#38bdf8'
  },
  barragan_respira: {
    id: 'barragan_respira',
    universe: 'Bleach',
    name: 'Arrogante: Respira (Yaşlandıran Ölüm Sisi)',
    subName: '2. Espada Baraggan · Zaman Çürüten Mor Kafatası Dalgaları',
    cost: 120,
    cooldown: 12.0,
    damageLabel: '122 Çürüme Sisi + Yavaşlatma',
    desc: 'Hueco Mundo Kralının mor Respira çürüme sisini yayarak dokunduğu her düşmanı yaşlandırıp kemiklerine kadar eritir.',
    accent: '#9333ea'
  },
  shinji_sakanade: {
    id: 'shinji_sakanade',
    universe: 'Bleach',
    name: 'Bankai: Sakashima Yokoshima Happōfusagari',
    subName: 'Shinji Hirako · Ters Dünya Pembe-Altın Sis Halkası & Şaşırtma',
    cost: 100,
    cooldown: 10.5,
    damageLabel: '106 Ters Algı Halkası + Sersemletme',
    desc: 'Altın Nilüfer tahtından pembe ters-algı halkaları yayarak tüm düşmanların yönünü şaşırtıp sersemletir.',
    accent: '#facc15'
  },

  // --- WAVE 18: COMPLETE NARUTO SHIPPUDEN KAGE, AKATSUKI, JINCHURIKI & OTSUTSUKI ---
  obito_kamui_nunoboko: {
    id: 'obito_kamui_nunoboko',
    universe: 'Naruto',
    name: 'Altı Yol: Kutsal Kılıç Nunoboko & Kamui',
    subName: 'Obito Uchiha (Juubito) · Hakikat Küresi DNA Kılıcı & Uzay Yarığı',
    cost: 125,
    cooldown: 12.5,
    damageLabel: '126 Hakikat Kılıcı + Kamui Dokunulmazlık',
    desc: '9 Gudōdama küresini dev DNA sarmalı Nunoboko kılıcına dönüştürüp savaş alanını boydan boya biçer!',
    accent: '#a855f7'
  },
  might_guy_night_guy: {
    id: 'might_guy_night_guy',
    universe: 'Naruto',
    name: 'Sekizinci Ölüm Kapısı: Gece Guy (Yagai)',
    subName: 'Might Guy · Uzayı Büken Kızıl Buhar Ejderhası Tekmesi',
    cost: 130,
    cooldown: 13.5,
    damageLabel: '136 Uzay Büken Kızıl Ejderha Darbesi',
    desc: 'Sekizinci Ölüm Kapısını açıp kan buharından kükreyen kızıl ejderha aurasıyla ileri uçarak her şeyi parçalar!',
    accent: '#ef4444'
  },
  rock_lee_ura_renge: {
    id: 'rock_lee_ura_renge',
    universe: 'Naruto',
    name: 'Altıncı Kapı: Ura Renge & Asa Kujaku',
    subName: 'Rock Lee · Ses Hızını Aşan Yeşil Çakra Kasırgası & Alev Yumrukları',
    cost: 90,
    cooldown: 8.5,
    damageLabel: '108 Taijutsu Kasırgası + Hava Darbesi',
    desc: 'Ağırlıklarını atıp Yeşil İç Kapı aurasıyla hedefin etrafında ses üstü hızda dönerek gökten yere çakar!',
    accent: '#22c55e'
  },
  kaguya_expansive_tsb: {
    id: 'kaguya_expansive_tsb',
    universe: 'Naruto',
    name: 'Bōchō Gudōdama & Kül Eden Kemikler',
    subName: 'Kaguya Ōtsutsuki · Dünyayı Silen Dev Hakikat Küresi & Boyut Yırtışı',
    cost: 140,
    cooldown: 14.5,
    damageLabel: '138 Boyut Silici Küre + Kül Kemikleri',
    desc: 'Çakranın Atası Kaguya gökyüzünde devasa siyah-kızıl Bōchō Gudōdama oluşturup 12m alanı tamamen siler!',
    accent: '#f43f5e'
  },
  hagoromo_creation_seal: {
    id: 'hagoromo_creation_seal',
    universe: 'Naruto',
    name: 'Rikudō: Altı Yol Chibaku Tensei Mührü',
    subName: 'Hagoromo Ōtsutsuki · Güneş ve Ay Yin-Yang Yaratılış Küresi',
    cost: 135,
    cooldown: 14.0,
    damageLabel: '132 Yin-Yang Gezegen Mührü + Şifa',
    desc: 'Altı Yolun Bilgesi 9 Gudōdama ve Yin-Yang mührüyle düşmanları göksel uydu çekirdeğine hapseder.',
    accent: '#fde047'
  },
  tobirama_suiryudan: {
    id: 'tobirama_suiryudan',
    universe: 'Naruto',
    name: 'Suiton: Suiryūdan & Hiraishin Giri',
    subName: '2. Hokage Tobirama Senju · Dev Su Ejderhası & Anında Kesici Işınlanma',
    cost: 100,
    cooldown: 9.5,
    damageLabel: '112 Su Ejderhası Tufanı + Işınlanma Kesisi',
    desc: 'El mühürleriyle kükreyen dev mavi Su Ejderhası çağırır ve Hiraishin Giri ile hedefi anında biçer.',
    accent: '#0ea5e9'
  },
  hiruzen_five_elements: {
    id: 'hiruzen_five_elements',
    universe: 'Naruto',
    name: 'Goton: Dairendan (Beş Element Tufanı)',
    subName: '3. Hokage Hiruzen Sarutobi · Ateş, Yıldırım, Su, Toprak, Rüzgar!',
    cost: 110,
    cooldown: 11.0,
    damageLabel: '118 5 Element Kombosu + Enma Darbesi',
    desc: 'Profesör Hokage 5 gölge klonuyla aynı anda Ateş, Yıldırım, Su, Toprak ve Rüzgar tufanı ateşler!',
    accent: '#f59e0b'
  },
  tsunade_byakugo_smash: {
    id: 'tsunade_byakugo_smash',
    universe: 'Naruto',
    name: 'Byakugō: Cennet Yaran Tekme & 100 Şifa',
    subName: '5. Hokage Tsunade · Yeri Yaran Deprem Darbesi & Ölümsüz Yenilenme',
    cost: 100,
    cooldown: 10.0,
    damageLabel: '114 Krater Şok Dalgası + Tam Can Yenileme',
    desc: 'Alnındaki Byakugō mührünü açarak yeri parçalayan devasa şok dalgası vurur ve canınızı anında doldurur.',
    accent: '#4ade80'
  },
  orochimaru_hydra: {
    id: 'orochimaru_hydra',
    universe: 'Naruto',
    name: 'Yasak Sanat: Yamata no Jutsu (8 Başlı Hydra)',
    subName: 'Orochimaru · Dev Beyaz Sekiz Başlı Yılan & Kusanagi Felci',
    cost: 105,
    cooldown: 11.0,
    damageLabel: '114 Yılan Tufanı + Zehir Hasarı',
    desc: 'Sekiz Başlı Dev Beyaz Yılan fırtınası ve uzayan Kusanagi kılıcıyla 10m alandaki tüm düşmanları zehirleyip biçer.',
    accent: '#a855f7'
  },
  killer_bee_lariat_bijudama: {
    id: 'killer_bee_lariat_bijudama',
    universe: 'Naruto',
    name: 'Hachibi: Sekiz Kılıç Kasırgası & Bijūdama',
    subName: 'Killer Bee · Yıldırım Lariat & Sekiz Kuyruk Canavar Topu',
    cost: 110,
    cooldown: 10.5,
    damageLabel: '118 Yıldırım Lariat + Bijūdama Patlaması',
    desc: 'Sekiz Kuyruk çakra peleriniyle ileri Lariat atılışı yapar ve mor-kızıl Bijūdama küresi patlatır!',
    accent: '#ef4444'
  },
  kisame_water_shark_dome: {
    id: 'kisame_water_shark_dome',
    universe: 'Naruto',
    name: 'Suiton: Daikōdan (Dev Çakra Köpekbalığı)',
    subName: 'Kisame Hoshigaki · Çakra Yutan Okyanus Kubbesi & Köpekbalığı Sürüsü',
    cost: 105,
    cooldown: 10.5,
    damageLabel: '114 Su Kubbesi + Çakra/Can Çalma',
    desc: 'Savaş alanını dev okyanus kubbesine çevirip düşmanların çakrasını emen dev su köpekbalığı fırlatır.',
    accent: '#0284c7'
  },
  shisui_kotoamatsukami: {
    id: 'shisui_kotoamatsukami',
    universe: 'Naruto',
    name: 'Mangekyō: Kotoamatsukami & Yeşil Susanoo',
    subName: 'Shisui Uchiha · Mutlak Göz İllüzyonu & Zümrüt Susanoo Tsukumo',
    cost: 110,
    cooldown: 11.5,
    damageLabel: '116 Zümrüt Susanoo Mızrakları + 5sn Hipnoz',
    desc: 'Kotoamatsukami ile tüm düşmanları 5sn dondurur ve Zümrüt Susanoo göğsünden yeşil çakra mızrakları yağdırır.',
    accent: '#10b981'
  },
  deidara_c4_karura: {
    id: 'deidara_c4_karura',
    universe: 'Naruto',
    name: 'Patlayıcı Sanat: C4 Karura — KATSU!',
    subName: 'Deidara · Altın Mikro-Kil Bulutu & Dev C3 Sanat Patlaması',
    cost: 105,
    cooldown: 10.5,
    damageLabel: '120 Hücresel Kil Bombası (11m)',
    desc: 'El ağızlarından yoğurduğu C4 patlayıcı kil devini "Sanat bir patlamadır — KATSU!" diyerek havaya uçurur!',
    accent: '#facc15'
  },
  hidan_jashin_ritual: {
    id: 'hidan_jashin_ritual',
    universe: 'Naruto',
    name: 'Jashin Ayini: Ölüm Hüküm Kan Çemberi',
    subName: 'Hidan · Üç Bıçaklı Tırpan & Kızıl Üçgen Kan Mührü',
    cost: 95,
    cooldown: 9.5,
    damageLabel: '112 Ruhsal Kan Yansıması + Ölümsüzlük',
    desc: 'Yere parlayan kızıl Jashin üçgen çemberi çizer, üç bıçaklı tırpanla bölgedeki tüm düşmanların kalbini mühürler.',
    accent: '#e11d48'
  },
  hinata_twin_lion_64palms: {
    id: 'hinata_twin_lion_64palms',
    universe: 'Naruto',
    name: 'Jūken: Çift Aslan Yumruğu & 64 Avuç',
    subName: 'Hinata Hyūga · Byakugan 8 Trigram Bagua Çemberi & Aslan Çakrası',
    cost: 90,
    cooldown: 9.0,
    damageLabel: '108 Çakra Kilidi + Mor Aslan Darbesi',
    desc: 'Yerde parlayan 8 Trigram Bagua mührü açar, ellerindeki çift mor çakra aslanıyla 64 darbe indirip dondurur.',
    accent: '#c084fc'
  }
};

// Normalize all legacy sub-3s arcade cooldowns to authentic anime pacing (8.0s - 14.5s)
for (const sk of Object.values(TENSURA_SKILLS)) {
  if (sk.cooldown < 4.0) {
    sk.cooldown = Math.round((6.0 + sk.cooldown * 4.5) * 10) / 10;
  }
  if (sk.cost < 70) {
    sk.cost = Math.round(sk.cost * 1.45);
  }
}

export const ALL_SKILL_IDS: TensuraSkillId[] = Object.keys(TENSURA_SKILLS) as TensuraSkillId[];

export interface TensuraCharacterDef {
  rank: number;
  id: string;
  name: string;
  title: string;
  universe: Exclude<AnimeUniverse, 'all'>;
  faction: Exclude<TensuraFaction, 'all'>;
  epValue: number;
  epDisplay: string;
  signatureSkill: TensuraSkillId;
  secondarySkill: TensuraSkillId;
  canFly: boolean;
  canSlimeShift?: boolean;
  armorBonus: number;
  dmgBonus: number;
  speedMult: number;
  visual: CharacterVisualSpec;
}

function mkChar(
  rank: number,
  id: string,
  name: string,
  title: string,
  faction: Exclude<TensuraFaction, 'all'>,
  epValue: number,
  epDisplay: string,
  signatureSkill: TensuraSkillId,
  secondarySkill: TensuraSkillId,
  opts: {
    universe?: Exclude<AnimeUniverse, 'all'>;
    skin?: string;
    hair: string;
    eyes: string;
    shirt: string;
    pants?: string;
    boots?: string;
    horns?: CharacterVisualSpec['horns'];
    hornColor?: number;
    wings?: CharacterVisualSpec['wings'];
    wingColor?: number;
    slimeColor?: number;
    canFly?: boolean;
    canSlimeShift?: boolean;
    armor?: number;
    dmg?: number;
    spd?: number;
  }
): TensuraCharacterDef {
  return {
    rank,
    id,
    name,
    title,
    universe: opts.universe || 'Tensura',
    faction,
    epValue,
    epDisplay,
    signatureSkill,
    secondarySkill,
    canFly: opts.canFly ?? true,
    canSlimeShift: opts.canSlimeShift ?? false,
    armorBonus: opts.armor ?? Math.max(8, 22 - Math.floor(rank / 4)),
    dmgBonus: opts.dmg ?? Math.max(8, 26 - Math.floor(rank / 3)),
    speedMult: opts.spd ?? (1.16 + Math.max(0, (50 - rank) * 0.003)),
    visual: {
      id,
      skin: opts.skin || '#f3cfb6',
      hair: opts.hair,
      eyes: opts.eyes,
      shirt: opts.shirt,
      pants: opts.pants || '#1e293b',
      boots: opts.boots || '#0f172a',
      horns: opts.horns || 'none',
      hornColor: opts.hornColor ?? 0xfacc15,
      wings: opts.wings || 'none',
      wingColor: opts.wingColor ?? 0x1e1b4b,
      slimeColor: opts.slimeColor ?? 0x38bdf8
    }
  };
}

// ============================================================================
// TOP 50 STRONGEST TENSURA & JURA TEMPEST CHARACTERS (CANONICAL ROSTER)
// ============================================================================
export const TOP_50_TENSURA_CHARACTERS: TensuraCharacterDef[] = [
  mkChar(1, 'rimuru', 'Rimuru Tempest', 'Kaos Yaratıcısı · 5. Gerçek Ejderha', 'tempest', 120_000_000, '120,000,000+ EP', 'void_god_azathoth', 'beelzebuth', {
    hair: '#7dd3fc', eyes: '#facc15', shirt: '#0f172a', pants: '#1e293b', horns: 'crown', hornColor: 0xfacc15, wings: 'demon', wingColor: 0x1e1b4b, slimeColor: 0x38bdf8, canSlimeShift: true, armor: 20, dmg: 28, spd: 1.32
  }),
  mkChar(2, 'ciel', 'Manas: Ciel', 'Bilgelik Çekirdeği · Kutsal Manas', 'tempest', 120_000_000, '120,000,000+ EP', 'void_god_azathoth', 'yog_sothoth_time_stop', {
    hair: '#bae6fd', eyes: '#ef4444', shirt: '#f8fafc', pants: '#334155', horns: 'crown', hornColor: 0x38bdf8, wings: 'angel', wingColor: 0xe0f2fe, slimeColor: 0x7dd3fc, canSlimeShift: true, armor: 20, dmg: 27, spd: 1.32
  }),
  mkChar(3, 'veldanava', 'Veldanava', 'Yıldız Kral Ejderha · Yaratıcı', 'dragon', 150_000_000, '150,000,000+ EP', 'satanael_drago_nova', 'uriel_absolute_guard', {
    hair: '#1e1b4b', eyes: '#facc15', shirt: '#fef08a', pants: '#1e293b', horns: 'dragon', hornColor: 0xfacc15, wings: 'dragon', wingColor: 0xf59e0b, armor: 20, dmg: 30, spd: 1.32
  }),
  mkChar(4, 'ivarage', 'Ivarage', 'Dünya Yıkan Kozmik Ejderha', 'dragon', 110_000_000, '110,000,000+ EP', 'abaddon_extinction', 'void_god_azathoth', {
    skin: '#d8b4fe', hair: '#3b0764', eyes: '#ef4444', shirt: '#4c1d95', pants: '#1e1b4b', horns: 'dragon', hornColor: 0xc084fc, wings: 'dragon', wingColor: 0x581c87, armor: 20, dmg: 27, spd: 1.28
  }),
  mkChar(5, 'milim', 'Milim Nava', 'Yıkım Tiranı · Ejderha Rahibesi', 'octagram', 100_000_000, '100,000,000+ EP', 'satanael_drago_nova', 'void_god_azathoth', {
    hair: '#f472b6', eyes: '#38bdf8', shirt: '#831843', pants: '#1e1b4b', horns: 'dragon', hornColor: 0xfacc15, wings: 'dragon', wingColor: 0xbe185d, armor: 20, dmg: 28, spd: 1.32
  }),
  mkChar(6, 'guy', 'Guy Crimson', 'Karanlığın Efendisi · Kızıl Başlangıç', 'octagram', 90_000_000, '90,000,000+ EP', 'lucifer_crimson_prominence', 'yog_sothoth_time_stop', {
    hair: '#dc2626', eyes: '#facc15', shirt: '#450a0a', pants: '#0f172a', horns: 'twin', hornColor: 0xef4444, wings: 'demon', wingColor: 0x991b1b, armor: 20, dmg: 26, spd: 1.30
  }),
  mkChar(7, 'chloe', 'Chloe Aubert (Chronoa)', 'Zaman Yolcusu · Gerçek Kahraman', 'awakened', 92_000_000, '92,000,000+ EP', 'yog_sothoth_time_stop', 'uriel_absolute_guard', {
    hair: '#e2e8f0', eyes: '#dc2626', shirt: '#1e293b', pants: '#f8fafc', horns: 'crown', hornColor: 0x38bdf8, wings: 'angel', wingColor: 0xf8fafc, armor: 19, dmg: 26, spd: 1.32
  }),
  mkChar(8, 'feldway', 'Feldway', 'Fantom Kral · İlk Melek', 'awakened', 95_000_000, '95,000,000+ EP', 'sephirot_dimension_ray', 'uriel_absolute_guard', {
    hair: '#f8fafc', eyes: '#38bdf8', shirt: '#e2e8f0', pants: '#334155', horns: 'crown', hornColor: 0xfacc15, wings: 'angel', wingColor: 0xfef08a, armor: 19, dmg: 25, spd: 1.28
  }),
  mkChar(9, 'velzard', 'Velzard', 'Beyaz Buz İmparatoriçesi · Gerçek Ejderha', 'dragon', 80_000_000, '80,000,000+ EP', 'cthulhu_absolute_zero', 'yog_sothoth_time_stop', {
    hair: '#f1f5f9', eyes: '#facc15', shirt: '#0284c7', pants: '#e0f2fe', horns: 'dragon', hornColor: 0x67e8f9, wings: 'dragon', wingColor: 0xbae6fd, armor: 20, dmg: 25, spd: 1.28
  }),
  mkChar(10, 'veldora', 'Veldora Tempest', 'Fırtına Ejderhası · Jura Muhafızı', 'tempest', 88_126_579, '88,126,579 EP', 'storm_king_veldora', 'sephirot_dimension_ray', {
    skin: '#d69e7c', hair: '#facc15', eyes: '#dc2626', shirt: '#1e1b4b', pants: '#78350f', horns: 'dragon', hornColor: 0xfacc15, wings: 'dragon', wingColor: 0xca8a04, armor: 20, dmg: 26, spd: 1.30
  }),
  mkChar(11, 'velgrynd', 'Velgrynd', 'Kavurucu Alev Ejderhası · Gerçek Ejderha', 'dragon', 74_890_000, '74,890,000 EP', 'hellflare_amaterasu', 'lucifer_crimson_prominence', {
    hair: '#2563eb', eyes: '#facc15', shirt: '#b91c1c', pants: '#1e1b4b', horns: 'dragon', hornColor: 0xf97316, wings: 'dragon', wingColor: 0xdc2626, armor: 19, dmg: 25, spd: 1.32
  }),
  mkChar(12, 'michael', 'Michael', 'Adalet Kralı · Manas Hükümdarı', 'awakened', 90_000_000, '90,000,000 EP', 'uriel_absolute_guard', 'cthulhu_absolute_zero', {
    hair: '#fde047', eyes: '#ef4444', shirt: '#991b1b', pants: '#f8fafc', horns: 'crown', hornColor: 0xfacc15, wings: 'angel', wingColor: 0xfef08a, armor: 19, dmg: 24, spd: 1.26
  }),
  mkChar(13, 'rudra', 'Rudra (Masayuki)', 'Şafak İmparatoru · İlk Kahraman', 'awakened', 85_000_000, '85,000,000 EP', 'uriel_absolute_guard', 'susanoo_chaotic_fate', {
    hair: '#facc15', eyes: '#f59e0b', shirt: '#b45309', pants: '#f8fafc', horns: 'crown', hornColor: 0xfacc15, wings: 'angel', wingColor: 0xfde047, armor: 19, dmg: 25, spd: 1.27
  }),
  mkChar(14, 'ashura', 'Ashura (Tam Dagruel)', 'Titanların Yıkım Tanrısı', 'octagram', 80_000_000, '80,000,000 EP', 'abaddon_extinction', 'lucifer_crimson_prominence', {
    skin: '#9a6b56', hair: '#4c1d95', eyes: '#ef4444', shirt: '#78350f', pants: '#292524', horns: 'crown', hornColor: 0xd97706, armor: 20, dmg: 26, spd: 1.22
  }),
  mkChar(15, 'zelanus', 'Zelanus', 'İnsektar Kralı · Yaşam Yiyen', 'awakened', 82_000_000, '82,000,000 EP', 'sephirot_dimension_ray', 'beelzebuth', {
    skin: '#cbd5e1', hair: '#0f172a', eyes: '#a855f7', shirt: '#312e81', pants: '#090d16', horns: 'twin', hornColor: 0xfacc15, wings: 'fairy', wingColor: 0x6366f1, armor: 20, dmg: 25, spd: 1.28
  }),
  mkChar(16, 'diablo', 'Diablo (Noir)', 'Kara Başlangıç İblisi · İblis Kâhya', 'tempest', 66_666_666, '66,666,666 EP', 'mephisto_illusions', 'void_god_azathoth', {
    hair: '#090d16', eyes: '#facc15', shirt: '#18181b', pants: '#09090b', horns: 'twin', hornColor: 0xef4444, wings: 'demon', wingColor: 0x09090b, armor: 19, dmg: 25, spd: 1.30
  }),
  mkChar(17, 'zegion', 'Zegion', 'Sis Lordu · Labirent İmparatoru', 'tempest', 68_889_143, '68,889,143 EP', 'sephirot_dimension_ray', 'mephisto_illusions', {
    skin: '#1e1b4b', hair: '#0f172a', eyes: '#22d3ee', shirt: '#ca8a04', pants: '#0f172a', horns: 'twin', hornColor: 0xfacc15, wings: 'fairy', wingColor: 0x38bdf8, armor: 20, dmg: 25, spd: 1.30
  }),
  mkChar(18, 'benimaru', 'Benimaru', 'Alev Lordu · Tempest Başkomutanı', 'tempest', 43_923_525, '43,923,525 EP', 'hellflare_amaterasu', 'lucifer_crimson_prominence', {
    hair: '#ef4444', eyes: '#facc15', shirt: '#991b1b', pants: '#18181b', horns: 'twin', hornColor: 0x18181b, armor: 18, dmg: 24, spd: 1.28
  }),
  mkChar(19, 'ramiris', 'Ramiris (Gerçek Form)', 'Labirent Kraliçesi · Ruhların Hakimi', 'tempest', 38_000_000, '38,000,000 EP', 'uriel_absolute_guard', 'storm_king_veldora', {
    hair: '#fde047', eyes: '#4ade80', shirt: '#ec4899', pants: '#f8fafc', horns: 'crown', hornColor: 0xfacc15, wings: 'fairy', wingColor: 0x67e8f9, armor: 17, dmg: 21, spd: 1.32
  }),
  mkChar(20, 'dagruel', 'Dagruel', 'Kıta Gazabı · Devler Kralı', 'octagram', 40_000_000, '40,000,000 EP', 'abaddon_extinction', 'susanoo_chaotic_fate', {
    skin: '#a1694b', hair: '#581c87', eyes: '#f59e0b', shirt: '#44403c', pants: '#1c1917', armor: 20, dmg: 24, spd: 1.20
  }),
  mkChar(21, 'carrera', 'Carrera (Jaune)', 'Tehdit Lordu · Sarı Başlangıç İblisi', 'tempest', 70_133_209, '70,133,209 EP', 'abaddon_extinction', 'susanoo_chaotic_fate', {
    hair: '#fde047', eyes: '#38bdf8', shirt: '#1e293b', pants: '#0f172a', horns: 'twin', hornColor: 0xfacc15, wings: 'demon', wingColor: 0xca8a04, armor: 18, dmg: 25, spd: 1.28
  }),
  mkChar(22, 'testarossa', 'Testarossa (Blanc)', 'Katliam Kraliçesi · Beyaz Başlangıç İblisi', 'tempest', 33_331_266, '33,331,266 EP', 'belial_white_world', 'hellflare_amaterasu', {
    hair: '#f8fafc', eyes: '#dc2626', shirt: '#e2e8f0', pants: '#7f1d1d', horns: 'twin', hornColor: 0xf8fafc, wings: 'demon', wingColor: 0xe2e8f0, armor: 18, dmg: 23, spd: 1.27
  }),
  mkChar(23, 'ultima', 'Ultima (Violet)', 'Acı Kraliçesi · Mor Başlangıç İblisi', 'tempest', 26_688_164, '26,688,164 EP', 'samael_death_poison', 'mephisto_illusions', {
    hair: '#a855f7', eyes: '#facc15', shirt: '#3b0764', pants: '#0f172a', horns: 'twin', hornColor: 0xc084fc, wings: 'demon', wingColor: 0x6b21a8, armor: 17, dmg: 23, spd: 1.28
  }),
  mkChar(24, 'shion', 'Shion', 'Savaş Lordu · Kader Yaran Oni', 'tempest', 42_925_834, '42,925,834 EP', 'susanoo_chaotic_fate', 'beelzebuth', {
    hair: '#9333ea', eyes: '#c084fc', shirt: '#4c1d95', pants: '#0f172a', horns: 'single', hornColor: 0xd8b4fe, armor: 18, dmg: 25, spd: 1.27
  }),
  mkChar(25, 'dino', 'Dino', 'Uyuyan Hükümdar · İkiz Kılıçlı Melek', 'octagram', 22_000_000, '22,000,000 EP', 'susanoo_chaotic_fate', 'mephisto_illusions', {
    hair: '#cbd5e1', eyes: '#6366f1', shirt: '#334155', pants: '#0f172a', wings: 'angel', wingColor: 0x1e293b, armor: 17, dmg: 22, spd: 1.24
  }),
  mkChar(26, 'luminous', 'Luminous Valentine', 'Gece Kraliçesi · Vampir Atası', 'octagram', 20_000_000, '20,000,000 EP', 'belial_white_world', 'uriel_absolute_guard', {
    skin: '#f8fafc', hair: '#e2e8f0', eyes: '#ef4444', shirt: '#18181b', pants: '#7f1d1d', wings: 'demon', wingColor: 0x881337, armor: 17, dmg: 22, spd: 1.26
  }),
  mkChar(27, 'leon', 'Leon Cromwell', 'Platin Kılıçlı İblis Lordu', 'octagram', 21_500_000, '21,500,000 EP', 'sephirot_dimension_ray', 'hellflare_amaterasu', {
    hair: '#fef08a', eyes: '#60a5fa', shirt: '#f8fafc', pants: '#1e293b', horns: 'crown', hornColor: 0xfacc15, armor: 17, dmg: 22, spd: 1.26
  }),
  mkChar(28, 'hinata', 'Hinata Sakaguchi', 'Aziz Şövalye · Kutsal Kılıç Ustası', 'awakened', 19_000_000, '19,000,000 EP', 'uriel_absolute_guard', 'tsukuyomi_shadow_kill', {
    hair: '#1e293b', eyes: '#64748b', shirt: '#e2e8f0', pants: '#334155', armor: 18, dmg: 21, spd: 1.26
  }),
  mkChar(29, 'ranga', 'Ranga', 'Yıldız Rüzgarı Lordu · Sadık Fırtına Kurdu', 'tempest', 14_340_822, '14,340,822 EP', 'storm_king_veldora', 'tsukuyomi_shadow_kill', {
    skin: '#334155', hair: '#0f172a', eyes: '#facc15', shirt: '#1e293b', pants: '#090d16', horns: 'single', hornColor: 0xfacc15, wings: 'demon', wingColor: 0x38bdf8, armor: 17, dmg: 21, spd: 1.34
  }),
  mkChar(30, 'zalario', 'Zalario', 'Melek Başkomutanı · Yargı Kılıcı', 'awakened', 28_000_000, '28,000,000 EP', 'sephirot_dimension_ray', 'uriel_absolute_guard', {
    hair: '#cbd5e1', eyes: '#facc15', shirt: '#f1f5f9', pants: '#475569', wings: 'angel', wingColor: 0xe2e8f0, armor: 18, dmg: 22, spd: 1.25
  }),
  mkChar(31, 'kondou', 'Tatsuya Kondou', 'İmparatorluk Teğmeni · İnfaz Kurşunu', 'awakened', 15_000_000, '15,000,000 EP', 'abaddon_extinction', 'tsukuyomi_shadow_kill', {
    hair: '#1e293b', eyes: '#94a3b8', shirt: '#1e3a8a', pants: '#0f172a', armor: 16, dmg: 22, spd: 1.25
  }),
  mkChar(32, 'granbell', 'Granbell Rosso', 'Işık Kahramanı · Umut Kılıcı', 'awakened', 18_500_000, '18,500,000 EP', 'uriel_absolute_guard', 'susanoo_chaotic_fate', {
    hair: '#fde047', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#b45309', armor: 18, dmg: 21, spd: 1.24
  }),
  mkChar(33, 'fenn', 'Fenn', 'Zincirli Dev Savaş Tanrısı', 'awakened', 60_000_000, '60,000,000 EP', 'lucifer_crimson_prominence', 'susanoo_chaotic_fate', {
    skin: '#94a3b8', hair: '#dc2626', eyes: '#facc15', shirt: '#334155', pants: '#0f172a', armor: 19, dmg: 24, spd: 1.22
  }),
  mkChar(34, 'jahil', 'Jahil', 'Kızıl Cehennem Büyücüsü', 'awakened', 24_000_000, '24,000,000 EP', 'hellflare_amaterasu', 'lucifer_crimson_prominence', {
    hair: '#f97316', eyes: '#ef4444', shirt: '#7c2d12', pants: '#1c1917', horns: 'crown', hornColor: 0xef4444, wings: 'angel', wingColor: 0xf97316, armor: 16, dmg: 22, spd: 1.24
  }),
  mkChar(35, 'obera', 'Obera', 'Merhamet Meleği · Kurtuluş Komutanı', 'awakened', 22_000_000, '22,000,000 EP', 'uriel_absolute_guard', 'sephirot_dimension_ray', {
    hair: '#e0f2fe', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#334155', wings: 'angel', wingColor: 0xbae6fd, armor: 17, dmg: 20, spd: 1.25
  }),
  mkChar(36, 'souei', 'Souei', 'Ay Gölgesi Efendisi · Tempest Casus Şefi', 'tempest', 4_281_000, '4,281,000 EP', 'tsukuyomi_shadow_kill', 'mephisto_illusions', {
    hair: '#1d4ed8', eyes: '#60a5fa', shirt: '#0f172a', pants: '#090d16', horns: 'single', hornColor: 0xf8fafc, armor: 15, dmg: 20, spd: 1.34
  }),
  mkChar(37, 'geld', 'Geld', 'Bariyer Lordu · Sarı Lejyon Komutanı', 'tempest', 5_468_037, '5,468,037 EP', 'uriel_absolute_guard', 'beelzebuth', {
    skin: '#a16207', hair: '#451a03', eyes: '#facc15', shirt: '#78350f', pants: '#292524', armor: 20, dmg: 19, spd: 1.18
  }),
  mkChar(38, 'kumara', 'Kumara', 'Dokuz Kuyruklu Chimera Lordu', 'tempest', 4_899_112, '4,899,112 EP', 'storm_king_veldora', 'hellflare_amaterasu', {
    hair: '#facc15', eyes: '#ef4444', shirt: '#991b1b', pants: '#f8fafc', horns: 'twin', hornColor: 0xfde047, armor: 16, dmg: 20, spd: 1.28
  }),
  mkChar(39, 'gabiru', 'Gabiru', 'Ejderha Lordu · Gökyüzü Süvarisi', 'tempest', 3_263_488, '3,263,488 EP', 'tsukuyomi_shadow_kill', 'storm_king_veldora', {
    skin: '#3b82f6', hair: '#7c3aed', eyes: '#facc15', shirt: '#b45309', pants: '#1e3a8a', horns: 'dragon', hornColor: 0xfacc15, wings: 'dragon', wingColor: 0x2563eb, armor: 16, dmg: 19, spd: 1.28
  }),
  mkChar(40, 'adalmann', 'Adalmann', 'Gehenna Lordu · Ölümsüz Rahip Kral', 'tempest', 3_877_339, '3,877,339 EP', 'belial_white_world', 'samael_death_poison', {
    skin: '#e2e8f0', hair: '#f8fafc', eyes: '#ef4444', shirt: '#312e81', pants: '#0f172a', horns: 'crown', hornColor: 0xa855f7, armor: 15, dmg: 19, spd: 1.20
  }),
  mkChar(41, 'albert', 'Albert', 'Ölüm Şövalyesi · Kutsal Kılıç Muhafızı', 'tempest', 3_200_000, '3,200,000 EP', 'susanoo_chaotic_fate', 'tsukuyomi_shadow_kill', {
    skin: '#cbd5e1', hair: '#94a3b8', eyes: '#38bdf8', shirt: '#334155', pants: '#0f172a', armor: 18, dmg: 20, spd: 1.24
  }),
  mkChar(42, 'beretta', 'Beretta', 'Kaos Bebeği · Labirent Baş Muhafızı', 'tempest', 3_977_122, '3,977,122 EP', 'mephisto_illusions', 'sephirot_dimension_ray', {
    skin: '#e2e8f0', hair: '#090d16', eyes: '#facc15', shirt: '#18181b', pants: '#334155', wings: 'angel', wingColor: 0x475569, armor: 18, dmg: 19, spd: 1.25
  }),
  mkChar(43, 'apito', 'Apito', 'Kraliçe Arı · Labirent İnfazcısı', 'tempest', 3_150_000, '3,150,000 EP', 'samael_death_poison', 'tsukuyomi_shadow_kill', {
    hair: '#facc15', eyes: '#ec4899', shirt: '#18181b', pants: '#ca8a04', wings: 'fairy', wingColor: 0xfef08a, armor: 15, dmg: 20, spd: 1.34
  }),
  mkChar(44, 'shuna', 'Shuna', 'Kutsal Prenses · Tapınak Başrahibesi', 'tempest', 2_950_000, '2,950,000 EP', 'belial_white_world', 'uriel_absolute_guard', {
    hair: '#fbcfe8', eyes: '#dc2626', shirt: '#f8fafc', pants: '#be123c', horns: 'twin', hornColor: 0xfef08a, canFly: true, armor: 15, dmg: 18, spd: 1.22
  }),
  mkChar(45, 'hakurou', 'Hakurou', 'Kılıç Azizi · Puslu Gök Ustası', 'tempest', 2_800_000, '2,800,000 EP', 'tsukuyomi_shadow_kill', 'susanoo_chaotic_fate', {
    hair: '#f8fafc', eyes: '#94a3b8', shirt: '#1e293b', pants: '#334155', horns: 'twin', hornColor: 0xe2e8f0, armor: 15, dmg: 22, spd: 1.30
  }),
  mkChar(46, 'gobta', 'Gobta (Ranga Birleşimi)', 'Dahi Kurt Binicisi · Gölge Adımı', 'tempest', 2_500_000, '2,500,000 EP', 'tsukuyomi_shadow_kill', 'storm_king_veldora', {
    skin: '#4ade80', hair: '#14532d', eyes: '#090d16', shirt: '#78350f', pants: '#1e293b', armor: 14, dmg: 18, spd: 1.32
  }),
  mkChar(47, 'treyni', 'Treyni', 'Orman Muhafızı Dryad · Jura Elçisi', 'tempest', 2_400_000, '2,400,000 EP', 'uriel_absolute_guard', 'storm_king_veldora', {
    hair: '#22c55e', eyes: '#15803d', shirt: '#dcfce7', pants: '#166534', wings: 'fairy', wingColor: 0x86efac, armor: 15, dmg: 17, spd: 1.24
  }),
  mkChar(48, 'damrada', 'Damrada', 'Altın Yumruk · İmparatorluk Muhafızı', 'awakened', 4_200_000, '4,200,000 EP', 'abaddon_extinction', 'uriel_absolute_guard', {
    hair: '#d97706', eyes: '#f59e0b', shirt: '#451a03', pants: '#1c1917', armor: 16, dmg: 20, spd: 1.22
  }),
  mkChar(49, 'laplace', 'Laplace', 'Harika Palyaço · Ilımlı Soytarı', 'awakened', 3_800_000, '3,800,000 EP', 'mephisto_illusions', 'tsukuyomi_shadow_kill', {
    hair: '#a855f7', eyes: '#facc15', shirt: '#4c1d95', pants: '#ca8a04', horns: 'crown', hornColor: 0xfacc15, armor: 15, dmg: 19, spd: 1.28
  }),
  mkChar(50, 'clayman', 'Clayman (Uyanmış)', 'Kukla Ustası · Uyanmış İblis Lordu', 'awakened', 2_100_000, '2,100,000 EP', 'samael_death_poison', 'belial_white_world', {
    skin: '#f1f5f9', hair: '#cbd5e1', eyes: '#eab308', shirt: '#581c87', pants: '#0f172a', wings: 'demon', wingColor: 0x4c1d95, armor: 14, dmg: 18, spd: 1.22
  }),

  // ==========================================================================
  // NARUTO SHIPPUDEN / BORUTO LEGENDS (10 CANONICAL SHINOBI — UNIQUE SKILLS!)
  // ==========================================================================
  mkChar(51, 'naruto_baryon', 'Naruto Uzumaki (Baryon)', '7. Hokage · Altı Yol & Kurama Çakrası', 'awakened', 115_000_000, '115,000,000 EP', 'naruto_rasenshuriken', 'kurama_bijudama', {
    universe: 'Naruto', hair: '#facc15', eyes: '#f97316', shirt: '#ea580c', pants: '#18181b', horns: 'headband', hornColor: 0x0f172a, wings: 'fairy', wingColor: 0xf97316, armor: 20, dmg: 28, spd: 1.34
  }),
  mkChar(52, 'sasuke_rinnegan', 'Sasuke Uchiha (Rinnegan)', 'Gölge Hokage · Ebedi Mangekyo & Rinnegan', 'awakened', 112_000_000, '112,000,000 EP', 'sasuke_kirin_chidori', 'sasuke_indra_arrow', {
    universe: 'Naruto', hair: '#0f172a', eyes: '#a855f7', shirt: '#1e1b4b', pants: '#09090b', horns: 'headband', hornColor: 0x1e293b, armor: 19, dmg: 28, spd: 1.34
  }),
  mkChar(53, 'madara_six_paths', 'Madara Uchiha (Altı Yol)', 'Uchiha Efsanesi · On Kuyruklu Jinchuriki', 'octagram', 118_000_000, '118,000,000 EP', 'madara_tengai_shinsei', 'uchiha_susanoo_slash', {
    universe: 'Naruto', skin: '#f8fafc', hair: '#e2e8f0', eyes: '#c084fc', shirt: '#7f1d1d', pants: '#0f172a', horns: 'twin', hornColor: 0xf8fafc, wings: 'angel', wingColor: 0xc4b5fd, armor: 20, dmg: 29, spd: 1.32
  }),
  mkChar(54, 'itachi_uchiha', 'Itachi Uchiha', 'Akatsuki Dehası · Tsukuyomi & Amaterasu', 'awakened', 78_000_000, '78,000,000 EP', 'itachi_tsukuyomi_crows', 'uchiha_susanoo_slash', {
    universe: 'Naruto', hair: '#09090b', eyes: '#ef4444', shirt: '#18181b', pants: '#dc2626', horns: 'headband', hornColor: 0x09090b, armor: 18, dmg: 25, spd: 1.32
  }),
  mkChar(55, 'minato_namikaze', 'Minato Namikaze', '4. Hokage · Konoha\'nın Sarı Şimşeği', 'tempest', 84_000_000, '84,000,000 EP', 'minato_hiraishin_lvl2', 'naruto_rasenshuriken', {
    universe: 'Naruto', hair: '#fde047', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#1e293b', horns: 'headband', hornColor: 0x1d4ed8, armor: 18, dmg: 26, spd: 1.38
  }),
  mkChar(56, 'kakashi_dms', 'Kakashi Hatake (Çift Mangekyo)', '6. Hokage · Kamui & Raikiri Ustası', 'tempest', 82_000_000, '82,000,000 EP', 'kakashi_kamui_raikiri', 'sasuke_kirin_chidori', {
    universe: 'Naruto', hair: '#e2e8f0', eyes: '#ef4444', shirt: '#14532d', pants: '#0f172a', horns: 'headband', hornColor: 0x0f172a, armor: 18, dmg: 26, spd: 1.33
  }),
  mkChar(57, 'hashirama_senju', 'Hashirama Senju', '1. Hokage · Shinobi Tanrısı', 'awakened', 96_000_000, '96,000,000 EP', 'hashirama_mokuton_buddha', 'uriel_absolute_guard', {
    universe: 'Naruto', hair: '#1c1917', eyes: '#f59e0b', shirt: '#991b1b', pants: '#0f172a', horns: 'headband', hornColor: 0x7f1d1d, armor: 20, dmg: 27, spd: 1.29
  }),
  mkChar(58, 'pain_nagato', 'Pain (Deva Yolu)', 'Akatsuki Lideri · Rinnegan Shinra Tensei', 'octagram', 76_000_000, '76,000,000 EP', 'pain_shinra_chibaku', 'madara_tengai_shinsei', {
    universe: 'Naruto', hair: '#f97316', eyes: '#a855f7', shirt: '#09090b', pants: '#7f1d1d', horns: 'headband', hornColor: 0x18181b, armor: 18, dmg: 25, spd: 1.28
  }),
  mkChar(59, 'jiraiya_sage', 'Jiraiya (Bilge Modu)', 'Efsanevi Sannin · Kurbağa Bilgesi', 'tempest', 68_000_000, '68,000,000 EP', 'jiraiya_toad_oil_inferno', 'naruto_rasenshuriken', {
    universe: 'Naruto', hair: '#f8fafc', eyes: '#eab308', shirt: '#b91c1c', pants: '#14532d', horns: 'headband', hornColor: 0x991b1b, armor: 18, dmg: 24, spd: 1.27
  }),
  mkChar(60, 'gaara_kazekage', 'Gaara', '5. Kazekage · Mutlak Kum Savunması', 'tempest', 65_000_000, '65,000,000 EP', 'gaara_sand_mausoleum', 'pain_shinra_chibaku', {
    universe: 'Naruto', hair: '#991b1b', eyes: '#2dd4bf', shirt: '#7f1d1d', pants: '#d6d3d1', armor: 20, dmg: 23, spd: 1.25
  }),

  // ==========================================================================
  // BLEACH: THOUSAND-YEAR BLOOD WAR LEGENDS (10 SOUL REAPERS & ESPADA — UNIQUE SKILLS!)
  // ==========================================================================
  mkChar(61, 'ichigo_bankai', 'Ichigo Kurosaki (Gerçek Bankai)', 'Kurtuluş Boynuzu · Shinigami & Hollow & Quincy', 'awakened', 118_000_000, '118,000,000 EP', 'ichigo_mugetsu', 'ichigo_gran_rey_getsuga', {
    universe: 'Bleach', hair: '#f97316', eyes: '#facc15', shirt: '#09090b', pants: '#f8fafc', horns: 'hollowmask', hornColor: 0xef4444, wings: 'demon', wingColor: 0x09090b, armor: 20, dmg: 29, spd: 1.35
  }),
  mkChar(62, 'aizen_hogyoku', 'Sosuke Aizen (Hogyoku)', 'Aşkın Hükümdar · Kyoka Suigetsu & Kurohitsugi', 'octagram', 116_000_000, '116,000,000 EP', 'aizen_kurohitsugi', 'aizen_kyoka_fragor', {
    universe: 'Bleach', hair: '#451a03', eyes: '#a855f7', shirt: '#f8fafc', pants: '#1e1b4b', wings: 'fairy', wingColor: 0xc084fc, armor: 20, dmg: 28, spd: 1.33
  }),
  mkChar(63, 'yamamoto_bankai', 'Genryusai Yamamoto', 'Gotei 13 Başkaptanı · Zanka no Tachi', 'awakened', 110_000_000, '110,000,000 EP', 'yamamoto_zanka_no_tachi', 'yamamoto_zanka_minami', {
    universe: 'Bleach', hair: '#f8fafc', eyes: '#fb923c', shirt: '#09090b', pants: '#f8fafc', armor: 19, dmg: 29, spd: 1.28
  }),
  mkChar(64, 'kenpachi_zaraki', 'Kenpachi Zaraki (Bankai)', '11. Bölük Kaptanı · Savaş İblisi Nozarashi', 'octagram', 102_000_000, '102,000,000 EP', 'kenpachi_nozarashi_cleave', 'ichigo_gran_rey_getsuga', {
    universe: 'Bleach', skin: '#f3cfb6', hair: '#09090b', eyes: '#fef08a', shirt: '#f8fafc', pants: '#09090b', armor: 20, dmg: 30, spd: 1.31
  }),
  mkChar(65, 'byakuya_kuchiki', 'Byakuya Kuchiki', '6. Bölük Kaptanı · Senbonzakura Kageyoshi', 'tempest', 88_000_000, '88,000,000 EP', 'byakuya_senbonzakura', 'byakuya_hakuteiken', {
    universe: 'Bleach', hair: '#0f172a', eyes: '#cbd5e1', shirt: '#f8fafc', pants: '#09090b', horns: 'crown', hornColor: 0xf8fafc, armor: 18, dmg: 26, spd: 1.33
  }),
  mkChar(66, 'ulquiorra_cifer', 'Ulquiorra Cifer (Segunda Etapa)', '4. Espada · Cero Oscuras & Lanza del Relampago', 'primordial', 86_000_000, '86,000,000 EP', 'ulquiorra_lanza_relampago', 'aizen_kurohitsugi', {
    universe: 'Bleach', skin: '#f8fafc', hair: '#09090b', eyes: '#22c55e', shirt: '#f1f5f9', pants: '#09090b', horns: 'hollowmask', hornColor: 0x22c55e, wings: 'demon', wingColor: 0x09090b, armor: 19, dmg: 26, spd: 1.34
  }),
  mkChar(67, 'grimmjow_pantera', 'Grimmjow Jaegerjaquez', '6. Espada · Desgarron Kral Panter', 'octagram', 78_000_000, '78,000,000 EP', 'grimmjow_desgarron', 'ulquiorra_lanza_relampago', {
    universe: 'Bleach', hair: '#38bdf8', eyes: '#22d3ee', shirt: '#f8fafc', pants: '#0f172a', horns: 'hollowmask', hornColor: 0x38bdf8, armor: 18, dmg: 25, spd: 1.34
  }),
  mkChar(68, 'hitsugaya_toshiro', 'Toshiro Hitsugaya (Tam Bankai)', '10. Bölük Kaptanı · Daiguren Hyorinmaru', 'tempest', 89_000_000, '89,000,000 EP', 'hitsugaya_hyorinmaru_dragon', 'rukia_hakka_no_togame', {
    universe: 'Bleach', hair: '#e2e8f0', eyes: '#2dd4bf', shirt: '#f8fafc', pants: '#09090b', horns: 'dragon', hornColor: 0x67e8f9, wings: 'dragon', wingColor: 0x38bdf8, armor: 18, dmg: 26, spd: 1.32
  }),
  mkChar(69, 'rukia_bankai', 'Rukia Kuchiki (Hakka no Togame)', '13. Bölük Kaptanı · Mutlak Sıfır Prensesi', 'tempest', 79_000_000, '79,000,000 EP', 'rukia_hakka_no_togame', 'hitsugaya_hyorinmaru_dragon', {
    universe: 'Bleach', skin: '#f8fafc', hair: '#f1f5f9', eyes: '#bae6fd', shirt: '#f8fafc', pants: '#e0f2fe', horns: 'crown', hornColor: 0x7dd3fc, armor: 17, dmg: 25, spd: 1.31
  }),
  mkChar(70, 'kisuke_urahara', 'Kisuke Urahara', 'Eski 12. Kaptan · Kannonbiraki Benihime', 'tempest', 87_000_000, '87,000,000 EP', 'urahara_benihime_net', 'aizen_kyoka_fragor', {
    universe: 'Bleach', hair: '#fef08a', eyes: '#64748b', shirt: '#14532d', pants: '#09090b', armor: 18, dmg: 25, spd: 1.31
  }),

  // ==========================================================================
  // DRAGON BALL SUPER LEGENDS (10 GODLY WARRIORS — UNIQUE SKILLS!)
  // ==========================================================================
  mkChar(71, 'goku_mui', 'Son Goku (Mastered Ultra Instinct)', 'Gümüş İlahi İçgüdü · Evrenin Koruyucusu', 'awakened', 145_000_000, '145,000,000 EP', 'goku_kamehameha', 'goku_genki_dama', {
    universe: 'Dragon Ball', hair: '#e2e8f0', eyes: '#cbd5e1', shirt: '#ea580c', pants: '#ea580c', boots: '#1d4ed8', horns: 'halo', hornColor: 0xfde047, armor: 20, dmg: 30, spd: 1.38
  }),
  mkChar(72, 'vegeta_ultra_ego', 'Vegeta (Ultra Ego)', 'Saiyan Prensi · Yıkım Tanrısı Gücü', 'octagram', 143_000_000, '143,000,000 EP', 'vegeta_final_flash', 'vegeta_ultra_ego_hakai', {
    universe: 'Dragon Ball', hair: '#9333ea', eyes: '#d946ef', shirt: '#1e3a8a', pants: '#1e3a8a', boots: '#f8fafc', armor: 20, dmg: 30, spd: 1.36
  }),
  mkChar(73, 'gohan_beast', 'Son Gohan (Beast Form)', 'Uyanmış Canavar · Makankosappo', 'awakened', 140_000_000, '140,000,000 EP', 'gohan_makankosappo', 'goku_kamehameha', {
    universe: 'Dragon Ball', hair: '#f1f5f9', eyes: '#ef4444', shirt: '#4c1d95', pants: '#4c1d95', boots: '#78350f', armor: 20, dmg: 29, spd: 1.35
  }),
  mkChar(74, 'broly_lssj', 'Broly (Efsanevi Süper Saiyan)', 'Sınırsız Öfke · Zümrüt Ki Devi', 'dragon', 138_000_000, '138,000,000 EP', 'broly_gigantic_catastrophe', 'vegeta_final_flash', {
    universe: 'Dragon Ball', hair: '#4ade80', eyes: '#fef08a', shirt: '#7e22ce', pants: '#14532d', armor: 20, dmg: 30, spd: 1.32
  }),
  mkChar(75, 'gogeta_blue', 'Gogeta (Super Saiyan Blue)', 'Kusursuz Füzyon · Stardust Breaker', 'awakened', 148_000_000, '148,000,000 EP', 'gogeta_stardust_breaker', 'goku_kamehameha', {
    universe: 'Dragon Ball', hair: '#38bdf8', eyes: '#22d3ee', shirt: '#f97316', pants: '#f8fafc', horns: 'halo', hornColor: 0xfacc15, armor: 20, dmg: 30, spd: 1.38
  }),
  mkChar(76, 'beerus_destroyer', 'Lord Beerus', '7. Evren Yıkım Tanrısı · Hakai', 'octagram', 149_000_000, '149,000,000 EP', 'beerus_hakai_sphere', 'ultra_instinct_aura', {
    universe: 'Dragon Ball', skin: '#a855f7', hair: '#7e22ce', eyes: '#facc15', shirt: '#ca8a04', pants: '#38bdf8', horns: 'twin', hornColor: 0x9333ea, armor: 20, dmg: 30, spd: 1.37
  }),
  mkChar(77, 'goku_black_rose', 'Goku Black (Super Saiyan Rosé)', 'İlahi Adalet · Kızıl-Pembe Ki Tırpanı', 'primordial', 122_000_000, '122,000,000 EP', 'goku_black_scythe_rift', 'goku_kamehameha', {
    universe: 'Dragon Ball', hair: '#f472b6', eyes: '#cbd5e1', shirt: '#18181b', pants: '#18181b', boots: '#f8fafc', armor: 19, dmg: 28, spd: 1.34
  }),
  mkChar(78, 'black_frieza', 'Frieza (Black Frieza)', 'Evren İmparatoru · Karanlık Altın Evrim', 'octagram', 146_000_000, '146,000,000 EP', 'frieza_black_supernova', 'beerus_hakai_sphere', {
    universe: 'Dragon Ball', skin: '#18181b', hair: '#a855f7', eyes: '#ef4444', shirt: '#f8fafc', pants: '#ca8a04', armor: 20, dmg: 30, spd: 1.36
  }),
  mkChar(79, 'orange_piccolo', 'Piccolo (Orange Form)', 'Ejderha Klanı Uyanışı · Namek Muhafızı', 'tempest', 126_000_000, '126,000,000 EP', 'piccolo_hellzone_orange', 'gohan_makankosappo', {
    universe: 'Dragon Ball', skin: '#ea580c', hair: '#c2410c', eyes: '#ef4444', shirt: '#4c1d95', pants: '#4c1d95', armor: 20, dmg: 27, spd: 1.30
  }),
  mkChar(80, 'future_trunks', 'Gelecek Trunks (Umut Kılıcı)', 'Zaman Savaşçısı · Ruh Kılıcı Kesisi', 'awakened', 105_000_000, '105,000,000 EP', 'trunks_sword_of_hope', 'vegeta_final_flash', {
    universe: 'Dragon Ball', hair: '#60a5fa', eyes: '#38bdf8', shirt: '#2563eb', pants: '#1e293b', armor: 18, dmg: 27, spd: 1.33
  }),

  // ==========================================================================
  // ONE PIECE: EMPERORS OF THE SEA LEGENDS (10 GRAND LINE POWERHOUSES — UNIQUE SKILLS!)
  // ==========================================================================
  mkChar(81, 'luffy_gear5', 'Monkey D. Luffy (Gear 5)', 'Güneş Tanrısı Nika · Yeni İmparator (Yonko)', 'awakened', 125_000_000, '125,000,000 EP', 'luffy_bajrang_gun', 'luffy_dawn_gatling', {
    universe: 'One Piece', hair: '#f8fafc', eyes: '#ef4444', shirt: '#f8fafc', pants: '#f1f5f9', horns: 'strawhat', hornColor: 0xfacc15, armor: 20, dmg: 29, spd: 1.36
  }),
  mkChar(82, 'zoro_king_of_hell', 'Roronoa Zoro (Cehennem Kralı)', 'Üç Kılıç Ustası · Enma & Kral Haki', 'tempest', 108_000_000, '108,000,000 EP', 'zoro_king_of_hell', 'zoro_dragon_damnation', {
    universe: 'One Piece', hair: '#22c55e', eyes: '#dc2626', shirt: '#14532d', pants: '#09090b', armor: 19, dmg: 29, spd: 1.33
  }),
  mkChar(83, 'shanks_yonko', 'Kızıl Saç Shanks', 'Yonko · İlahi Kalkış (Kamusari) & Kral Haki', 'octagram', 128_000_000, '128,000,000 EP', 'shanks_kamusari', 'whitebeard_gura_haki', {
    universe: 'One Piece', hair: '#dc2626', eyes: '#09090b', shirt: '#f8fafc', pants: '#78350f', horns: 'strawhat', hornColor: 0xfacc15, armor: 19, dmg: 30, spd: 1.35
  }),
  mkChar(84, 'whitebeard', 'Edward Newgate (Beyazsakal)', 'Dünyanın En Güçlü Adamı · Gura Gura Depremi', 'octagram', 130_000_000, '130,000,000 EP', 'whitebeard_gura_haki', 'shanks_kamusari', {
    universe: 'One Piece', hair: '#f8fafc', eyes: '#facc15', shirt: '#991b1b', pants: '#f8fafc', armor: 20, dmg: 30, spd: 1.26
  }),
  mkChar(85, 'kaido_dragon', 'Kaido (Canavarlar Kralı)', 'Mavi Ejderha İmparator · Gök Gürültüsü Bagua', 'dragon', 127_000_000, '127,000,000 EP', 'kaido_thunder_bagua', 'whitebeard_gura_haki', {
    universe: 'One Piece', skin: '#d69e7c', hair: '#09090b', eyes: '#facc15', shirt: '#4c1d95', pants: '#1e1b4b', horns: 'dragon', hornColor: 0xe2e8f0, wings: 'dragon', wingColor: 0x0284c7, armor: 20, dmg: 29, spd: 1.31
  }),
  mkChar(86, 'trafalgar_law', 'Trafalgar D. Water Law', 'Ölüm Cerrahı · Uyanmış Ope Ope no Mi', 'tempest', 98_000_000, '98,000,000 EP', 'law_ope_room', 'mihawk_kokuto_yoru', {
    universe: 'One Piece', hair: '#09090b', eyes: '#facc15', shirt: '#eab308', pants: '#1e293b', armor: 18, dmg: 26, spd: 1.34
  }),
  mkChar(87, 'dracule_mihawk', 'Dracule Mihawk (Şahin Göz)', 'Dünyanın En Güçlü Kılıç Ustası · Kara Kılıç Yoru', 'octagram', 124_000_000, '124,000,000 EP', 'mihawk_kokuto_yoru', 'zoro_king_of_hell', {
    universe: 'One Piece', hair: '#09090b', eyes: '#facc15', shirt: '#881337', pants: '#1e293b', horns: 'crown', hornColor: 0x18181b, armor: 19, dmg: 30, spd: 1.33
  }),
  mkChar(88, 'sanji_ifrit', 'Vinsmoke Sanji (Ifrit Jambe)', 'Kara Bacak · Mavi Alev Gökyüzü Yürüyüşü', 'tempest', 96_000_000, '96,000,000 EP', 'sanji_ifrit_boeuf_burst', 'luffy_dawn_gatling', {
    universe: 'One Piece', hair: '#fde047', eyes: '#38bdf8', shirt: '#09090b', pants: '#09090b', armor: 19, dmg: 26, spd: 1.38
  }),
  mkChar(89, 'portgas_d_ace', 'Portgas D. Ace', 'Ateş Yumruk · Mera Mera Güneş İmparatoru', 'awakened', 88_000_000, '88,000,000 EP', 'ace_dai_enkai_entei', 'sabo_flame_dragon_king', {
    universe: 'One Piece', hair: '#09090b', eyes: '#1c1917', shirt: '#ea580c', pants: '#18181b', horns: 'strawhat', hornColor: 0xea580c, armor: 17, dmg: 26, spd: 1.32
  }),
  mkChar(90, 'sabo_flame', 'Sabo (Alev İmparatoru)', 'Devrim Ordusu Kurmayı · Ejderha Pençesi', 'awakened', 95_000_000, '95,000,000 EP', 'sabo_flame_dragon_king', 'ace_dai_enkai_entei', {
    universe: 'One Piece', hair: '#facc15', eyes: '#38bdf8', shirt: '#1e3a8a', pants: '#0f172a', armor: 18, dmg: 26, spd: 1.33
  }),

  // ==========================================================================
  // MYTHIC RPG HERO CLASSES (6 PLAYABLE ARCHETYPES — UNIQUE CLASS SKILLS!)
  // ==========================================================================
  mkChar(91, 'class_dragon_knight', 'Ejderha Şövalyesi (Sınıf)', 'Ağır Zırh · Ejderha Biçen & Alev Kalkanı', 'dragon', 95_000_000, 'Sınıf · Tank & Kılıç', 'rpg_dragon_slayer_cleave', 'uriel_absolute_guard', {
    universe: 'RPG Sınıf', hair: '#dc2626', eyes: '#facc15', shirt: '#7f1d1d', pants: '#18181b', horns: 'dragon', hornColor: 0xfacc15, wings: 'dragon', wingColor: 0x991b1b, armor: 22, dmg: 27, spd: 1.26
  }),
  mkChar(92, 'class_astral_archmage', 'Astral Başbüyücü (Sınıf)', 'Kozmik Asa · Yıldız Büyüsü & Zaman Mührü', 'awakened', 95_000_000, 'Sınıf · Alan Büyücüsü', 'rpg_astral_meteor_storm', 'yog_sothoth_time_stop', {
    universe: 'RPG Sınıf', hair: '#e0f2fe', eyes: '#38bdf8', shirt: '#312e81', pants: '#0f172a', horns: 'crown', hornColor: 0x38bdf8, wings: 'fairy', wingColor: 0x818cf8, armor: 17, dmg: 29, spd: 1.30
  }),
  mkChar(93, 'class_shadow_assassin', 'Gölge Suikastçı (Sınıf)', 'Çift Kunai · Işınlanma & Kritik İnfaz', 'tempest', 95_000_000, 'Sınıf · Hız & Kritik', 'rpg_shadow_lotus_assault', 'tsukuyomi_shadow_kill', {
    universe: 'RPG Sınıf', hair: '#09090b', eyes: '#c084fc', shirt: '#0f172a', pants: '#09090b', horns: 'headband', hornColor: 0x4c1d95, armor: 17, dmg: 29, spd: 1.40
  }),
  mkChar(94, 'class_holy_paladin', 'Kutsal Paladin (Sınıf)', 'İlahi Kalkan · Ölümsüz Bariyer & Ordu Şifası', 'awakened', 95_000_000, 'Sınıf · Şifa & Koruma', 'rpg_paladin_divine_sanctuary', 'uriel_absolute_guard', {
    universe: 'RPG Sınıf', hair: '#fef08a', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#ca8a04', horns: 'halo', hornColor: 0xfacc15, wings: 'angel', wingColor: 0xfef08a, armor: 22, dmg: 25, spd: 1.28
  }),
  mkChar(95, 'class_void_reaper', 'Hiçlik Orakçısı (Sınıf)', 'İlahi Tırpan · Can Çalma & Ruh Hasadı', 'primordial', 95_000_000, 'Sınıf · Tırpan & Can Çalma', 'void_god_azathoth', 'belial_white_world', {
    universe: 'RPG Sınıf', skin: '#e2e8f0', hair: '#c084fc', eyes: '#ef4444', shirt: '#2e1065', pants: '#09090b', horns: 'twin', hornColor: 0xa855f7, wings: 'demon', wingColor: 0x3b0764, armor: 18, dmg: 29, spd: 1.32
  }),
  mkChar(96, 'class_storm_ranger', 'Fırtına Keskin Okçusu (Sınıf)', 'Yıldırım Yay · Gök Fırtınası & Çeviklik', 'tempest', 95_000_000, 'Sınıf · Menzilli Avcı', 'storm_king_veldora', 'minato_hiraishin_lvl2', {
    universe: 'RPG Sınıf', hair: '#4ade80', eyes: '#fde047', shirt: '#14532d', pants: '#1c1917', horns: 'crown', hornColor: 0x4ade80, wings: 'fairy', wingColor: 0x86efac, armor: 18, dmg: 27, spd: 1.37
  }),

  // ==========================================================================
  // ORIGINAL & ICONIC MINECRAFT LEGENDS (12 AUTHENTIC MOJANG 8:12:4 BOXY HEROES!)
  // ==========================================================================
  mkChar(97, 'mc_steve', 'Steve (Orijinal Minecraft)', 'Klasik Mojang Kahramanı · Turkuaz Tişört & Elmas Ustası', 'tempest', 85_000_000, 'Orijinal · Mojang 8:12:4', 'mc_steve_creative_anvil', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#b58463', hair: '#3b2416', eyes: '#4338ca', shirt: '#00a8a8', pants: '#383898', boots: '#57534e', armor: 16, dmg: 24, spd: 1.25
  }),
  mkChar(98, 'mc_alex', 'Alex (Orijinal Minecraft)', 'Klasik Mojang Kahramanı · Kızıl Örgü Saç & Çevik Okçu', 'tempest', 85_000_000, 'Orijinal · Mojang İnce Kol', 'mc_steve_creative_anvil', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#f2ccb1', hair: '#d97724', eyes: '#15803d', shirt: '#659832', pants: '#5e4534', boots: '#44403c', armor: 16, dmg: 24, spd: 1.28
  }),
  mkChar(99, 'mc_herobrine', 'Herobrine (Efsane)', 'Beyaz Gözlü Hayalet · Sis & Yıldırım Hükümdarı', 'primordial', 135_000_000, 'Efsane · 135,000,000 EP', 'mc_herobrine_fog_wrath', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#b58463', hair: '#2e1b0f', eyes: '#ffffff', shirt: '#009999', pants: '#2d2d86', boots: '#3f3f46', armor: 20, dmg: 30, spd: 1.36
  }),
  mkChar(100, 'mc_technoblade', 'Technoblade (Kan Tanrısı)', 'Technoblade Never Dies · Altın Taç & Kraliyet Pelerini', 'awakened', 140_000_000, 'Efsane · Kan Tanrısı', 'mc_technoblade_blood_god', 'mc_steve_creative_anvil', {
    universe: 'Minecraft', skin: '#f9a8d4', hair: '#f472b6', eyes: '#1e293b', shirt: '#be123c', pants: '#18181b', boots: '#451a03', armor: 22, dmg: 30, spd: 1.36
  }),
  mkChar(101, 'mc_diamond_steve', 'Elmas Zırhlı Steve', 'Tam Set Büyülü Elmas Şövalye · Maden Fatihi', 'awakened', 98_000_000, 'Elmas Set · +22 Zırh', 'mc_steve_creative_anvil', 'rpg_paladin_divine_sanctuary', {
    universe: 'Minecraft', skin: '#b58463', hair: '#22d3ee', eyes: '#38bdf8', shirt: '#06b6d4', pants: '#0891b2', boots: '#0e7490', armor: 22, dmg: 26, spd: 1.27
  }),
  mkChar(102, 'mc_netherite_warrior', 'Netherit Savaşçısı', 'Antik Kalıntı Zırhlı Hükümdar · Lav & Sarsılmazlık', 'octagram', 112_000_000, 'Netherit Set · +24 Zırh', 'mc_warden_sonic_boom', 'mc_steve_creative_anvil', {
    universe: 'Minecraft', skin: '#a87959', hair: '#27272a', eyes: '#f97316', shirt: '#3f3f46', pants: '#27272a', boots: '#18181b', armor: 24, dmg: 28, spd: 1.28
  }),
  mkChar(103, 'mc_warden_knight', 'Warden Şövalyesi (Sculk)', 'Antik Şehir Muhafızı · Sonik Patlama & Sculk Pelerini', 'dragon', 120_000_000, 'Sculk Muhafız · 120M EP', 'mc_warden_sonic_boom', 'mc_herobrine_fog_wrath', {
    universe: 'Minecraft', skin: '#0f2933', hair: '#042f2e', eyes: '#2dd4bf', shirt: '#0d4a56', pants: '#082f38', boots: '#042f2e', armor: 23, dmg: 29, spd: 1.30
  }),
  mkChar(104, 'mc_sunny', 'Sunny (Orijinal Minecraft)', 'Resmi Mojang Kahramanı · Mekanik Kol & Yeşil Tulum', 'tempest', 82_000_000, 'Orijinal · Mojang Ekibi', 'mc_steve_creative_anvil', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#8d5b3e', hair: '#1c1917', eyes: '#1e293b', shirt: '#eab308', pants: '#15803d', boots: '#3f3f46', armor: 17, dmg: 24, spd: 1.27
  }),
  mkChar(105, 'mc_noor', 'Noor (Orijinal Minecraft)', 'Resmi Mojang Kahramanı · Kızıl Ceket & Kaşif Ruhu', 'tempest', 82_000_000, 'Orijinal · Mojang Ekibi', 'mc_steve_creative_anvil', 'mc_technoblade_blood_god', {
    universe: 'Minecraft', skin: '#9a6548', hair: '#29170d', eyes: '#451a03', shirt: '#b91c1c', pants: '#1e3a8a', boots: '#292524', armor: 17, dmg: 24, spd: 1.28
  }),
  mkChar(106, 'mc_zuri', 'Zuri (Orijinal Minecraft)', 'Resmi Mojang Kahramanı · Kısa Saç & Kızıl-Altın Tişört', 'tempest', 82_000_000, 'Orijinal · Mojang Ekibi', 'mc_steve_creative_anvil', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#5c3824', hair: '#17100c', eyes: '#29180d', shirt: '#dc2626', pants: '#ca8a04', boots: '#1c1917', armor: 17, dmg: 25, spd: 1.28
  }),
  mkChar(107, 'mc_ari', 'Ari (Orijinal Minecraft)', 'Resmi Mojang Kahramanı · Kızıl Örgü & Turuncu Tunik', 'tempest', 82_000_000, 'Orijinal · Mojang Ekibi', 'mc_steve_creative_anvil', 'mc_warden_sonic_boom', {
    universe: 'Minecraft', skin: '#e8be9e', hair: '#b45309', eyes: '#0284c7', shirt: '#ea580c', pants: '#0f766e', boots: '#451a03', armor: 16, dmg: 24, spd: 1.29
  }),
  mkChar(108, 'mc_kai', 'Kai (Orijinal Minecraft)', 'Resmi Mojang Kahramanı · Sarı Uzun Saç & Siyah Ceket', 'tempest', 82_000_000, 'Orijinal · Mojang Ekibi', 'mc_steve_creative_anvil', 'mc_herobrine_fog_wrath', {
    universe: 'Minecraft', skin: '#f5d0b5', hair: '#facc15', eyes: '#2563eb', shirt: '#18181b', pants: '#7e22ce', boots: '#09090b', armor: 17, dmg: 25, spd: 1.29
  }),

  // ==========================================================================
  // WAVE 18: COMPLETE BLEACH SPECIAL POWERHOUSES (+14 -> 24 TOTAL!)
  // ==========================================================================
  mkChar(109, 'yhwach_almighty', 'Yhwach (The Almighty)', 'Quincy İmparatoru · Geleceği Değiştiren Ruh Kralı', 'primordial', 142_000_000, '142,000,000 EP', 'yhwach_almighty_auswahlen', 'uryu_antithesis_licht', {
    universe: 'Bleach', hair: '#09090b', eyes: '#ef4444', shirt: '#1e293b', pants: '#f8fafc', horns: 'crown', hornColor: 0x38bdf8, wings: 'demon', wingColor: 0x09090b, armor: 22, dmg: 31, spd: 1.36
  }),
  mkChar(110, 'ichibe_hyosube', 'Ichibē Hyōsube (0. Bölük)', 'Kraliyet Muhafızı Lideri · Shirafude Ichimonji', 'awakened', 132_000_000, '132,000,000 EP', 'ichibe_shirafude_ichimonji', 'yamamoto_zanka_no_tachi', {
    universe: 'Bleach', hair: '#09090b', eyes: '#1e293b', shirt: '#f8fafc', pants: '#09090b', armor: 21, dmg: 30, spd: 1.32
  }),
  mkChar(111, 'shunsui_kyoraku', 'Shunsui Kyōraku (Başkaptan)', '1. Bölük Başkaptanı · Katen Kyōkotsu Karamatsu Shinjū', 'tempest', 106_000_000, '106,000,000 EP', 'shunsui_karamatsu_shinju', 'byakuya_senbonzakura', {
    universe: 'Bleach', hair: '#451a03', eyes: '#64748b', shirt: '#f472b6', pants: '#09090b', horns: 'strawhat', hornColor: 0xfde68a, armor: 19, dmg: 28, spd: 1.34
  }),
  mkChar(112, 'unohana_retsu', 'Retsu Unohana (Yachiru)', '4. Bölük Kaptanı · İlk Kenpachi & Bankai Minazuki', 'octagram', 99_000_000, '99,000,000 EP', 'unohana_minazuki', 'kenpachi_nozarashi_cleave', {
    universe: 'Bleach', hair: '#09090b', eyes: '#dc2626', shirt: '#f8fafc', pants: '#7f1d1d', armor: 19, dmg: 29, spd: 1.33
  }),
  mkChar(113, 'yoruichi_shihouin', 'Yoruichi Shihōin', 'Yıldırım Tanrıçası · Shunkō Raijin Senkei', 'tempest', 94_000_000, '94,000,000 EP', 'yoruichi_raijin_senkei', 'urahara_benihime_net', {
    universe: 'Bleach', skin: '#8d5b3e', hair: '#6d28d9', eyes: '#facc15', shirt: '#f97316', pants: '#18181b', armor: 18, dmg: 28, spd: 1.42
  }),
  mkChar(114, 'gin_ichimaru', 'Gin Ichimaru', 'Eski 3. Bölük Kaptanı · Kamishini no Yari', 'primordial', 90_000_000, '90,000,000 EP', 'gin_kamishini_no_yari', 'aizen_kyoka_fragor', {
    universe: 'Bleach', hair: '#e2e8f0', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#09090b', armor: 18, dmg: 28, spd: 1.36
  }),
  mkChar(115, 'mayuri_kurotsuchi', 'Mayuri Kurotsuchi', '12. Bölük Kaptanı · Konjiki Ashisogi Jizō', 'octagram', 89_000_000, '89,000,000 EP', 'mayuri_ashisogi_jizo', 'urahara_benihime_net', {
    universe: 'Bleach', skin: '#f8fafc', hair: '#2563eb', eyes: '#facc15', shirt: '#f8fafc', pants: '#09090b', horns: 'crown', hornColor: 0xfacc15, armor: 18, dmg: 26, spd: 1.30
  }),
  mkChar(116, 'renji_abarai', 'Renji Abarai (Sōō Zabimaru)', '6. Bölük Teğmeni · Gerçek Bankai Zaga Teppō', 'tempest', 84_000_000, '84,000,000 EP', 'renji_soo_zabimaru', 'byakuya_senbonzakura', {
    universe: 'Bleach', hair: '#dc2626', eyes: '#78350f', shirt: '#09090b', pants: '#09090b', horns: 'headband', hornColor: 0xf8fafc, armor: 18, dmg: 27, spd: 1.33
  }),
  mkChar(117, 'komamura_bankai', 'Sajin Komamura (Dangai Jōe)', '7. Bölük Kaptanı · Kokujō Tengen Myō\'ō Dev Samuray', 'tempest', 88_000_000, '88,000,000 EP', 'komamura_tengen_myoo', 'kenpachi_nozarashi_cleave', {
    universe: 'Bleach', skin: '#d97706', hair: '#b45309', eyes: '#ef4444', shirt: '#f8fafc', pants: '#09090b', armor: 21, dmg: 28, spd: 1.27
  }),
  mkChar(118, 'uryu_ishida', 'Uryū Ishida (Sternritter A)', 'Quincy Veliahtı · The Antithesis & Vollständig', 'awakened', 98_000_000, '98,000,000 EP', 'uryu_antithesis_licht', 'yhwach_almighty_auswahlen', {
    universe: 'Bleach', hair: '#0f172a', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#f8fafc', wings: 'angel', wingColor: 0x38bdf8, armor: 18, dmg: 28, spd: 1.35
  }),
  mkChar(119, 'jugram_haschwalth', 'Jugram Haschwalth (Sternritter B)', 'Quincy Büyük Üstadı · The Balance & Freund Schild', 'awakened', 104_000_000, '104,000,000 EP', 'jugram_balance_shield', 'yhwach_almighty_auswahlen', {
    universe: 'Bleach', hair: '#fef08a', eyes: '#ef4444', shirt: '#f8fafc', pants: '#f8fafc', armor: 20, dmg: 29, spd: 1.33
  }),
  mkChar(120, 'coyote_starrk', 'Coyote Starrk (1. Espada)', 'Primera Espada · Los Lobos & Cero Metralleta', 'primordial', 91_000_000, '91,000,000 EP', 'starrk_cero_metralleta', 'ulquiorra_lanza_relampago', {
    universe: 'Bleach', hair: '#451a03', eyes: '#38bdf8', shirt: '#f8fafc', pants: '#f8fafc', armor: 18, dmg: 27, spd: 1.36
  }),
  mkChar(121, 'barragan_espada', 'Baraggan Louisenbairn (2. Espada)', 'Hueco Mundo Kralı · Arrogante & Respira Çürümesi', 'octagram', 90_000_000, '90,000,000 EP', 'barragan_respira', 'aizen_kurohitsugi', {
    universe: 'Bleach', skin: '#f8fafc', hair: '#f8fafc', eyes: '#a855f7', shirt: '#3b0764', pants: '#09090b', horns: 'crown', hornColor: 0xfacc15, armor: 20, dmg: 28, spd: 1.29
  }),
  mkChar(122, 'shinji_hirako', 'Shinji Hirako (Visored)', '5. Bölük Kaptanı · Sakanade Ters Dünya Bankai', 'tempest', 83_000_000, '83,000,000 EP', 'shinji_sakanade', 'ichigo_gran_rey_getsuga', {
    universe: 'Bleach', hair: '#fde047', eyes: '#a16207', shirt: '#f8fafc', pants: '#09090b', horns: 'hollowmask', hornColor: 0xf8fafc, armor: 18, dmg: 26, spd: 1.33
  }),

  // ==========================================================================
  // WAVE 18: COMPLETE NARUTO SPECIAL POWERHOUSES (+15 -> 25 TOTAL!)
  // ==========================================================================
  mkChar(123, 'kaguya_otsutsuki', 'Kaguya Ōtsutsuki', 'Çakranın Atası · Rinne Sharingan & Boyut Hükümdarı', 'primordial', 136_000_000, '136,000,000 EP', 'kaguya_expansive_tsb', 'hagoromo_creation_seal', {
    universe: 'Naruto', skin: '#f8fafc', hair: '#e2e8f0', eyes: '#ef4444', shirt: '#f8fafc', pants: '#312e81', horns: 'twin', hornColor: 0xe2e8f0, armor: 21, dmg: 31, spd: 1.35
  }),
  mkChar(124, 'hagoromo_sage', 'Hagoromo Ōtsutsuki', 'Altı Yolun Bilgesi · Ninshū Kurucusu & Yin-Yang', 'awakened', 134_000_000, '134,000,000 EP', 'hagoromo_creation_seal', 'kurama_bijudama', {
    universe: 'Naruto', skin: '#f8fafc', hair: '#d6d3d1', eyes: '#a855f7', shirt: '#fef3c7', pants: '#18181b', horns: 'twin', hornColor: 0xd6d3d1, armor: 21, dmg: 30, spd: 1.33
  }),
  mkChar(125, 'obito_jinchuriki', 'Obito Uchiha (On Kuyruklu)', 'Altı Yol Juubito · Kamui & Kutsal Nunoboko Kılıcı', 'octagram', 110_000_000, '110,000,000 EP', 'obito_kamui_nunoboko', 'kakashi_kamui_raikiri', {
    universe: 'Naruto', skin: '#e2e8f0', hair: '#f8fafc', eyes: '#c084fc', shirt: '#1e1b4b', pants: '#09090b', horns: 'single', hornColor: 0xf8fafc, armor: 20, dmg: 29, spd: 1.34
  }),
  mkChar(126, 'might_guy_8gates', 'Might Guy (8. Ölüm Kapısı)', 'Konoha\'nın Kızıl Canavarı · Gece Guy (Yagai)', 'awakened', 114_000_000, '114,000,000 EP', 'might_guy_night_guy', 'rock_lee_ura_renge', {
    universe: 'Naruto', hair: '#7f1d1d', eyes: '#fef08a', shirt: '#166534', pants: '#15803d', horns: 'headband', hornColor: 0xdc2626, armor: 19, dmg: 31, spd: 1.44
  }),
  mkChar(127, 'tobirama_senju', 'Tobirama Senju (2. Hokage)', 'Hiraishin & Edo Tensei Yaratıcısı · Su Ejderhası', 'tempest', 90_000_000, '90,000,000 EP', 'tobirama_suiryudan', 'minato_hiraishin_lvl2', {
    universe: 'Naruto', hair: '#f1f5f9', eyes: '#dc2626', shirt: '#1d4ed8', pants: '#0f172a', horns: 'headband', hornColor: 0xcbd5e1, armor: 19, dmg: 27, spd: 1.37
  }),
  mkChar(128, 'hiruzen_sarutobi', 'Hiruzen Sarutobi (3. Hokage)', 'Shinobi Profesörü · Beş Element & Elmas Enma', 'tempest', 80_000_000, '80,000,000 EP', 'hiruzen_five_elements', 'jiraiya_toad_oil_inferno', {
    universe: 'Naruto', hair: '#e2e8f0', eyes: '#451a03', shirt: '#18181b', pants: '#18181b', horns: 'headband', hornColor: 0xd97706, armor: 18, dmg: 26, spd: 1.29
  }),
  mkChar(129, 'tsunade_senju', 'Tsunade (5. Hokage)', 'Efsanevi Sannin · Byakugō 100 Şifa & Dev Güç', 'tempest', 79_000_000, '79,000,000 EP', 'tsunade_byakugo_smash', 'hashirama_mokuton_buddha', {
    universe: 'Naruto', hair: '#fde047', eyes: '#ca8a04', shirt: '#16a34a', pants: '#1e293b', armor: 19, dmg: 28, spd: 1.30
  }),
  mkChar(130, 'orochimaru_sannin', 'Orochimaru', 'Ölümsüz Sannin · Yamata Sekiz Başlı Hydra & Kusanagi', 'primordial', 81_000_000, '81,000,000 EP', 'orochimaru_hydra', 'sasuke_kirin_chidori', {
    universe: 'Naruto', skin: '#f8fafc', hair: '#09090b', eyes: '#facc15', shirt: '#f1f5f9', pants: '#6b21a8', armor: 18, dmg: 26, spd: 1.33
  }),
  mkChar(131, 'killer_bee_hachibi', 'Killer Bee (Hachibi)', 'Sekiz Kuyruk Jinchūriki · Yıldırım Lariat & 8 Kılıç', 'tempest', 86_000_000, '86,000,000 EP', 'killer_bee_lariat_bijudama', 'kurama_bijudama', {
    universe: 'Naruto', skin: '#78350f', hair: '#f8fafc', eyes: '#09090b', shirt: '#1e293b', pants: '#f8fafc', horns: 'headband', hornColor: 0xf8fafc, armor: 19, dmg: 28, spd: 1.35
  }),
  mkChar(132, 'kisame_hoshigaki', 'Kisame Hoshigaki', 'Kuyruksuz Kuyruklu Canavar · Samehada & Su Kubbesi', 'octagram', 77_000_000, '77,000,000 EP', 'kisame_water_shark_dome', 'tobirama_suiryudan', {
    universe: 'Naruto', skin: '#38bdf8', hair: '#1e3a8a', eyes: '#f8fafc', shirt: '#09090b', pants: '#dc2626', horns: 'headband', hornColor: 0x09090b, armor: 19, dmg: 27, spd: 1.31
  }),
  mkChar(133, 'shisui_uchiha', 'Shisui Uchiha', 'Göz Kırpma Shisui · Kotoamatsukami & Yeşil Susanoo', 'awakened', 85_000_000, '85,000,000 EP', 'shisui_kotoamatsukami', 'itachi_tsukuyomi_crows', {
    universe: 'Naruto', hair: '#09090b', eyes: '#ef4444', shirt: '#18181b', pants: '#0f172a', horns: 'headband', hornColor: 0x10b981, armor: 18, dmg: 27, spd: 1.39
  }),
  mkChar(134, 'deidara_akatsuki', 'Deidara', 'Akatsuki Patlayıcı Sanatçısı · C4 Karura — Katsu!', 'octagram', 72_000_000, '72,000,000 EP', 'deidara_c4_karura', 'jiraiya_toad_oil_inferno', {
    universe: 'Naruto', hair: '#fde047', eyes: '#38bdf8', shirt: '#09090b', pants: '#dc2626', horns: 'headband', hornColor: 0x18181b, armor: 17, dmg: 26, spd: 1.32
  }),
  mkChar(135, 'hidan_akatsuki', 'Hidan (Ölümsüz Jashin)', 'Akatsuki Bağnazı · Üç Bıçaklı Tırpan & Kan Çemberi', 'primordial', 70_000_000, '70,000,000 EP', 'hidan_jashin_ritual', 'itachi_tsukuyomi_crows', {
    universe: 'Naruto', hair: '#cbd5e1', eyes: '#d946ef', shirt: '#09090b', pants: '#be123c', horns: 'headband', hornColor: 0x18181b, armor: 19, dmg: 25, spd: 1.30
  }),
  mkChar(136, 'hinata_hyuga', 'Hinata Hyūga (Byakugan Prensesi)', 'Hyūga Varisi · Çift Aslan Yumruğu & 64 Avuç', 'tempest', 71_000_000, '71,000,000 EP', 'hinata_twin_lion_64palms', 'naruto_rasenshuriken', {
    universe: 'Naruto', hair: '#1e1b4b', eyes: '#e2e8f0', shirt: '#c4b5fd', pants: '#1e293b', armor: 17, dmg: 25, spd: 1.33
  }),
  mkChar(137, 'rock_lee', 'Rock Lee (İç Kapılar Ustası)', 'Konoha\'nın Yeşil Canavarı · Ura Renge Taijutsu', 'tempest', 74_000_000, '74,000,000 EP', 'rock_lee_ura_renge', 'might_guy_night_guy', {
    universe: 'Naruto', hair: '#09090b', eyes: '#09090b', shirt: '#22c55e', pants: '#16a34a', horns: 'headband', hornColor: 0xdc2626, armor: 18, dmg: 27, spd: 1.41
  })
];

export interface CompanionPreset {
  id: string;
  name: string;
  role: string;
  species: MobSpecies;
}

export const TEMPEST_COMPANION_PRESETS: CompanionPreset[] = [
  { id: 'ranga', name: 'Ranga (Fırtına Kurdu)', role: 'Yakın Dövüş Muhafızı', species: 'wolf' },
  { id: 'diablo', name: 'Diablo (Kara İblis)', role: 'Işınlanan İnfazcı', species: 'enderman' },
  { id: 'benimaru', name: 'Benimaru (Oni Komutanı)', role: 'Zırhlı Kılıç Ustası', species: 'oni_warlord' },
  { id: 'veldora_drg', name: 'Veldora (Fırtına Ejderhası)', role: 'Uçan Ejderha Muhafız', species: 'storm_dragon' },
  { id: 'souei', name: 'Souei (Shinobi Casusu)', role: 'Hızlı Kunai Avcısı', species: 'rogue_shinobi' },
  { id: 'beretta', name: 'Beretta (Çelik Muhafız)', role: 'Ağır Zırhlı Tank', species: 'iron_golem' }
];

const DEFAULT_ALLY_NAMES: Partial<Record<MobSpecies, string>> = {
  wolf: 'Ranga',
  cat: 'Kuro',
  horse: 'Bora',
  camel: 'Kum Fırtınası',
  happy_ghast: 'Veldora Ruhu',
  allay: 'Ramiris',
  villager: 'Rigurd',
  wandering_trader: 'Myourmiles',
  iron_golem: 'Beretta',
  copper_golem: 'Kaijin',
  snow_golem: 'Velzard Golemi',
  slime: 'Shinsha',
  zombie: 'Rigur',
  husk: 'Geld',
  skeleton: 'Adalmann',
  wither_skeleton: 'Albert',
  pillager: 'Gobta',
  witch: 'Shuna',
  breeze: 'Souei',
  enderman: 'Diablo',
  spider: 'Kumara',
  creeper: 'Gabiru',
  blaze: 'Benimaru',
  ghast: 'Velgrynd Ruhu',
  warden: 'Zegion',
  wither: 'Carrera',
  bee: 'Apito',
  piglin: 'Kurobe',
  zombified_piglin: 'Gozu',
  fire_dragon: 'Velgrynd',
  ice_dragon: 'Velzard',
  storm_dragon: 'Veldora',
  oni_warlord: 'Benimaru Kijin',
  hollow_menos: 'Ulquiorra',
  rogue_shinobi: 'Itachi Gölgesi'
};

interface PersistedTensuraV2 {
  characterId: string;
  slimeForm: boolean;
  ep: number;
  magicules: number;
  souls: number;
  activeSkill: TensuraSkillId;
  absorbedCount: number;
  namedCount: number;
}

const STORAGE_KEY = 'horizon_tensura_rpg_v3_multiverse';

export function getCanonicalAwakeningTitle(ch: TensuraCharacterDef): string {
  const id = ch.id;
  const map: Record<string, string> = {
    kisuke_urahara: 'Bankai: Kannonbiraki Benihime Aratame',
    byakuya_kuchiki: 'Bankai: Senbonzakura Kageyoshi',
    yamamoto_bankai: 'Bankai: Zanka no Tachi (15,000,000°C)',
    rukia_bankai: 'Bankai: Hakka no Togame (-273.15°C)',
    hitsugaya_toshiro: 'Tam Bankai: Daiguren Hyōrinmaru',
    kenpachi_zaraki: 'Bankai: Yachiru Nozarashi (Savaş İblisi)',
    ichigo_bankai: 'Gerçek Bankai: Tensa Zangetsu & Kurtuluş Boynuzu',
    aizen_hogyoku: 'Hōgyoku Aşkın Evrim: Ultra Fragor',
    shunsui_kyoraku: 'Bankai: Katen Kyōkotsu Karamatsu Shinjū',
    komamura_bankai: 'Bankai: Kokujō Tengen Myō\'ō — Dangai Jōe',
    unohana_retsu: 'Bankai: Minazuki (Kızıl Kan Okyanusu)',
    mayuri_kurotsuchi: 'Bankai: Konjiki Ashisogi Jizō',
    renji_abarai: 'Gerçek Bankai: Sōō Zabimaru',
    gin_ichimaru: 'Bankai: Kamishini no Yari',
    shinji_hirako: 'Bankai: Sakashima Yokoshima Happōfusagari',
    ichibe_hyosube: 'Shin\'uchi: Shirafude Ichimonji',
    yhwach_almighty: 'Schrift A: The Almighty & Quincy Vollständig',
    uryu_ishida: 'Quincy Vollständig: Antithesis Kanatları',
    jugram_haschwalth: 'Sternritter Büyük Üstadı: The Balance',
    ulquiorra_cifer: 'Resurrección: Segunda Etapa',
    grimmjow_pantera: 'Resurrección: Pantera',
    coyote_starrk: 'Resurrección: Los Lobos',
    barragan_espada: 'Resurrección: Arrogante (Respira)',
    yoruichi_shihouin: 'Shunkō: Raijin Senkei — Yıldırım Tanrıçası',
    naruto_baryon: 'Kurama Baryon Modu & Dokuz Kuyruk Aurası',
    sasuke_rinnegan: 'Rinnegan Kusursuz Mor Susanoo',
    madara_six_paths: 'Altı Yol Rikudō & Kusursuz Mavi Susanoo',
    itachi_uchiha: 'Kızıl Zırhlı Susanoo (Totsuka & Yata)',
    kakashi_dms: 'Çift Mangekyō Turkuaz Kamui Susanoo',
    shisui_uchiha: 'Mangekyō Zümrüt Susanoo',
    obito_jinchuriki: 'On Kuyruklu Jinchūriki & 9 Gudōdama Halesi',
    might_guy_8gates: 'Sekizinci Ölüm Kapısı: Gece Guy (Yagai)',
    rock_lee: 'Altıncı Neşe Kapısı: Yeşil Kasırga',
    hashirama_senju: 'Senjutsu: Bin Elli Ahşap Buda Aurası',
    minato_namikaze: 'Kurama Çakra Modu & Sarı Şimşek',
    killer_bee_hachibi: 'Tam Hachibi Sekiz Kuyruk Pelerini',
    kaguya_otsutsuki: 'Rinne Sharingan Boyut Tanrıçası',
    hagoromo_sage: 'Altı Yolun Bilgesi: 9 Gudōdama & Yin-Yang',
    hinata_hyuga: 'Byakugan: 8 Trigram 64 Avuç Bagua Mührü',
    hidan_akatsuki: 'Jashin Kan Çemberi Ölümsüz Ayini',
    pain_nagato: 'Altı Yol Rinnegan Gezegen Çekirdeği'
  };
  if (map[id]) return map[id];
  if (ch.universe === 'Bleach') return 'Gerçek Bankai Reiatsu Patlaması';
  if (ch.universe === 'Naruto') return 'Altı Yol & Çakra Uyanışı';
  if (ch.universe === 'Dragon Ball') return 'İlahi Ki & Ultra İçgüdü Patlaması';
  if (ch.universe === 'One Piece') return 'Uyanmış Meyve & Kral Haki Aurası';
  if (ch.universe === 'Minecraft') return 'Yaratıcı Efsane Büyülü Zırh Uyanışı';
  return 'Gerçek İblis Lordu & Ejderha Uyanışı';
}

export function getSkillWindupMeta(
  skillId: TensuraSkillId,
  ch: TensuraCharacterDef
): { duration: number; chant: string } {
  const def = TENSURA_SKILLS[skillId];
  const univ = def?.universe || ch.universe;
  if (univ === 'Naruto') {
    const chants: Partial<Record<TensuraSkillId, string>> = {
      madara_tengai_shinsei: '« Çift Rinnegan El Mührü: Koç · Yılan · Kuş — Tengai Shinsei! »',
      sasuke_indra_arrow: '« Susanoo Çakra Yayını Geriyor — İndra\'nın Oku! »',
      sasuke_kirin_chidori: '« El Mührü: Öküz · Tavşan · Maymun — Chidori & Kirin! »',
      naruto_rasenshuriken: '« Bilge Çakrası Yoğunlaşıyor — Fūton: Rasenshuriken! »',
      kurama_bijudama: '« Kurama Baryon Çekirdeği — Kuyruklu Canavar Topu! »',
      itachi_tsukuyomi_crows: '« Mangekyō Sharingan: Tsukuyomi & Amaterasu! »',
      hashirama_mokuton_buddha: '« Senpō El Mührü: Yılan — Shin Sūsenju Bin Elli Buda! »',
      pain_shinra_chibaku: '« Rinnegan Çekim Çekirdeği — Chibaku Tensei! »',
      might_guy_night_guy: '« Sekizinci Ölüm Kapısı: Kalp Kapısı — AÇIL! Yagai! »',
      rock_lee_ura_renge: '« Altıncı Neşe Kapısı — AÇIL! Ura Renge! »',
      obito_kamui_nunoboko: '« Altı Yol Gudōdama Yoğunlaşıyor — Kutsal Kılıç Nunoboko! »',
      kaguya_expansive_tsb: '« Rinne Sharingan — Bōchō Gudōdama! »',
      hagoromo_creation_seal: '« Güneş ve Ay Yin-Yang Mührü — Rikudō Chibaku Tensei! »',
      tobirama_suiryudan: '« El Mührü: Öküz · Maymun · Tavşan · Domuz — Suiton: Suiryūdan! »',
      hiruzen_five_elements: '« El Mührü: Kaplan · Ejderha · Köpek · Koç — Goton: Dairendan! »',
      deidara_c4_karura: '« Gerçek Sanat Bir Patlamadır — C4 Karura... KATSU! »',
      hidan_jashin_ritual: '« Jashin Kan Çemberi Çizildi — Jujutsu: Shiji Hyōketsu! »',
      hinata_twin_lion_64palms: '« Byakugan! Jūho Sōshiken — 8 Trigram 64 Avuç! »',
      kisame_water_shark_dome: '« El Mührü: Kaplan · Köpek · Ejderha — Suiton: Daikōdan! »',
      orochimaru_hydra: '« Yasak El Mührü: Yılan — Yamata no Jutsu! »',
      shisui_kotoamatsukami: '« Mangekyō Sharingan: Kotoamatsukami! »'
    };
    return {
      duration: def.cooldown >= 13 ? 0.92 : 0.76,
      chant: chants[skillId] || '« El Mührü: Kaplan · Yılan · Koç · At — Çakra Serbest! »'
    };
  }
  if (univ === 'Bleach') {
    const chants: Partial<Record<TensuraSkillId, string>> = {
      urahara_benihime_net: '« Bankai... Kannonbiraki Benihime Aratame! »',
      byakuya_senbonzakura: '« Bankai... Senbonzakura Kageyoshi! »',
      byakuya_hakuteiken: '« Shūkei... Hakuteiken! »',
      yamamoto_zanka_no_tachi: '« Bankai... Zanka no Tachi! Her Şeyi Küle Çevir! »',
      yamamoto_zanka_minami: '« Zanka no Tachi, Minami: Kaka Jūmanokushi Daisōjin! »',
      rukia_hakka_no_togame: '« Bankai... Hakka no Togame! (-273.15°C) »',
      hitsugaya_hyorinmaru_dragon: '« Daiguren Hyōrinmaru — Tensō Jūrin! »',
      kenpachi_nozarashi_cleave: '« Yut, Nozarashi! Bankai Savaş İblisi! »',
      ichigo_mugetsu: '« Tensa Zangetsu — Son Getsuga Tenshō: Mugetsu! »',
      ichigo_gran_rey_getsuga: '« Kurtuluş Boynuzu: Gran Rey Cero — Getsuga Jūjishō! »',
      aizen_kurohitsugi: '« Tam İlahili Hadō #90: Kurohitsugi! »',
      aizen_kyoka_fragor: '« Parçalan, Kyōka Suigetsu — Ultra Fragor! »',
      shunsui_karamatsu_shinju: '« Bankai... Katen Kyōkotsu: Karamatsu Shinjū! »',
      komamura_tengen_myoo: '« Bankai... Kokujō Tengen Myō\'ō: Dangai Jōe! »',
      unohana_minazuki: '« Bankai... Minazuki! »',
      gin_kamishini_no_yari: '« Bankai... Kamishini no Yari — Korose! »',
      mayuri_ashisogi_jizo: '« Bankai... Konjiki Ashisogi Jizō! »',
      renji_soo_zabimaru: '« Gerçek Bankai... Sōō Zabimaru: Zaga Teppō! »',
      yhwach_almighty_auswahlen: '« Gözlerim Geleceği Görüp Değiştirir — The Almighty: Auswählen! »',
      ichibe_shirafude_ichimonji: '« Karar, Ichimonji — Shin\'uchi: Shirafude Ichimonji! »',
      ulquiorra_lanza_relampago: '« Resurrección Segunda Etapa — Lanza del Relámpago! »',
      grimmjow_desgarron: '« Gıcırdat, Pantera — Desgarrón! »',
      starrk_cero_metralleta: '« Kovala, Los Lobos — Cero Metralleta! »',
      barragan_respira: '« Çürüt, Arrogante — Respira! »',
      shinji_sakanade: '« Çök, Sakanade — Sakashima Yokoshima Happōfusagari! »',
      uryu_antithesis_licht: '« Quincy Vollständig — Licht Regen! »',
      yoruichi_raijin_senkei: '« Shunkō: Raijin Senkei — Yıldırım Tanrıçası! »'
    };
    return {
      duration: def.cooldown >= 12.5 ? 0.90 : 0.72,
      chant: chants[skillId] || `« Reiatsu Yoğunlaşıyor — ${def.name}! »`
    };
  }
  if (univ === 'Dragon Ball') {
    return {
      duration: def.cooldown >= 12.5 ? 0.85 : 0.68,
      chant: skillId === 'goku_kamehameha' ? '« Ka... Me... Ha... Me... HA!! »' : `« İlahi Ki Toplanıyor — ${def.name}! »`
    };
  }
  if (univ === 'One Piece') {
    return {
      duration: 0.64,
      chant: `« Kral Haki Yıldırımı — ${def.name}! »`
    };
  }
  return {
    duration: univ === 'Minecraft' ? 0.35 : 0.58,
    chant: `« ${def.name} Hazırlanıyor! »`
  };
}

export class TensuraSystem {
  public characterId = 'rimuru';
  public evoStage = 4;
  public slimeForm = false; // Always start in clean Humanoid Form (press [V] anytime to toggle Azure Slime!)
  public ep = 120_000_000;
  public magicules = 2000;
  public souls = 25;
  public magiculeRegenMult = 1.0;
  public skills: TensuraSkillId[] = [...ALL_SKILL_IDS];
  public activeSkill: TensuraSkillId = 'beelzebuth';
  public absorbedCount = 0;
  public namedCount = 0;
  public awakeningTimer = 0;
  public awakeningCooldown = 0;

  private companionCycleIdx = 0;
  private skillCooldown = 0;
  private secondaryCooldown = 0;
  private castLockout = 0;
  private saveTimer = 0;
  private dirtySave = false;

  public onVoiceAnnouncement?: (tag: string, message: string) => void;
  public onSageChat?: (sender: string, message: string) => void;
  public onAutoHealPlayer?: (amount: number) => void;

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('horizon_tensura_rpg_v2');
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<PersistedTensuraV2>;
      if (d.characterId && TOP_50_TENSURA_CHARACTERS.some((c) => c.id === d.characterId)) {
        this.characterId = d.characterId;
      }
      // Guarantee Humanoid Form on fresh session entry so F5 camera always displays crisp humanoid body first!
      this.slimeForm = false;
      if (typeof d.ep === 'number' && Number.isFinite(d.ep)) this.ep = Math.max(10_000, Math.floor(d.ep));
      if (typeof d.souls === 'number' && Number.isFinite(d.souls)) this.souls = Math.max(0, Math.floor(d.souls));
      if (d.activeSkill && d.activeSkill in TENSURA_SKILLS) {
        this.activeSkill = d.activeSkill;
      }
      if (typeof d.absorbedCount === 'number') this.absorbedCount = Math.max(0, d.absorbedCount);
      if (typeof d.namedCount === 'number') this.namedCount = Math.max(0, d.namedCount);
      this.magicules = Math.min(this.getMaxMagicules(), typeof d.magicules === 'number' ? Math.max(600, d.magicules) : this.getMaxMagicules());
    } catch {
      // Ignore storage error
    }
  }

  public saveNow() {
    this.dirtySave = false;
    try {
      const payload: PersistedTensuraV2 = {
        characterId: this.characterId,
        slimeForm: this.slimeForm,
        ep: Math.floor(this.ep),
        magicules: Math.floor(this.magicules),
        souls: this.souls,
        activeSkill: this.activeSkill,
        absorbedCount: this.absorbedCount,
        namedCount: this.namedCount
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota
    }
  }

  public getActiveCharacter(): TensuraCharacterDef {
    return TOP_50_TENSURA_CHARACTERS.find((c) => c.id === this.characterId) || TOP_50_TENSURA_CHARACTERS[0];
  }

  public getSageName(): string {
    return 'Manas: Ciel';
  }

  public getLevel(): number {
    const ch = this.getActiveCharacter();
    return Math.max(50, Math.min(999, 1000 - ch.rank * 6 + Math.min(90, Math.floor(this.souls / 2))));
  }

  public getMaxMagicules(): number {
    return 2000 + Math.min(3000, this.namedCount * 100 + this.souls * 20);
  }

  public getStageTitle(): string {
    const ch = this.getActiveCharacter();
    return `#${ch.rank} ${ch.name}`;
  }

  public getSkillDisplayName(id: TensuraSkillId): string {
    return TENSURA_SKILLS[id]?.name || id;
  }

  public getNaturalArmorBonus(): number {
    return this.getActiveCharacter().armorBonus;
  }

  public getSpeedMultiplier(): number {
    const base = this.getActiveCharacter().speedMult;
    const slimeMult = this.isSlimeBodyActive() ? base * 1.05 : base;
    return this.awakeningTimer > 0 ? slimeMult * 1.22 : slimeMult;
  }

  public getMeleeDamageBonus(): number {
    const base = this.getActiveCharacter().dmgBonus;
    return this.awakeningTimer > 0 ? Math.round(base * 1.45) : base;
  }

  public isAwakenedOverdrive(): boolean {
    return this.awakeningTimer > 0;
  }

  public triggerCharacterAwakening(): { ok: boolean; title: string; msg: string } {
    const ch = this.getActiveCharacter();
    if (this.awakeningTimer > 0.5) {
      return {
        ok: false,
        title: ch.name,
        msg: `${getCanonicalAwakeningTitle(ch)} zaten aktif! (${this.awakeningTimer.toFixed(1)} sn kaldı)`
      };
    }
    if (this.awakeningCooldown > 0.05) {
      return {
        ok: false,
        title: ch.name,
        msg: `Bankai / Uyanış enerjisi toplanıyor (${this.awakeningCooldown.toFixed(1)} sn)`
      };
    }
    this.awakeningTimer = 20.0;
    this.awakeningCooldown = 30.0;
    this.magicules = this.getMaxMagicules();
    this.skillCooldown = 0;
    this.secondaryCooldown = 0;
    this.castLockout = 0;
    const formName = getCanonicalAwakeningTitle(ch);
    const msg = `${ch.name} — ${formName}! (20sn 3B Alan Tezahürü, +%45 Hasar, +%22 Hız)`;
    this.onVoiceAnnouncement?.('« BANKAI / UYANIŞ [G] »', msg);
    return { ok: true, title: formName, msg };
  }

  public returnToMinecraftCharacter(variant: 'mc_steve' | 'mc_alex' = 'mc_steve') {
    return this.transformIntoCharacter(variant);
  }

  public isSlimeBodyActive(): boolean {
    return Boolean(this.getActiveCharacter().canSlimeShift && this.slimeForm);
  }

  public hasFallDamageImmunity(): boolean {
    return true;
  }

  public canDemonLordFly(): boolean {
    return this.getActiveCharacter().canFly;
  }

  public formatEp(): string {
    return Math.floor(this.ep).toLocaleString('tr-TR');
  }

  public getCooldownRemaining(): number {
    return Math.max(this.skillCooldown, this.castLockout);
  }

  public getSecondaryCooldownRemaining(): number {
    return Math.max(this.secondaryCooldown, this.castLockout);
  }

  public update(dt: number, currentHp: number) {
    if (this.skillCooldown > 0) {
      this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    }
    if (this.secondaryCooldown > 0) {
      this.secondaryCooldown = Math.max(0, this.secondaryCooldown - dt);
    }
    if (this.castLockout > 0) {
      this.castLockout = Math.max(0, this.castLockout - dt);
    }
    if (this.awakeningTimer > 0) {
      this.awakeningTimer = Math.max(0, this.awakeningTimer - dt);
    }
    if (this.awakeningCooldown > 0) {
      this.awakeningCooldown = Math.max(0, this.awakeningCooldown - dt);
    }

    // Authentic anime chakra / reiatsu / magicule recovery (24/sec base, boosted during Bankai/Awakening)
    const maxMp = this.getMaxMagicules();
    if (this.magicules < maxMp) {
      const regenRate = (this.awakeningTimer > 0 ? 42 : 24) * this.magiculeRegenMult;
      this.magicules = Math.min(maxMp, this.magicules + regenRate * dt);
    }

    // Passive Ultraspeed Regeneration when wounded
    if (currentHp > 0 && currentHp < 20 && this.magicules > 40) {
      if (Math.random() < dt * 1.25) {
        this.magicules = Math.max(0, this.magicules - 3);
        this.onAutoHealPlayer?.(2);
      }
    }

    if (this.dirtySave) {
      this.saveTimer += dt;
      if (this.saveTimer >= 4.0) {
        this.saveTimer = 0;
        this.saveNow();
      }
    }
  }

  public grantEpAndSoul(epAmount: number, souls = 0, reason?: string) {
    this.ep += epAmount;
    this.souls += souls;
    this.dirtySave = true;
    if (reason && epAmount >= 500) {
      this.onVoiceAnnouncement?.(
        `« ${this.getSageName()} »`,
        `${reason} özümsendi! +${epAmount.toLocaleString('tr-TR')} EP${souls > 0 ? ` · +${souls} Ruh` : ''}`
      );
    }
  }

  // Unrestricted 1-Click Character Transformation
  public transformIntoCharacter(queryOrId: string): { ok: boolean; char: TensuraCharacterDef; msg: string } {
    const q = queryOrId.trim().toLocaleLowerCase('tr');
    const found =
      TOP_50_TENSURA_CHARACTERS.find((c) => c.id === q) ||
      TOP_50_TENSURA_CHARACTERS.find(
        (c) =>
          c.name.toLocaleLowerCase('tr').includes(q) ||
          String(c.rank) === q.replace('#', '')
      );
    if (!found) {
      const cur = this.getActiveCharacter();
      return { ok: false, char: cur, msg: `Karakter bulunamadı: "${queryOrId}". [B] menüsünden seçin.` };
    }

    this.characterId = found.id;
    if (!found.canSlimeShift) {
      this.slimeForm = false;
    }
    this.ep = Math.max(this.ep, found.epValue);
    this.activeSkill = found.signatureSkill;
    this.magicules = this.getMaxMagicules();
    this.skillCooldown = 0;
    this.secondaryCooldown = 0;
    this.castLockout = 0;
    this.awakeningTimer = 0;
    this.awakeningCooldown = 0;
    this.saveNow();

    const msg = `#${found.rank} ${found.name} (${found.title}) formuna dönüştünüz! İmza Güç: [${TENSURA_SKILLS[found.signatureSkill].name}]`;
    this.onVoiceAnnouncement?.(`« ${this.getSageName()} »`, msg);
    return { ok: true, char: found, msg };
  }

  public toggleHumanMimicry(canStandUp: boolean): { ok: boolean; slimeForm: boolean; msg: string } {
    const cur = this.getActiveCharacter();
    if (!cur.canSlimeShift) {
      this.characterId = 'rimuru';
      this.slimeForm = true;
      this.activeSkill = 'beelzebuth';
      this.saveNow();
      return {
        ok: true,
        slimeForm: true,
        msg: 'Rimuru Mavi Balçık Formu aktif! (1 blokluk dar geçitlerden geçebilirsiniz)'
      };
    }
    if (this.slimeForm && !canStandUp) {
      return {
        ok: false,
        slimeForm: true,
        msg: 'Tavan çok alçak! İnsan formuna geçmek için açık alana çıkın.'
      };
    }
    this.slimeForm = !this.slimeForm;
    this.dirtySave = true;
    return {
      ok: true,
      slimeForm: this.slimeForm,
      msg: this.slimeForm
        ? 'Mavi Balçık Formu aktif! (1 blokluk dar geçitlerden geçebilirsiniz)'
        : `${cur.name} İnsan Formu aktif!`
    };
  }

  public cycleActiveSkill(): TensuraSkillId {
    const idx = ALL_SKILL_IDS.indexOf(this.activeSkill);
    this.activeSkill = ALL_SKILL_IDS[(idx + 1) % ALL_SKILL_IDS.length];
    this.dirtySave = true;
    return this.activeSkill;
  }

  public selectSkill(id: TensuraSkillId): boolean {
    if (!(id in TENSURA_SKILLS)) return false;
    this.activeSkill = id;
    this.dirtySave = true;
    return true;
  }

  public canStartSkillCast(
    id = this.activeSkill,
    isSecondary = false
  ): { ok: boolean; reason?: string; def: TensuraSkillDef; effCost: number } {
    const def = TENSURA_SKILLS[id];
    const cd = isSecondary ? Math.max(this.secondaryCooldown, this.castLockout) : Math.max(this.skillCooldown, this.castLockout);
    if (cd > 0.05) {
      return {
        ok: false,
        reason: `${def.name} yeniden hazırlanıyor (${cd.toFixed(1)} sn)`,
        def,
        effCost: def.cost
      };
    }
    const effCost = this.awakeningTimer > 0 ? Math.max(20, Math.round(def.cost * 0.65)) : def.cost;
    if (this.magicules < effCost) {
      return {
        ok: false,
        reason: `Yetersiz Çakra / Reiatsu / Öz (${Math.floor(this.magicules)}/${effCost})`,
        def,
        effCost
      };
    }
    return { ok: true, def, effCost };
  }

  public tryConsumeForSkill(
    id = this.activeSkill,
    isSecondary = false
  ): { ok: boolean; reason?: string; def: TensuraSkillDef } {
    const check = this.canStartSkillCast(id, isSecondary);
    if (!check.ok) {
      return { ok: false, reason: check.reason, def: check.def };
    }
    this.magicules -= check.effCost;
    const finalCd = this.awakeningTimer > 0 ? check.def.cooldown * 0.68 : check.def.cooldown;
    if (isSecondary) {
      this.secondaryCooldown = finalCd;
    } else {
      this.skillCooldown = finalCd;
    }
    this.castLockout = 1.35;
    this.dirtySave = true;
    return { ok: true, def: check.def };
  }

  public nextCompanionPreset(): CompanionPreset {
    const p = TEMPEST_COMPANION_PRESETS[this.companionCycleIdx % TEMPEST_COMPANION_PRESETS.length];
    this.companionCycleIdx++;
    return p;
  }

  // ==========================================================================
  // UNIVERSAL MONSTER NAMING — Converts ANY Mob into a 100% Loyal Tempest Ally
  // ==========================================================================
  public nameTargetMob(mob: MobEntity, customName?: string): { ok: boolean; msg: string; assignedName?: string } {
    if (mob.dead || mob.deathTimer > 0) {
      return { ok: false, msg: 'Bu canlı artık hayatta değil.' };
    }
    const cleanCustom = customName?.trim().slice(0, 18);
    if (mob.ally && !cleanCustom) {
      return {
        ok: true,
        assignedName: mob.name,
        msg: `★ ${mob.name} zaten sadık Tempest ordunuzda! (Can: ${Math.ceil(mob.hp)}/${mob.maxHp})`
      };
    }

    const baseName = cleanCustom || DEFAULT_ALLY_NAMES[mob.species] || `${mob.name} Tempest`;
    const finalName =
      !cleanCustom && this.namedCount > 0 && baseName === DEFAULT_ALLY_NAMES[mob.species]
        ? `${baseName} #${this.namedCount + 1}`
        : baseName;

    // Deduct light Magicules if available (never blocks naming!)
    this.magicules = Math.max(0, this.magicules - Math.min(this.magicules, 50));

    // Apply full loyalty flags directly on mob entity as well
    mob.name = finalName;
    mob.ally = true;
    mob.tamed = true;
    mob.sitting = false;
    mob.hostile = false;
    mob.neutral = false;
    mob.provoked = false;
    mob.fuseTimer = 0;
    mob.attackTarget = null;

    this.namedCount++;
    this.ep += 15_000;
    this.saveNow();

    const msg = `« İsim Bahşedildi » "${finalName}" Jura Tempest ordunuza katıldı! Asla size saldırmaz, düşmanlarınızı avlar.`;
    this.onVoiceAnnouncement?.('« Dünya\'nın Sesi »', msg);
    return { ok: true, msg, assignedName: finalName };
  }

  // ==========================================================================
  // MANAS: CIEL INTERACTIVE AI ADVISOR
  // ==========================================================================
  public askGreatSage(
    rawQuestion: string,
    ctx: {
      px: number;
      py: number;
      pz: number;
      dim: string;
      biome: string;
      hp: number;
      allyCount?: number;
      lookedMob?: MobEntity | null;
    }
  ): string {
    const q = rawQuestion.trim().toLocaleLowerCase('tr');
    const sage = this.getSageName();
    const ch = this.getActiveCharacter();

    let answer = '';
    if (!q || q.includes('durum') || q.includes('kim') || q.includes('seviye') || q.includes('stat')) {
      answer =
        `Rapor: Aktif Form #${ch.rank} ${ch.name} (${ch.title}) · EP: ${this.formatEp()} · ` +
        `Büyü Özü: ${Math.floor(this.magicules)}/${this.getMaxMagicules()} · Sadık Tempest Dostu: ${ctx.allyCount ?? this.namedCount} · ` +
        `Aktif Nihai Güç: [${TENSURA_SKILLS[this.activeSkill].name}].`;
    } else if (q.includes('analiz') || q.includes('hedef') || q.includes('canlı') || q.includes('yaratık')) {
      if (ctx.lookedMob) {
        const m = ctx.lookedMob;
        answer =
          `Hedef Analizi: "${m.name}" (Tür: ${m.species}) · Can: ${Math.ceil(m.hp)}/${m.maxHp} · Saldırı: ${m.attackDmg || 0} · ` +
          `Durum: ${m.ally ? '★ Sadık Tempest Dostunuz (Sizi Korur)' : m.hostile ? 'Saldırgan Düşman (İsim vererek dostunuz yapabilirsiniz!)' : 'Barışçıl'}.`;
      } else {
        answer = 'Bildirim: Nişangahınızda bir canlı yok. Herhangi bir yaratığa yaklaşıp analiz edebilir veya [İsim Ver] ile ordunuza katabilirsiniz.';
      }
    } else if (q.includes('isim') || q.includes('dost') || q.includes('ordu') || q.includes('saldır')) {
      answer =
        'Çözüm: Baktığınız HERHANGİ BİR canlıya (Zombi, İskelet, Kurt, Creeper, Enderman, Boss dahil!) [Baktığın Canlıya İsim Ver] veya `/isim <ad>` ile isim verdiğinizde %100 sadık Tempest muhafızınız olur. Asla size vurmaz, etraftaki düşmanları avlar! Ayrıca [Sadık Dost Çağır] butonuyla anında Ranga, Diablo veya Benimaru muhafızı çağırabilirsiniz.';
    } else if (q.includes('minecraft') || q.includes('steve') || q.includes('alex') || q.includes('normal') || q.includes('orijinal')) {
      answer =
        'Minecraft Formu: Üst bardaki [MC Steve] tuşuna, [B] menüsündeki [Minecraft Karakterine Dön (Steve)] / [Alex Formu] butonlarına basarak veya `/minecraft`, `/steve`, `/alex`, `/herobrine`, `/technoblade` yazarak anında orijinal Mojang piksel-kübik Minecraft karakterlerine dönüşebilirsiniz! [Minecraft (12)] sekmesinde 12 efsanevi Minecraft karakteri hazırdır.';
    } else if (q.includes('karakter') || q.includes('dönüş') || q.includes('top 50') || q.includes('tempest') || q.includes('108')) {
      answer =
        'Rehber: [B] menüsünden Minecraft (Steve, Alex, Herobrine, Technoblade), Tensura, Naruto, Bleach (Genryusai Yamamoto, Ichigo, Kenpachi, Aizen), Dragon Ball, One Piece ve RPG Sınıfları dahil 108 efsanevi karaktere tek tıkla dönüşebilirsiniz!';
    } else if (q.includes('güç') || q.includes('yetenek') || q.includes('zaman') || q.includes('azathoth') || q.includes('uyan')) {
      answer =
        'Nihai Güçler & Uyanış: Her karaktere özel araştırılmış 76 gerçek imza yetenek açıktır! [R] Birincil Nihai Güç, [X] İkincil İmza Güç, [G] Karakter Uyanışı (18sn +%45 Hasar, +%22 Hız & Yarı Dolum), [Z] Sıradaki Güç!';
    } else if (q.includes('uç') || q.includes('kanat')) {
      answer = 'Çözüm: Karakterlerin büyük çoğunluğunda uçuş açıktır — havada çift [Space] tuşuna basarak özgürce uçabilirsiniz!';
    } else {
      answer =
        `Analiz (${ctx.biome}, ${Math.round(ctx.px)}, ${Math.round(ctx.py)}, ${Math.round(ctx.pz)}): ` +
        `Aktif karakteriniz ${ch.name} (${ch.universe}). [B] menüsünden 108 karaktere (veya [MC Steve] ile orijinal Minecraft karakterine) dönüşebilir, [R]/[X] ile imza becerilerinizi ve [G] ile Uyanış formunu kullanabilirsiniz.`;
    }

    this.onSageChat?.(sage, answer);
    return answer;
  }
}
