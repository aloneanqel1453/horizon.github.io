// Tensura: Ultimate Jura Tempest & Top-50 Canonical Powerhouse RPG System
// Includes:
//  - Top 50 Strongest Tensura & Jura Tempest Characters (1-click restriction-free 3D transformation)
//  - 16 Real Canonical Ultimate Skills (all unlocked, paired with 3D VFX in tensuraVfx.ts)
//  - Universal Loyal Monster Naming (converts ANY mob into a 100% loyal Tempest bodyguard)
//  - Interactive Manas: Ciel / Büyük Bilge AI Advisor

import { MobEntity, MobSpecies } from '../entities/mobSystem';
import { CharacterVisualSpec } from '../entities/avatars';

export type TensuraFaction = 'all' | 'tempest' | 'dragon' | 'octagram' | 'primordial' | 'awakened';

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
  | 'uriel_absolute_guard';

export interface TensuraSkillDef {
  id: TensuraSkillId;
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
  }
};

export const ALL_SKILL_IDS: TensuraSkillId[] = Object.keys(TENSURA_SKILLS) as TensuraSkillId[];

export interface TensuraCharacterDef {
  rank: number;
  id: string;
  name: string;
  title: string;
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
  { id: 'benimaru', name: 'Benimaru (Alev Komutanı)', role: 'Menzilli Ateş Topu', species: 'blaze' },
  { id: 'souei', name: 'Souei (Rüzgar Casusu)', role: 'Menzilli Rüzgar Yükü', species: 'breeze' },
  { id: 'gobta', name: 'Gobta (Keskin Arbalet)', role: 'Menzilli Okçu', species: 'pillager' },
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
  zombified_piglin: 'Gozu'
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

const STORAGE_KEY = 'horizon_tensura_rpg_v2';

export class TensuraSystem {
  public characterId = 'rimuru';
  public evoStage = 4;
  public slimeForm = false; // Start in crisp humanoid Rimuru look (press [V] anytime to shift into 3D Azure Slime!)
  public ep = 120_000_000;
  public magicules = 2000;
  public souls = 25;
  public skills: TensuraSkillId[] = [...ALL_SKILL_IDS];
  public activeSkill: TensuraSkillId = 'beelzebuth';
  public absorbedCount = 0;
  public namedCount = 0;

  private companionCycleIdx = 0;
  private skillCooldown = 0;
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<PersistedTensuraV2>;
      if (d.characterId && TOP_50_TENSURA_CHARACTERS.some((c) => c.id === d.characterId)) {
        this.characterId = d.characterId;
      }
      if (typeof d.slimeForm === 'boolean') {
        this.slimeForm = this.getActiveCharacter().canSlimeShift ? d.slimeForm : false;
      }
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
    return Math.max(50, Math.min(999, 1000 - ch.rank * 8 + Math.min(90, Math.floor(this.souls / 2))));
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
    return this.isSlimeBodyActive() ? base * 1.05 : base;
  }

  public getMeleeDamageBonus(): number {
    return this.getActiveCharacter().dmgBonus;
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
    return this.skillCooldown;
  }

  public update(dt: number, currentHp: number) {
    if (this.skillCooldown > 0) {
      this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    }

    // Generous rapid Magicule regeneration (75/sec) so Ultimate Skills feel responsive & limitless
    const maxMp = this.getMaxMagicules();
    if (this.magicules < maxMp) {
      this.magicules = Math.min(maxMp, this.magicules + 75 * dt);
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

  // Unrestricted 1-Click Top-50 Character Transformation
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
      return { ok: false, char: cur, msg: `Karakter bulunamadı: "${queryOrId}". [K] menüsünden Top 50 listesinden seçin.` };
    }

    this.characterId = found.id;
    if (!found.canSlimeShift) {
      this.slimeForm = false;
    }
    this.ep = Math.max(this.ep, found.epValue);
    this.activeSkill = found.signatureSkill;
    this.magicules = this.getMaxMagicules();
    this.skillCooldown = 0;
    this.saveNow();

    const msg = `#${found.rank} ${found.name} (${found.title}) formuna dönüştünüz! İmza Güç: [${TENSURA_SKILLS[found.signatureSkill].name}]`;
    this.onVoiceAnnouncement?.(`« ${this.getSageName()} »`, msg);
    return { ok: true, char: found, msg };
  }

  public toggleHumanMimicry(canStandUp: boolean): { ok: boolean; slimeForm: boolean; msg: string } {
    const cur = this.getActiveCharacter();
    if (!cur.canSlimeShift) {
      // Switch straight into Rimuru Azure Slime Form so [V] ALWAYS works regardless of current character!
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

  public tryConsumeForSkill(id = this.activeSkill): { ok: boolean; reason?: string; def: TensuraSkillDef } {
    const def = TENSURA_SKILLS[id];
    if (this.skillCooldown > 0.05) {
      return { ok: false, reason: `Yetenek doluyor (${this.skillCooldown.toFixed(1)} sn)`, def };
    }
    if (this.magicules < def.cost) {
      return { ok: false, reason: `Yetersiz Büyü Özü (${Math.floor(this.magicules)}/${def.cost})`, def };
    }
    this.magicules -= def.cost;
    this.skillCooldown = def.cooldown;
    this.dirtySave = true;
    return { ok: true, def };
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
    } else if (q.includes('karakter') || q.includes('dönüş') || q.includes('top 50') || q.includes('tempest')) {
      answer =
        'Rehber: Sol paneldeki [Top 50 Karakter] sekmesinden Rimuru, Ciel, Veldanava, Milim, Guy Crimson, Chloe, Velzard, Veldora, Diablo, Zegion, Benimaru, Shion, Carrera, Testarossa, Ultima, Ranga dahil 50 efsanevi karaktere tek tıkla kısıtlamasız dönüşebilirsiniz!';
    } else if (q.includes('güç') || q.includes('yetenek') || q.includes('zaman') || q.includes('azathoth')) {
      answer =
        'Nihai Güçler: 16 gerçek Tensura Ultimate Skill tamamı açık! [R] ile aktif gücü ateşleyin, [X] ile karakterinizin ikinci imza gücünü kullanın, [Z] ile güç değiştirin. Öneri: Yog-Sothoth zamanı 6sn durdurur, Azathoth alanı yok eder, Uriel ölümsüz kalkan + ordu şifası verir!';
    } else if (q.includes('uç') || q.includes('kanat')) {
      answer = 'Çözüm: Neredeyse tüm Top 50 karakterlerde uçuş açıktır — havada çift [Space] tuşuna basarak özgürce uçabilirsiniz!';
    } else {
      answer =
        `Analiz (${ctx.biome}, ${Math.round(ctx.px)}, ${Math.round(ctx.py)}, ${Math.round(ctx.pz)}): ` +
        `Aktif karakteriniz ${ch.name}. [K] menüsünden Top 50 karaktere dönüşebilir, 16 nihai gücü [R]/[X] ile kullanabilir veya baktığınız canlıya isim verip ordunuza katabilirsiniz.`;
    }

    this.onSageChat?.(sage, answer);
    return answer;
  }
}
