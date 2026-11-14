import { BLOCK, BLOCKS, ToolClass, getBlock } from '../world/blocks';

export interface ItemStack {
  id: number;
  count: number;
  damage?: number; // durability used
  ench?: number;   // Enchanting Table power tier (1..3)
  loaded?: boolean; // Crossbow persisted cocked/loaded bolt state
}

export interface ItemDef {
  id: number;
  key: string;
  name: string;
  isBlock: boolean;
  maxStack: number;
  toolClass?: ToolClass;
  tier?: number;        // 1=wood, 2=stone, 3=iron, 4=diamond, 5=netherite, 2.5=gold
  miningSpeed?: number; // Horizon mining.rs speeds: wood=2, stone=4, iron=6, diamond=8, netherite=9, gold=12
  attackDamage?: number;
  maxDurability?: number;
  foodRestore?: number; // half-shanks (1..20)
  healAmount?: number;
  armorPoints?: number;
  armorSlot?: 'head' | 'chest' | 'legs' | 'feet';
  spawnSpecies?: string;
  // 16x16 ASCII sprite + palette for crisp pixel icon & 3D pixel-extruded hand rendering!
  sprite?: { rows: string[]; palette: Record<string, string> };
}

export const ITEM = {
  STICK: 200,
  COAL: 201,
  IRON_INGOT: 202,
  GOLD_INGOT: 203,
  DIAMOND: 204,
  EMERALD: 205,
  NETHERITE_INGOT: 206,
  COPPER_INGOT: 207,
  RAW_IRON: 208,
  RAW_GOLD: 209,
  FLINT_AND_STEEL: 210,
  BUCKET_EMPTY: 211,
  BUCKET_WATER: 212,
  BUCKET_LAVA: 213,
  ENDER_PEARL: 214,
  BONE: 215,
  GUNPOWDER: 216,
  STRING: 217,
  ARROW: 218,
  BOW: 219,
  SHIELD: 220,
  SHEARS: 221,
  BOAT_ITEM: 222,
  APPLE: 223,
  GOLDEN_APPLE: 224,
  BREAD: 225,
  RAW_BEEF: 226,
  COOKED_STEAK: 227,
  WHEAT_ITEM: 228,
  FLINT: 229,
  // Swords
  WOOD_SWORD: 230,
  STONE_SWORD: 231,
  IRON_SWORD: 232,
  GOLD_SWORD: 233,
  DIAMOND_SWORD: 234,
  NETHERITE_SWORD: 235,
  // Pickaxes
  WOOD_PICKAXE: 240,
  STONE_PICKAXE: 241,
  IRON_PICKAXE: 242,
  GOLD_PICKAXE: 243,
  DIAMOND_PICKAXE: 244,
  NETHERITE_PICKAXE: 245,
  // Axes
  WOOD_AXE: 250,
  STONE_AXE: 251,
  IRON_AXE: 252,
  DIAMOND_AXE: 253,
  NETHERITE_AXE: 254,
  // Shovels
  WOOD_SHOVEL: 260,
  STONE_SHOVEL: 261,
  IRON_SHOVEL: 262,
  DIAMOND_SHOVEL: 263,
  // Hoes
  WOOD_HOE: 264,
  STONE_HOE: 265,
  IRON_HOE: 266,
  DIAMOND_HOE: 267,
  // Armor (4 Slots: Helmet, Chestplate, Leggings, Boots)
  IRON_HELMET: 270,
  IRON_CHESTPLATE: 271,
  DIAMOND_HELMET: 272,
  DIAMOND_CHESTPLATE: 273,
  IRON_LEGGINGS: 274,
  IRON_BOOTS: 275,
  DIAMOND_LEGGINGS: 276,
  DIAMOND_BOOTS: 277,
  GOLD_HELMET: 278,
  GOLD_CHESTPLATE: 279,
  GOLD_LEGGINGS: 288,
  GOLD_BOOTS: 289,
  // Spawn Eggs
  SPAWN_VILLAGER: 280,
  SPAWN_COPPER_GOLEM: 281,
  SPAWN_HORSE: 282,
  SPAWN_CAMEL: 283,
  SPAWN_WOLF: 284,
  SPAWN_ZOMBIE: 285,
  SPAWN_CREEPER: 286,
  SPAWN_ENDERMAN: 287,
  // Wave 5: Netherite Scrap, Armor & Tools
  NETHERITE_SCRAP: 290,
  NETHERITE_HELMET: 291,
  NETHERITE_CHESTPLATE: 292,
  NETHERITE_LEGGINGS: 293,
  NETHERITE_BOOTS: 294,
  NETHERITE_SHOVEL: 295,
  NETHERITE_HOE: 296,
  // Wave 6: Snowball Projectile
  SNOWBALL: 297,
  // Wave 7: Spyglass (`fov.rs`), Sweet Berries, Amethyst Shard, Totem of Undying (`totem.rs`) & Mace (`mace.rs` 26.3)
  SPYGLASS: 298,
  SWEET_BERRIES: 299,
  AMETHYST_SHARD: 300,
  TOTEM_OF_UNDYING: 301,
  MACE: 302,
  // Wave 8: Horizon 26.3 Spear (`spear.rs`), Trident (`trident.rs`), Music Disc (`jukebox.rs`) & Wind Charge (`wind.rs`)
  IRON_SPEAR: 303,
  DIAMOND_SPEAR: 304,
  TRIDENT: 305,
  MUSIC_DISC: 306,
  WIND_CHARGE: 307,
  // Wave 9: Crossbow (`crossbow.rs`), Leather Armor + Leather Boots (`powder_snow_collision.rs`) & Powder Snow Bucket
  CROSSBOW: 308,
  LEATHER: 309,
  LEATHER_HELMET: 310,
  LEATHER_CHESTPLATE: 311,
  LEATHER_LEGGINGS: 312,
  LEATHER_BOOTS: 313,
  BUCKET_POWDER_SNOW: 314,
  // Wave 13: 3D Interactive Armor Stand (`armor_stands.rs`) & Horizon 26.3 / Boss Spawn Eggs
  ARMOR_STAND: 315,
  SPAWN_WANDERING_TRADER: 316,
  SPAWN_HAPPY_GHAST: 317,
  SPAWN_NAUTILUS: 318,
  SPAWN_BREEZE: 319,
  SPAWN_WARDEN: 320,
  SPAWN_CREAKING: 321,
  SPAWN_ALLAY: 322,
  SPAWN_WITHER: 323,
  // Wave 14: Authentic Original Minecraft Items (Bone Meal, Fishing Rod, Cod, Carrots, Elytra & Firework Rockets!)
  BONE_MEAL: 324,
  FISHING_ROD: 325,
  RAW_COD: 326,
  COOKED_COD: 327,
  CARROT: 328,
  GOLDEN_CARROT: 329,
  ELYTRA: 330,
  FIREWORK_ROCKET: 331
} as const;

export const ANY_PLANKS = -1;

export function isPlankItem(id: number): boolean {
  return (
    id === BLOCK.OAK_PLANKS ||
    id === BLOCK.BIRCH_PLANKS ||
    id === BLOCK.SPRUCE_PLANKS ||
    id === BLOCK.CHERRY_PLANKS ||
    id === BLOCK.ACACIA_PLANKS
  );
}

export function isFuelItem(id: number): boolean {
  return (
    id === ITEM.COAL ||
    isPlankItem(id) ||
    id === BLOCK.OAK_LOG ||
    id === BLOCK.BIRCH_LOG ||
    id === BLOCK.SPRUCE_LOG ||
    id === BLOCK.CHERRY_LOG ||
    id === BLOCK.ACACIA_LOG ||
    id === ITEM.STICK
  );
}

// 16x16 Authentic JAPPA Multi-Tone Pixel Templates
// '.' = transparent, 'h'/'H'/'W' = 3-tone oak handle (NO black outline!), 'O'/'D'/'M'/'L'/'E' = 5-tone forged head
const SWORD_ROWS = [
  '.............OO.',
  '............OLEO',
  '...........OLEMO',
  '..........OLEMD.',
  '.........OLEMD..',
  '........OLEMD...',
  '.......OLEMD....',
  '......OLEMD.....',
  '..GG.OLEMD......',
  '..GLGOLMD.......',
  '...OGGGO........',
  '...WhGGO........',
  '..hHW.OO........',
  '.hHW............',
  'OGL.............',
  'OO..............'
];

const PICKAXE_ROWS = [
  '.....OOOOOOO....',
  '...OOELLLLLMMO..',
  '..OELMMDDDMMhMO.',
  '..OEMO....hHWLMO',
  '..OO.....hHW.OMO',
  '........hHW..OMO',
  '.......hHW...OMO',
  '......hHW....OO.',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  'hHW.............',
  'WW..............',
  '................'
];

const AXE_ROWS = [
  '......OOOO......',
  '.....OELLMO.....',
  '....OELLMMhOO...',
  '....OELMMhHWMO..',
  '....OEMMDhHWDMO.',
  '.....OOMDhHWOO..',
  '......OO.hHW....',
  '........hHW.....',
  '.......hHW......',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  '.WW.............'
];

const SHOVEL_ROWS = [
  '...........OOOO.',
  '..........OELLMO',
  '.........OELLMMO',
  '.........OEMMMDO',
  '.........ODMMDO.',
  '........hHWDDO..',
  '.......hHW.OO...',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  'hHW.............',
  'WW..............',
  '................'
];

const TIER_PALETTES = {
  wood: { O: '#4a3319', D: '#6b4c26', M: '#8f6838', L: '#b3864c', E: '#cda063', G: '#593d1f', W: '#382510', H: '#664920', h: '#876330' },
  stone: { O: '#43454a', D: '#63656b', M: '#84878f', L: '#a8acb5', E: '#c9cdd6', G: '#56585e', W: '#3b2911', H: '#6b4e21', h: '#8f6b32' },
  iron: { O: '#525a66', D: '#8c96a4', M: '#c2cbd6', L: '#e6edf5', E: '#ffffff', G: '#727c8a', W: '#3b2911', H: '#6b4e21', h: '#8f6b32' },
  gold: { O: '#754b0a', D: '#bd8515', M: '#edc02b', L: '#ffeb6b', E: '#ffffc2', G: '#9e690e', W: '#3b2911', H: '#6b4e21', h: '#8f6b32' },
  diamond: { O: '#145861', D: '#1da19c', M: '#33ded0', L: '#85fff5', E: '#e0ffff', G: '#1b8580', W: '#3b2911', H: '#6b4e21', h: '#8f6b32' },
  netherite: { O: '#261e26', D: '#3b323d', M: '#544a57', L: '#7a6e80', E: '#9d8fa3', G: '#453642', W: '#382019', H: '#5e392b', h: '#7d4f3d' },
  leather: { O: '#4d2b15', D: '#7d4725', M: '#a66238', L: '#cf8352', E: '#e6a173', G: '#7a4524', W: '#3b2911', H: '#6b4e21', h: '#8f6b32' }
};

function makeSprite(rows: string[], palette: Record<string, string>) {
  return { rows, palette };
}

const STICK_SPRITE = makeSprite([
  '................',
  '................',
  '............hH..',
  '...........hHW..',
  '..........hHW...',
  '.........hHW....',
  '........hHW.....',
  '.......hHW......',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '..WW............',
  '................',
  '................'
], { W: '#3b2911', H: '#6b4e21', h: '#967035' });

const INGOT_ROWS = [
  '................',
  '................',
  '................',
  '.....OOOOOOO....',
  '...OOMLLLLLMOO..',
  '..OMLLLLLLLLMMO.',
  '.OMMLLLLLLMMMMMO',
  '.OMMMMMMMMMMMMMO',
  '..OOMMMMMMMMMOO.',
  '....OOOOOOOOO...',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const GEM_ROWS = [
  '................',
  '.....OOOOOO.....',
  '....OLLLLLLO....',
  '...OLLMLLLLMO...',
  '..OLLLMLLLLMMO..',
  '..OMLLMLLLMMMO..',
  '..OMMLLLLMMMMO..',
  '...OMMMMMMMMO...',
  '....OMMMMMMO....',
  '.....OOOOOO.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const STEAK_SPRITE = makeSprite([
  '................',
  '....OOOOOOO.....',
  '..OOMMMMMMMOO...',
  '.OMMLLLLMMMMMO..',
  '.OMLLFFLLMMMMMO.',
  '.OMLFFFFLLMMMMO.',
  '.OMMMFFMMMMMMMO.',
  '..OMMMMMMMMMMO..',
  '...OOMMMMMMOO...',
  '.....OOOOOO.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
], { O: '#33170c', M: '#803c22', L: '#a65433', F: '#e0b88a' });

const BREAD_SPRITE = makeSprite([
  '................',
  '................',
  '....OOOOOOOO....',
  '..OOMLLLLLLMOO..',
  '.OMLLLLLLLLLLMO.',
  '.OMLLMMMMMMLLMO.',
  '.OMMMMMMMMMMMMO.',
  '..OOMMMMMMMMOO..',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
], { O: '#4a2e10', M: '#b57b2a', L: '#de9f40' });

const APPLE_ROWS = [
  '.......GG.......',
  '......GGO.......',
  '....OOOOOOO.....',
  '...OMLLLLMMO....',
  '..OMLLWWMMMMO...',
  '..OMLWMMMMMMO...',
  '..OMMMMMMMMMO...',
  '..OMMMMMMMMMO...',
  '...OMMMMMMMO....',
  '....OOOMOOO.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const BOW_SPRITE = makeSprite([
  '......WWWh......',
  '....WhHHhSO.....',
  '...hHW...SO.....',
  '..hHW....SO.....',
  '.hHW.....SO.....',
  '.hW......SO.....',
  'hGW......SO.....',
  'hGW......SO.....',
  'hGW......SO.....',
  '.hW......SO.....',
  '.hHW.....SO.....',
  '..hHW....SO.....',
  '...hHW...SO.....',
  '....WhHHhSO.....',
  '......WWWh......',
  '................'
], { W: '#3b2410', H: '#6e4b22', h: '#9a6e36', G: '#4a5568', S: '#e2e8f0', O: '#94a3b8' });

const ARROW_SPRITE = makeSprite([
  '............OOO.',
  '...........OEEMO',
  '..........OELMMO',
  '..........OOhWMO',
  '.........hHW.OO.',
  '........hHW.....',
  '.......hHW......',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...FffF.........',
  '..FFffF.........',
  '.FFff...........',
  'FFf.............',
  '................',
  '................'
], { O: '#4a5260', E: '#ffffff', L: '#e2e8f0', M: '#aeb8c4', h: '#967035', H: '#6b4e21', W: '#3b2911', F: '#cbd5e1', f: '#ffffff' });

const BUCKET_ROWS = [
  '................',
  '................',
  '...OOOOOOOOOO...',
  '..OMFFFFFFFFMO..',
  '..OMFFFFFFFFMO..',
  '..OMLLLLLLLLMO..',
  '...OMLLLLLLMO...',
  '...OMMMMMMMMO...',
  '....OMMMMMMO....',
  '.....OOOOOO.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const SHIELD_SPRITE = makeSprite([
  '..OOOOOOOOOOOO..',
  '..OILLLLLLLLIO..',
  '..OIHhHWhHhHIO..',
  '..OIHhHWhHhHIO..',
  '..OIHhHWhHhHIO..',
  '..OILLGEEGLLIO..',
  '..OIHhHWhHhHIO..',
  '..OIHhHWhHhHIO..',
  '...OHhHWhHhHO...',
  '...OHhHWhHhHO...',
  '....OHhWWhHO....',
  '.....OHWWHO.....',
  '......OOOO......',
  '................',
  '................',
  '................'
], { O: '#373d48', I: '#9aa4b2', L: '#dce4ef', G: '#ca8a04', E: '#fde047', W: '#4a3117', H: '#78522a', h: '#9c6e3b' });

const HOE_ROWS = [
  '......OOOOOO....',
  '....OOELLLLMMO..',
  '...OELMMDDhHWMO.',
  '...OEMO..hHW.OO.',
  '....OO..hHW.....',
  '.......hHW......',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  'hHW.............',
  'WW..............',
  '................',
  '................'
];

const HELMET_ROWS = [
  '....OOOOOOOO....',
  '..OOMLLLLLLMOO..',
  '.OMLLLLLLLLLLMO.',
  '.OMLLMMMMMMLLMO.',
  '.OMMMOOOOOOMMMO.',
  '.OMMO......OMMO.',
  '.OMMO......OMMO.',
  '..OO........OO..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const LEGGINGS_ROWS = [
  '...OOOOOOOOOO...',
  '..OMLLLLLLLLMO..',
  '..OMMMMMMMMMMO..',
  '..OMMMOOOOMMMO..',
  '..OMLLO..OLLMO..',
  '..OMLLO..OLLMO..',
  '..OMMMO..OMMMO..',
  '..OMMMO..OMMMO..',
  '..OMMMO..OMMMO..',
  '...OOO....OOO...',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const BOOTS_ROWS = [
  '................',
  '................',
  '................',
  '..OOOO....OOOO..',
  '..OMLM....MLMO..',
  '..OMLM....MLMO..',
  '.OOMLM....MLMOO.',
  'OMLLLM....MLLLMO',
  'OMMMMM....MMMMMO',
  'OOOOOO....OOOOOO',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const CHESTPLATE_ROWS = [
  '..OOOO....OOOO..',
  '.OMLLMO..OMLLMO.',
  '.OMLLLMOOMLLLMO.',
  '.OMLLLLMMLLLLMO.',
  '..OMMLLLLLLMMO..',
  '...OMLLLLLLMO...',
  '...OMLLLLLLMO...',
  '...OMMMMMMMMO...',
  '...OMMMMMMMMO...',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const SPYGLASS_ROWS = [
  '...........OOOO.',
  '..........OAALCO',
  '.........OAAALCO',
  '........OOMCCLCO',
  '.......OOMCCCOO.',
  '......OOMCCOO...',
  '.....OOMCCOO....',
  '....OOMCCOO.....',
  '...OOMCCOO......',
  '..OOMCCOO.......',
  '.OOCCCOO........',
  'OOCCOO..........',
  'OOOO............',
  '................',
  '................',
  '................'
];

const TOTEM_ROWS = [
  '....OOOOOOOO....',
  '...OGLLLLLLGO...',
  '...OGLEGGLEGO...',
  '..OOGGGGGGGGOO..',
  '.OGLLLLLLLLLLGO.',
  '.OGGOOGLLGOOGGO.',
  '..OO..OGGO..OO..',
  '.....OGLLLGO....',
  '.....OGLLLGO....',
  '......OGGGO.....',
  '......OGGGO.....',
  '.......OOO......',
  '................',
  '................',
  '................',
  '................'
];

const MACE_ROWS = [
  '.......OOOOOOO..',
  '......OELLLLLMO.',
  '.....OLMMMMMLMO.',
  '.....OMLLMLLMMO.',
  '.....ODMMMMMMDO.',
  '......OODMMDO...',
  '........hHWMO...',
  '.......hHW.OO...',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  '.WW.............',
  '................'
];

const SPEAR_ROWS = [
  '.............OOO',
  '............OLEO',
  '...........OLEMO',
  '..........OODMO.',
  '.........hHW.O..',
  '........hHW.....',
  '.......hHW......',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  'hHW.............',
  'WW..............',
  '................'
];

const TRIDENT_ROWS = [
  '..........OO..OO',
  '.........OEOOOEO',
  '........OLEOLEO.',
  '.........OMLLMO.',
  '.........OOMMOO.',
  '........hHW.MO..',
  '.......hHW..OO..',
  '......hHW.......',
  '.....hHW........',
  '....hHW.........',
  '...hHW..........',
  '..hHW...........',
  '.hHW............',
  'hHW.............',
  'WW..............',
  '................'
];

const DISC_ROWS = [
  '................',
  '....OOOOOOOO....',
  '..OODDDDDDDDOO..',
  '.ODDGGGGDDDDDDO.',
  '.ODDGDDDDDDDDDO.',
  '.ODDDDDAAACDDDO.',
  '.ODDDDACCACDDDO.',
  '.ODDDDDAAACDDDO.',
  '.ODDDDDDDDDDDDO.',
  '..OODDDDDDDDOO..',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const SHEARS_ROWS = [
  '.........OOO....',
  '........OMLLO...',
  '.......OMLLMO...',
  '......OMLLMO.OO.',
  '.....OMLLMO.OLLO',
  '....OOOMMO.OMLLO',
  '...OOHHO..OMLLMO',
  '..OHHHO..OMLLMO.',
  '..OHHO..OOOMMO..',
  '..OO...OOHHO....',
  '......OHHHO.....',
  '......OHHO......',
  '.......OO.......',
  '................',
  '................',
  '................'
];

const FLINT_STEEL_ROWS = [
  '................',
  '....OOOOOO......',
  '...OLLLLLMO.....',
  '..OLLOOOOOO.....',
  '..OLLO..........',
  '..OLLO...OOOO...',
  '..OLLOO.OFFFFO..',
  '...OLLMOOFFDDDO.',
  '....OOOOOFFDDDO.',
  '........OFFDDDO.',
  '.........OOOOO..',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const BOAT_ROWS = [
  '................',
  '................',
  '.....OO....OO...',
  '....OHHO..OHHO..',
  '.....OHHO..OHHO.',
  '.OOOOOOOOOOOOOO.',
  'OMLLLLLLLLLLLLMO',
  'OMLHHHHHHHHHHLMO',
  '.OMMMMMMMMMMMMO.',
  '..OOMMMMMMMMOO..',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const BONE_ROWS = [
  '...........OO.OO',
  '..........OLLOLO',
  '..........OLLLL0'.replace('0', 'O'),
  '.........OOLLOO.',
  '........OLLO....',
  '.......OLLO.....',
  '......OLLO......',
  '.....OLLO.......',
  '....OLLO........',
  '...OLLO.........',
  '.OOLLOO.........',
  'OLLLLOO.........',
  'OLLOLO..........',
  'OO.OO...........',
  '................',
  '................'
];

const STRING_ROWS = [
  '................',
  '.....OOOOO......',
  '...OOLLLLLOO....',
  '..OLLOOOOOLLO...',
  '..OLLO...OLLO...',
  '...OO.OOO.OLLO..',
  '.....OLLO.OLLO..',
  '...OOLLO..OLLO..',
  '..OLLOO..OLLO...',
  '..OLLO..OLLO....',
  '...OOLLLLOO.....',
  '.....OOOO.......',
  '................',
  '................',
  '................',
  '................'
];

const WHEAT_ROWS = [
  '.........OO.OO..',
  '........OLL.LLO.',
  '.......OLLM.LLMO',
  '......OLLM.OLLMO',
  '.....OLLMO.OLLMO',
  '.....OMMOO.OMMO.',
  '....OHHHOOHHO...',
  '....OGRRRGHO....',
  '...OHHOGRRO.....',
  '..OHHO.OHHO.....',
  '.OHHO.OHHO......',
  '.OO..OHHO.......',
  '.....OO.........',
  '................',
  '................',
  '................'
];

const ORB_ROWS = [
  '................',
  '....OOOOOOOO....',
  '..OOMLLLLLLMOO..',
  '.OMMLLWWWWLLMMO.',
  '.OMLLWWLLLLMMMO.',
  '.OMLLLLLLLMMMMO.',
  '.OMMMMMMMDDDDMO.',
  '.OMMMMMDDDDDDMO.',
  '..OOMDDDDDDMOO..',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const WIND_CHARGE_ROWS = [
  '....OOOOOOOO....',
  '..OODLLLLLLDOO..',
  '.ODLLWWWWWWLLDO.',
  'ODLWOOOOOOOOWLDO',
  'ODLWO.OOOO.OWLDO',
  'ODLWO.OWWO.OWLDO',
  'ODLWO..OO..OWLDO',
  'ODLWOOOOOO.OWLDO',
  '.ODLLWWWWWWLLDO.',
  '..OODLLLLLLDOO..',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................',
  '................'
];

const EGG_ROWS = [
  '......OOOO......',
  '....OOMMMMOO....',
  '...OMMLLLLMMO...',
  '..OMMLMMMMMMMO..',
  '..OMMMMMLLLMMO..',
  '.OMMLLMMMMLLMMO.',
  '.OMMLLMMMMMMBMO.',
  '.OMMMMMMMMMMMMO.',
  '.OMMMLLMMMLLMMO.',
  '..OMMLLMMMMMMO..',
  '...OMMMMMMMMO...',
  '....OOOOOOOO....',
  '................',
  '................',
  '................',
  '................'
];

const EXTRA_ITEMS: ItemDef[] = [
  { id: ITEM.STICK, key: 'stick', name: 'Çubuk', isBlock: false, maxStack: 64, sprite: STICK_SPRITE },
  { id: ITEM.COAL, key: 'coal', name: 'Kömür', isBlock: false, maxStack: 64, sprite: makeSprite(ORB_ROWS, { O: '#101014', D: '#1c1c22', M: '#2d2d35', L: '#4b4b57', W: '#6b6b7a' }) },
  { id: ITEM.RAW_IRON, key: 'raw_iron', name: 'Ham Demir', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#4a3628', M: '#b88f72', L: '#e0bca2' }) },
  { id: ITEM.IRON_INGOT, key: 'iron_ingot', name: 'Demir Külçesi', isBlock: false, maxStack: 64, sprite: makeSprite(INGOT_ROWS, { O: '#383b40', M: '#b8bec7', L: '#f0f5fc' }) },
  { id: ITEM.RAW_GOLD, key: 'raw_gold', name: 'Ham Altın', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#523808', M: '#dba628', L: '#ffdf6b' }) },
  { id: ITEM.GOLD_INGOT, key: 'gold_ingot', name: 'Altın Külçesi', isBlock: false, maxStack: 64, sprite: makeSprite(INGOT_ROWS, { O: '#4a3208', M: '#e3b624', L: '#fff380' }) },
  { id: ITEM.COPPER_INGOT, key: 'copper_ingot', name: 'Bakır Külçesi', isBlock: false, maxStack: 64, sprite: makeSprite(INGOT_ROWS, { O: '#452214', M: '#c96b44', L: '#f09b75' }) },
  { id: ITEM.DIAMOND, key: 'diamond', name: 'Elmas', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#104045', M: '#2ad4c6', L: '#9efcf4' }) },
  { id: ITEM.EMERALD, key: 'emerald', name: 'Zümrüt', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#0d421e', M: '#22c95a', L: '#8affad' }) },
  { id: ITEM.NETHERITE_SCRAP, key: 'netherite_scrap', name: 'Netherit Hurdası', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#2d1c19', M: '#6e473b', L: '#9e6c5a' }) },
  { id: ITEM.NETHERITE_INGOT, key: 'netherite_ingot', name: 'Netherit Külçesi', isBlock: false, maxStack: 64, sprite: makeSprite(INGOT_ROWS, { O: '#1c161c', M: '#48404a', L: '#736878' }) },
  { id: ITEM.BONE, key: 'bone', name: 'Kemik (Kurt Evcilleştirir)', isBlock: false, maxStack: 64, sprite: makeSprite(BONE_ROWS, { O: '#6e6b62', L: '#f4f1e8' }) },
  { id: ITEM.GUNPOWDER, key: 'gunpowder', name: 'Barut', isBlock: false, maxStack: 64, sprite: makeSprite(ORB_ROWS, { O: '#222226', D: '#3f3f46', M: '#5c5c63', L: '#85858f', W: '#a1a1aa' }) },
  { id: ITEM.STRING, key: 'string', name: 'İp', isBlock: false, maxStack: 64, sprite: makeSprite(STRING_ROWS, { O: '#94a3b8', L: '#f8fafc' }) },
  { id: ITEM.WHEAT_ITEM, key: 'wheat', name: 'Buğday', isBlock: false, maxStack: 64, sprite: makeSprite(WHEAT_ROWS, { O: '#5c420e', H: '#b88c28', M: '#e3be46', L: '#fde68a', G: '#854d0e', R: '#dc2626' }) },
  { id: ITEM.FLINT, key: 'flint', name: 'Çakmaktaşı', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#18181c', M: '#3a3a42', L: '#7a7a88' }) },

  // Utility & Ranged
  { id: ITEM.FLINT_AND_STEEL, key: 'flint_and_steel', name: 'Çakmaktaşlı Çelik (Portal & TNT)', isBlock: false, maxStack: 1, maxDurability: 64, sprite: makeSprite(FLINT_STEEL_ROWS, { O: '#222228', M: '#94a3b8', L: '#e2e8f0', F: '#52525b', D: '#27272a' }) },
  { id: ITEM.BUCKET_EMPTY, key: 'bucket', name: 'Boş Kova', isBlock: false, maxStack: 16, sprite: makeSprite(BUCKET_ROWS, { O: '#30343b', M: '#9ea6b2', L: '#dce3ed', F: '#555b66' }) },
  { id: ITEM.BUCKET_WATER, key: 'water_bucket', name: 'Su Kovası', isBlock: false, maxStack: 1, sprite: makeSprite(BUCKET_ROWS, { O: '#30343b', M: '#9ea6b2', L: '#dce3ed', F: '#2d7ef7' }) },
  { id: ITEM.BUCKET_LAVA, key: 'lava_bucket', name: 'Lav Kovası', isBlock: false, maxStack: 1, sprite: makeSprite(BUCKET_ROWS, { O: '#30343b', M: '#9ea6b2', L: '#dce3ed', F: '#ff6a14' }) },
  { id: ITEM.ENDER_PEARL, key: 'ender_pearl', name: 'Ender İncisi (Sağ Tık Işınlar)', isBlock: false, maxStack: 16, sprite: makeSprite(ORB_ROWS, { O: '#06201e', D: '#0d4a44', M: '#18786e', L: '#2dd4bf', W: '#99f6e4' }) },
  { id: ITEM.ARROW, key: 'arrow', name: 'Ok', isBlock: false, maxStack: 64, sprite: ARROW_SPRITE },
  { id: ITEM.BOW, key: 'bow', name: 'Yay (Sağ Tık Ok Atar)', isBlock: false, maxStack: 1, maxDurability: 384, sprite: BOW_SPRITE },
  { id: ITEM.SHIELD, key: 'shield', name: 'Kalkan', isBlock: false, maxStack: 1, maxDurability: 336, sprite: SHIELD_SPRITE },
  { id: ITEM.SHEARS, key: 'shears', name: 'Makas', isBlock: false, maxStack: 1, toolClass: 'shears', miningSpeed: 5, maxDurability: 238, sprite: makeSprite(SHEARS_ROWS, { O: '#2d2f33', H: '#9a3412', M: '#cbd5e1', L: '#f8fafc' }) },
  { id: ITEM.BOAT_ITEM, key: 'oak_boat', name: 'Meşe Tekne', isBlock: false, maxStack: 1, sprite: makeSprite(BOAT_ROWS, { O: '#3b2610', H: '#6e4720', M: '#8a6032', L: '#b5844c' }) },

  // Foods
  { id: ITEM.APPLE, key: 'apple', name: 'Elma (+4 Açlık)', isBlock: false, maxStack: 64, foodRestore: 4, healAmount: 1, sprite: makeSprite(APPLE_ROWS, { O: '#420d0d', M: '#d92626', L: '#ff5252', W: '#ffd6d6', G: '#469c2d' }) },
  { id: ITEM.GOLDEN_APPLE, key: 'golden_apple', name: 'Altın Elma (+8 Can & Yenilenme)', isBlock: false, maxStack: 64, foodRestore: 6, healAmount: 8, sprite: makeSprite(APPLE_ROWS, { O: '#4f3506', M: '#ebb822', L: '#fff066', W: '#ffffcc', G: '#469c2d' }) },
  { id: ITEM.BREAD, key: 'bread', name: 'Ekmek (+5 Açlık)', isBlock: false, maxStack: 64, foodRestore: 5, healAmount: 2, sprite: BREAD_SPRITE },
  { id: ITEM.RAW_BEEF, key: 'beef', name: 'Çiğ Biftek', isBlock: false, maxStack: 64, foodRestore: 3, sprite: makeSprite(STEAK_SPRITE.rows, { O: '#451111', M: '#bd3333', L: '#e05353', F: '#f5dede' }) },
  { id: ITEM.COOKED_STEAK, key: 'cooked_beef', name: 'Pişmiş Biftek (+8 Açlık)', isBlock: false, maxStack: 64, foodRestore: 8, healAmount: 3, sprite: STEAK_SPRITE },

  // Swords
  { id: ITEM.WOOD_SWORD, key: 'wooden_sword', name: 'Tahta Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 1, attackDamage: 4, maxDurability: 59, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.wood) },
  { id: ITEM.STONE_SWORD, key: 'stone_sword', name: 'Taş Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 2, attackDamage: 5, maxDurability: 131, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.stone) },
  { id: ITEM.IRON_SWORD, key: 'iron_sword', name: 'Demir Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 3, attackDamage: 6, maxDurability: 250, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.GOLD_SWORD, key: 'golden_sword', name: 'Altın Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 2, attackDamage: 4, maxDurability: 32, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.gold) },
  { id: ITEM.DIAMOND_SWORD, key: 'diamond_sword', name: 'Elmas Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 4, attackDamage: 7, maxDurability: 1561, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.NETHERITE_SWORD, key: 'netherite_sword', name: 'Netherit Kılıç', isBlock: false, maxStack: 1, toolClass: 'sword', tier: 5, attackDamage: 8, maxDurability: 2031, sprite: makeSprite(SWORD_ROWS, TIER_PALETTES.netherite) },

  // Pickaxes (Exact Horizon mining.rs speeds: 2, 4, 6, 12, 8, 9)
  { id: ITEM.WOOD_PICKAXE, key: 'wooden_pickaxe', name: 'Tahta Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 1, miningSpeed: 2, attackDamage: 2, maxDurability: 59, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.wood) },
  { id: ITEM.STONE_PICKAXE, key: 'stone_pickaxe', name: 'Taş Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 2, miningSpeed: 4, attackDamage: 3, maxDurability: 131, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.stone) },
  { id: ITEM.IRON_PICKAXE, key: 'iron_pickaxe', name: 'Demir Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 3, miningSpeed: 6, attackDamage: 4, maxDurability: 250, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.GOLD_PICKAXE, key: 'golden_pickaxe', name: 'Altın Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 1, miningSpeed: 12, attackDamage: 2, maxDurability: 32, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.gold) },
  { id: ITEM.DIAMOND_PICKAXE, key: 'diamond_pickaxe', name: 'Elmas Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 4, miningSpeed: 8, attackDamage: 5, maxDurability: 1561, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.NETHERITE_PICKAXE, key: 'netherite_pickaxe', name: 'Netherit Kazma', isBlock: false, maxStack: 1, toolClass: 'pickaxe', tier: 5, miningSpeed: 9, attackDamage: 6, maxDurability: 2031, sprite: makeSprite(PICKAXE_ROWS, TIER_PALETTES.netherite) },

  // Axes
  { id: ITEM.WOOD_AXE, key: 'wooden_axe', name: 'Tahta Balta', isBlock: false, maxStack: 1, toolClass: 'axe', tier: 1, miningSpeed: 2, attackDamage: 5, maxDurability: 59, sprite: makeSprite(AXE_ROWS, TIER_PALETTES.wood) },
  { id: ITEM.STONE_AXE, key: 'stone_axe', name: 'Taş Balta', isBlock: false, maxStack: 1, toolClass: 'axe', tier: 2, miningSpeed: 4, attackDamage: 6, maxDurability: 131, sprite: makeSprite(AXE_ROWS, TIER_PALETTES.stone) },
  { id: ITEM.IRON_AXE, key: 'iron_axe', name: 'Demir Balta', isBlock: false, maxStack: 1, toolClass: 'axe', tier: 3, miningSpeed: 6, attackDamage: 7, maxDurability: 250, sprite: makeSprite(AXE_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.DIAMOND_AXE, key: 'diamond_axe', name: 'Elmas Balta', isBlock: false, maxStack: 1, toolClass: 'axe', tier: 4, miningSpeed: 8, attackDamage: 8, maxDurability: 1561, sprite: makeSprite(AXE_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.NETHERITE_AXE, key: 'netherite_axe', name: 'Netherit Balta', isBlock: false, maxStack: 1, toolClass: 'axe', tier: 5, miningSpeed: 9, attackDamage: 9, maxDurability: 2031, sprite: makeSprite(AXE_ROWS, TIER_PALETTES.netherite) },

  // Shovels
  { id: ITEM.WOOD_SHOVEL, key: 'wooden_shovel', name: 'Tahta Kürek', isBlock: false, maxStack: 1, toolClass: 'shovel', tier: 1, miningSpeed: 2, attackDamage: 2, maxDurability: 59, sprite: makeSprite(SHOVEL_ROWS, TIER_PALETTES.wood) },
  { id: ITEM.STONE_SHOVEL, key: 'stone_shovel', name: 'Taş Kürek', isBlock: false, maxStack: 1, toolClass: 'shovel', tier: 2, miningSpeed: 4, attackDamage: 3, maxDurability: 131, sprite: makeSprite(SHOVEL_ROWS, TIER_PALETTES.stone) },
  { id: ITEM.IRON_SHOVEL, key: 'iron_shovel', name: 'Demir Kürek', isBlock: false, maxStack: 1, toolClass: 'shovel', tier: 3, miningSpeed: 6, attackDamage: 4, maxDurability: 250, sprite: makeSprite(SHOVEL_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.DIAMOND_SHOVEL, key: 'diamond_shovel', name: 'Elmas Kürek', isBlock: false, maxStack: 1, toolClass: 'shovel', tier: 4, miningSpeed: 8, attackDamage: 5, maxDurability: 1561, sprite: makeSprite(SHOVEL_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.NETHERITE_SHOVEL, key: 'netherite_shovel', name: 'Netherit Kürek', isBlock: false, maxStack: 1, toolClass: 'shovel', tier: 5, miningSpeed: 9, attackDamage: 6, maxDurability: 2031, sprite: makeSprite(SHOVEL_ROWS, TIER_PALETTES.netherite) },

  // Hoes (Right-Click Grass/Dirt -> Farmland!)
  { id: ITEM.WOOD_HOE, key: 'wooden_hoe', name: 'Tahta Çapa', isBlock: false, maxStack: 1, toolClass: 'hoe', tier: 1, miningSpeed: 2, attackDamage: 1, maxDurability: 59, sprite: makeSprite(HOE_ROWS, TIER_PALETTES.wood) },
  { id: ITEM.STONE_HOE, key: 'stone_hoe', name: 'Taş Çapa', isBlock: false, maxStack: 1, toolClass: 'hoe', tier: 2, miningSpeed: 4, attackDamage: 1, maxDurability: 131, sprite: makeSprite(HOE_ROWS, TIER_PALETTES.stone) },
  { id: ITEM.IRON_HOE, key: 'iron_hoe', name: 'Demir Çapa', isBlock: false, maxStack: 1, toolClass: 'hoe', tier: 3, miningSpeed: 6, attackDamage: 1, maxDurability: 250, sprite: makeSprite(HOE_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.DIAMOND_HOE, key: 'diamond_hoe', name: 'Elmas Çapa', isBlock: false, maxStack: 1, toolClass: 'hoe', tier: 4, miningSpeed: 8, attackDamage: 1, maxDurability: 1561, sprite: makeSprite(HOE_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.NETHERITE_HOE, key: 'netherite_hoe', name: 'Netherit Çapa', isBlock: false, maxStack: 1, toolClass: 'hoe', tier: 5, miningSpeed: 9, attackDamage: 1, maxDurability: 2031, sprite: makeSprite(HOE_ROWS, TIER_PALETTES.netherite) },

  // Full 4-Piece Armor Sets (Helmet, Chestplate, Leggings, Boots)
  { id: ITEM.IRON_HELMET, key: 'iron_helmet', name: 'Demir Miğfer', isBlock: false, maxStack: 1, armorPoints: 2, armorSlot: 'head', maxDurability: 165, sprite: makeSprite(HELMET_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.IRON_CHESTPLATE, key: 'iron_chestplate', name: 'Demir Göğüslük', isBlock: false, maxStack: 1, armorPoints: 6, armorSlot: 'chest', maxDurability: 240, sprite: makeSprite(CHESTPLATE_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.IRON_LEGGINGS, key: 'iron_leggings', name: 'Demir Pantolon', isBlock: false, maxStack: 1, armorPoints: 5, armorSlot: 'legs', maxDurability: 225, sprite: makeSprite(LEGGINGS_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.IRON_BOOTS, key: 'iron_boots', name: 'Demir Çizme', isBlock: false, maxStack: 1, armorPoints: 2, armorSlot: 'feet', maxDurability: 195, sprite: makeSprite(BOOTS_ROWS, TIER_PALETTES.iron) },

  { id: ITEM.GOLD_HELMET, key: 'golden_helmet', name: 'Altın Miğfer', isBlock: false, maxStack: 1, armorPoints: 2, armorSlot: 'head', maxDurability: 77, sprite: makeSprite(HELMET_ROWS, TIER_PALETTES.gold) },
  { id: ITEM.GOLD_CHESTPLATE, key: 'golden_chestplate', name: 'Altın Göğüslük', isBlock: false, maxStack: 1, armorPoints: 5, armorSlot: 'chest', maxDurability: 112, sprite: makeSprite(CHESTPLATE_ROWS, TIER_PALETTES.gold) },
  { id: ITEM.GOLD_LEGGINGS, key: 'golden_leggings', name: 'Altın Pantolon', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'legs', maxDurability: 105, sprite: makeSprite(LEGGINGS_ROWS, TIER_PALETTES.gold) },
  { id: ITEM.GOLD_BOOTS, key: 'golden_boots', name: 'Altın Çizme', isBlock: false, maxStack: 1, armorPoints: 1, armorSlot: 'feet', maxDurability: 91, sprite: makeSprite(BOOTS_ROWS, TIER_PALETTES.gold) },

  { id: ITEM.DIAMOND_HELMET, key: 'diamond_helmet', name: 'Elmas Miğfer', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'head', maxDurability: 363, sprite: makeSprite(HELMET_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.DIAMOND_CHESTPLATE, key: 'diamond_chestplate', name: 'Elmas Göğüslük', isBlock: false, maxStack: 1, armorPoints: 8, armorSlot: 'chest', maxDurability: 528, sprite: makeSprite(CHESTPLATE_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.DIAMOND_LEGGINGS, key: 'diamond_leggings', name: 'Elmas Pantolon', isBlock: false, maxStack: 1, armorPoints: 6, armorSlot: 'legs', maxDurability: 495, sprite: makeSprite(LEGGINGS_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.DIAMOND_BOOTS, key: 'diamond_boots', name: 'Elmas Çizme', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'feet', maxDurability: 429, sprite: makeSprite(BOOTS_ROWS, TIER_PALETTES.diamond) },

  { id: ITEM.NETHERITE_HELMET, key: 'netherite_helmet', name: 'Netherit Miğfer', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'head', maxDurability: 407, sprite: makeSprite(HELMET_ROWS, TIER_PALETTES.netherite) },
  { id: ITEM.NETHERITE_CHESTPLATE, key: 'netherite_chestplate', name: 'Netherit Göğüslük', isBlock: false, maxStack: 1, armorPoints: 8, armorSlot: 'chest', maxDurability: 592, sprite: makeSprite(CHESTPLATE_ROWS, TIER_PALETTES.netherite) },
  { id: ITEM.NETHERITE_LEGGINGS, key: 'netherite_leggings', name: 'Netherit Pantolon', isBlock: false, maxStack: 1, armorPoints: 6, armorSlot: 'legs', maxDurability: 555, sprite: makeSprite(LEGGINGS_ROWS, TIER_PALETTES.netherite) },
  { id: ITEM.NETHERITE_BOOTS, key: 'netherite_boots', name: 'Netherit Çizme', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'feet', maxDurability: 481, sprite: makeSprite(BOOTS_ROWS, TIER_PALETTES.netherite) },

  // Spawn Eggs (Right-Click Ground to Summon Horizon 26.3 Mobs!)
  { id: ITEM.SPAWN_VILLAGER, key: 'villager_spawn_egg', name: 'Köylü Yumurtası', isBlock: false, maxStack: 64, spawnSpecies: 'villager', sprite: makeSprite(EGG_ROWS, { O: '#3b2416', M: '#7c5236', L: '#22c55e', B: '#5c3d28' }) },
  { id: ITEM.SPAWN_COPPER_GOLEM, key: 'copper_golem_spawn_egg', name: 'Bakır Golem Yumurtası (26.3)', isBlock: false, maxStack: 64, spawnSpecies: 'copper_golem', sprite: makeSprite(EGG_ROWS, { O: '#4a2311', M: '#d97745', L: '#34d399', B: '#9a3412' }) },
  { id: ITEM.SPAWN_HORSE, key: 'horse_spawn_egg', name: 'At Yumurtası (Binilebilir)', isBlock: false, maxStack: 64, spawnSpecies: 'horse', sprite: makeSprite(EGG_ROWS, { O: '#3b2313', M: '#854d27', L: '#eab308', B: '#5c3317' }) },
  { id: ITEM.SPAWN_CAMEL, key: 'camel_spawn_egg', name: 'Deve Yumurtası (Binilebilir)', isBlock: false, maxStack: 64, spawnSpecies: 'camel', sprite: makeSprite(EGG_ROWS, { O: '#5c3c14', M: '#d99b52', L: '#fde047', B: '#a16207' }) },
  { id: ITEM.SPAWN_WOLF, key: 'wolf_spawn_egg', name: 'Kurt Yumurtası', isBlock: false, maxStack: 64, spawnSpecies: 'wolf', sprite: makeSprite(EGG_ROWS, { O: '#4b5563', M: '#d1d5db', L: '#ef4444', B: '#9ca3af' }) },
  { id: ITEM.SPAWN_ZOMBIE, key: 'zombie_spawn_egg', name: 'Zombi Yumurtası', isBlock: false, maxStack: 64, spawnSpecies: 'zombie', sprite: makeSprite(EGG_ROWS, { O: '#1e3a29', M: '#0ea5e9', L: '#4ade80', B: '#0369a1' }) },
  { id: ITEM.SPAWN_CREEPER, key: 'creeper_spawn_egg', name: 'Creeper Yumurtası', isBlock: false, maxStack: 64, spawnSpecies: 'creeper', sprite: makeSprite(EGG_ROWS, { O: '#14532d', M: '#22c55e', L: '#09090b', B: '#15803d' }) },
  { id: ITEM.SPAWN_ENDERMAN, key: 'enderman_spawn_egg', name: 'Enderman Yumurtası', isBlock: false, maxStack: 64, spawnSpecies: 'enderman', sprite: makeSprite(EGG_ROWS, { O: '#09090b', M: '#18181b', L: '#d946ef', B: '#27272a' }) },
  { id: ITEM.SNOWBALL, key: 'snowball', name: 'Kartopu (Fırlatılabilir)', isBlock: false, maxStack: 16, sprite: makeSprite(ORB_ROWS, { O: '#64748b', D: '#cbd5e1', M: '#e2e8f0', L: '#f8fafc', W: '#ffffff' }) },
  // Wave 7: Spyglass, Sweet Berries, Amethyst Shard, Totem of Undying & Mace (26.3)
  { id: ITEM.SPYGLASS, key: 'spyglass', name: 'Dürbün (Sağ Tık Basılı Tut: Yakınlaştır)', isBlock: false, maxStack: 1, sprite: makeSprite(SPYGLASS_ROWS, { O: '#2d1a0e', C: '#c96b44', M: '#f09b75', L: '#fde68a', A: '#a855f7' }) },
  { id: ITEM.SWEET_BERRIES, key: 'sweet_berries', name: 'Tatlı Orman Meyvesi (+2 Açlık / Ekilebilir)', isBlock: false, maxStack: 64, foodRestore: 2, healAmount: 1, sprite: makeSprite(APPLE_ROWS, { O: '#3f0a14', M: '#dc2626', L: '#fb7185', W: '#ffe4e6', G: '#15803d' }) },
  { id: ITEM.AMETHYST_SHARD, key: 'amethyst_shard', name: 'Ametist Parçası', isBlock: false, maxStack: 64, sprite: makeSprite(GEM_ROWS, { O: '#3b0764', M: '#a855f7', L: '#e9d5ff' }) },
  { id: ITEM.TOTEM_OF_UNDYING, key: 'totem_of_undying', name: 'Ölümsüzlük Totemi (Ölümden Kurtarır)', isBlock: false, maxStack: 1, sprite: makeSprite(TOTEM_ROWS, { O: '#422006', G: '#d97706', L: '#fde047', E: '#22c55e' }) },
  { id: ITEM.MACE, key: 'mace', name: 'Gürz (26.3 Yüksekten Ezici Darbe)', isBlock: false, maxStack: 1, tier: 4, attackDamage: 7, maxDurability: 500, sprite: makeSprite(MACE_ROWS, { O: '#334155', D: '#475569', M: '#94a3b8', L: '#e2e8f0', E: '#ffffff', W: '#0284c7', H: '#38bdf8', h: '#bae6fd' }) },
  // Wave 8: Horizon 26.3 Spear (`spear.rs`), Trident (`trident.rs`) & Music Disc (`jukebox.rs`)
  { id: ITEM.IRON_SPEAR, key: 'iron_spear', name: 'Demir Mızrak (26.3 Uzun Menzil & Koşu Hücumu)', isBlock: false, maxStack: 1, tier: 3, attackDamage: 5.5, maxDurability: 250, sprite: makeSprite(SPEAR_ROWS, TIER_PALETTES.iron) },
  { id: ITEM.DIAMOND_SPEAR, key: 'diamond_spear', name: 'Elmas Mızrak (26.3 Uzun Menzil & Binek Hücumu)', isBlock: false, maxStack: 1, tier: 4, attackDamage: 7, maxDurability: 1561, sprite: makeSprite(SPEAR_ROWS, TIER_PALETTES.diamond) },
  { id: ITEM.TRIDENT, key: 'trident', name: 'Üçlü Mızrak (Sağ Tık Fırlat / Sadakat Dönüşü)', isBlock: false, maxStack: 1, tier: 4, attackDamage: 8, maxDurability: 250, sprite: makeSprite(TRIDENT_ROWS, { O: '#155e63', M: '#2dd4bf', L: '#99f6e4', E: '#ffffff', W: '#0f4c5c', H: '#1e7e85', h: '#38bdf8' }) },
  { id: ITEM.MUSIC_DISC, key: 'music_disc_horizon', name: 'Müzik Diski — Horizon 26.3 (Dawn)', isBlock: false, maxStack: 1, sprite: makeSprite(DISC_ROWS, { O: '#09090b', D: '#27272a', G: '#52525b', A: '#6b4bff', C: '#fde047' }) },
  { id: ITEM.WIND_CHARGE, key: 'wind_charge', name: 'Rüzgar Yükü (26.3 Fırlat & Zıpla — Gürz Kombosu!)', isBlock: false, maxStack: 64, sprite: makeSprite(WIND_CHARGE_ROWS, { O: '#0284c7', D: '#38bdf8', L: '#bae6fd', W: '#ffffff' }) },
  // Wave 9: Crossbow, Leather & Leather Armor (`powder_snow_collision.rs`), Powder Snow Bucket
  {
    id: ITEM.CROSSBOW,
    key: 'crossbow',
    name: 'Arbalet (Basılı Tut Doldur, Sağ Tık Ateşle!)',
    isBlock: false,
    maxStack: 1,
    maxDurability: 465,
    sprite: makeSprite([
      '....OOOOOO......',
      '...OMMHHMMO.....',
      '..OMHO..OHMO....',
      '.OMHO....OHMO...',
      '.OHO..SS..OHO...',
      'OHO..SSSS..OHO..',
      'OSSOOHHHHOOSSOO.',
      '.OO..OHHO....OO.',
      '......OHHO......',
      '.......OHHO.....',
      '........OHHO....',
      '.........OHHO...',
      '..........OHHO..',
      '...........OOMO.',
      '............OOO.',
      '................'
    ], { O: '#2b1b0e', H: '#8c6234', M: '#cbd5e1', S: '#e2e8f0' })
  },
  { id: ITEM.LEATHER, key: 'leather', name: 'Deri', isBlock: false, maxStack: 64, sprite: makeSprite(INGOT_ROWS, { O: '#3d2211', M: '#a66238', L: '#cf8352' }) },
  { id: ITEM.LEATHER_HELMET, key: 'leather_helmet', name: 'Deri Başlık', isBlock: false, maxStack: 1, armorPoints: 1, armorSlot: 'head', maxDurability: 55, sprite: makeSprite(HELMET_ROWS, TIER_PALETTES.leather) },
  { id: ITEM.LEATHER_CHESTPLATE, key: 'leather_chestplate', name: 'Deri Tunik', isBlock: false, maxStack: 1, armorPoints: 3, armorSlot: 'chest', maxDurability: 80, sprite: makeSprite(CHESTPLATE_ROWS, TIER_PALETTES.leather) },
  { id: ITEM.LEATHER_LEGGINGS, key: 'leather_leggings', name: 'Deri Pantolon', isBlock: false, maxStack: 1, armorPoints: 2, armorSlot: 'legs', maxDurability: 75, sprite: makeSprite(LEGGINGS_ROWS, TIER_PALETTES.leather) },
  { id: ITEM.LEATHER_BOOTS, key: 'leather_boots', name: 'Deri Çizme (Toz Kar Üstünde Batmadan Yürür!)', isBlock: false, maxStack: 1, armorPoints: 1, armorSlot: 'feet', maxDurability: 65, sprite: makeSprite(BOOTS_ROWS, TIER_PALETTES.leather) },
  { id: ITEM.BUCKET_POWDER_SNOW, key: 'powder_snow_bucket', name: 'Toz Kar Kovası', isBlock: false, maxStack: 1, sprite: makeSprite(BUCKET_ROWS, { O: '#2d3138', M: '#9aa4b2', L: '#d6dde8', F: '#f8fafc' }) },
  // Wave 13: 3D Interactive Armor Stand & Complete Horizon 26.3 Spawn Eggs
  {
    id: ITEM.ARMOR_STAND,
    key: 'armor_stand',
    name: 'Zırh Askısı (Zırh & Silah Sergileme Standı)',
    isBlock: false,
    maxStack: 16,
    sprite: makeSprite([
      '......OOOO......',
      '......OWWO......',
      '......OOOO......',
      '..OOOOOOOOOOOO..',
      '..OWWWWWWWWWWO..',
      '..OOO.OWWO.OOO..',
      '......OWWO......',
      '.....OOWWOO.....',
      '.....OW..WO.....',
      '.....OW..WO.....',
      '.....OW..WO.....',
      '.....OW..WO.....',
      '....OOW..WOO....',
      '..OOSSSSSSSSOO..',
      '..OSSSSSSSSSSO..',
      '..OOOOOOOOOOOO..'
    ], { O: '#2b1b0e', W: '#b8874b', S: '#94a3b8' })
  },
  { id: ITEM.SPAWN_WANDERING_TRADER, key: 'wandering_trader_spawn_egg', name: 'Gezgin Tüccar Yumurtası (NPC)', isBlock: false, maxStack: 64, spawnSpecies: 'wandering_trader', sprite: makeSprite(EGG_ROWS, { O: '#1e3a8a', M: '#2563eb', L: '#facc15', B: '#1d4ed8' }) },
  { id: ITEM.SPAWN_HAPPY_GHAST, key: 'happy_ghast_spawn_egg', name: 'Mutlu Ghast Yumurtası (26.3 Uçan Binek!)', isBlock: false, maxStack: 64, spawnSpecies: 'happy_ghast', sprite: makeSprite(EGG_ROWS, { O: '#475569', M: '#f8fafc', L: '#38bdf8', B: '#cbd5e1' }) },
  { id: ITEM.SPAWN_NAUTILUS, key: 'nautilus_spawn_egg', name: 'Nautilus Yumurtası (26.3 Su Bineği!)', isBlock: false, maxStack: 64, spawnSpecies: 'nautilus', sprite: makeSprite(EGG_ROWS, { O: '#7c2d12', M: '#fb923c', L: '#fef3c7', B: '#ea580c' }) },
  { id: ITEM.SPAWN_BREEZE, key: 'breeze_spawn_egg', name: 'Breeze Yumurtası (Rüzgar Muhafızı)', isBlock: false, maxStack: 64, spawnSpecies: 'breeze', sprite: makeSprite(EGG_ROWS, { O: '#0c4a6e', M: '#38bdf8', L: '#e0f2fe', B: '#0284c7' }) },
  { id: ITEM.SPAWN_WARDEN, key: 'warden_spawn_egg', name: 'Warden Yumurtası (Antik Derinlik Boss)', isBlock: false, maxStack: 64, spawnSpecies: 'warden', sprite: makeSprite(EGG_ROWS, { O: '#042f2e', M: '#0f766e', L: '#5eead4', B: '#134e4a' }) },
  { id: ITEM.SPAWN_CREAKING, key: 'creaking_spawn_egg', name: 'Creaking Yumurtası (Bakınca Donan Heykel)', isBlock: false, maxStack: 64, spawnSpecies: 'creaking', sprite: makeSprite(EGG_ROWS, { O: '#27272a', M: '#52525b', L: '#f97316', B: '#3f3f46' }) },
  { id: ITEM.SPAWN_ALLAY, key: 'allay_spawn_egg', name: 'Allay Yumurtası (Peri Dost)', isBlock: false, maxStack: 64, spawnSpecies: 'allay', sprite: makeSprite(EGG_ROWS, { O: '#0369a1', M: '#38bdf8', L: '#bae6fd', B: '#0284c7' }) },
  { id: ITEM.SPAWN_WITHER, key: 'wither_spawn_egg', name: 'Wither Boss Yumurtası (3 Başlı Boss)', isBlock: false, maxStack: 64, spawnSpecies: 'wither', sprite: makeSprite(EGG_ROWS, { O: '#09090b', M: '#27272a', L: '#a855f7', B: '#18181b' }) },
  // Wave 14: Authentic Original Minecraft Items (Bone Meal, Fishing Rod, Cod, Carrots, Elytra & Firework Rockets!)
  {
    id: ITEM.BONE_MEAL,
    key: 'bone_meal',
    name: 'Kemik Tozu (Sağ Tık Ekin & Çiçek Büyütür)',
    isBlock: false,
    maxStack: 64,
    sprite: makeSprite([
      '................',
      '................',
      '......OOOO......',
      '....OOEEEEOO....',
      '...OEELLEEEEO...',
      '..OEELMMLEEEEO..',
      '..OELLMMMLLLEO..',
      '..OMLLMMMMMLLO..',
      '...OMMMMMMMMO...',
      '....OOOOOOOO....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], { O: '#94a3b8', M: '#cbd5e1', L: '#e2e8f0', E: '#ffffff' })
  },
  {
    id: ITEM.FISHING_ROD,
    key: 'fishing_rod',
    name: 'Olta (Suya Sağ Tık Balık & Hazine Tut!)',
    isBlock: false,
    maxStack: 1,
    maxDurability: 64,
    sprite: makeSprite([
      '............hH..',
      '...........hHWS.',
      '..........hHW.S.',
      '.........hHW..S.',
      '........hHW...S.',
      '.......hHW....S.',
      '......hHW.....S.',
      '.....hHW......S.',
      '....hHW.......RR',
      '...hHW........RE',
      '..hHGG........OO',
      '.hHWGG..........',
      'hHW.............',
      'WW..............',
      '................',
      '................'
    ], { h: '#9a6e36', H: '#6b4e21', W: '#3b2911', G: '#94a3b8', S: '#e2e8f0', R: '#ef4444', E: '#ffffff', O: '#475569' })
  },
  {
    id: ITEM.RAW_COD,
    key: 'cod',
    name: 'Çiğ Morina Balığı (+2 Açlık)',
    isBlock: false,
    maxStack: 64,
    foodRestore: 2,
    sprite: makeSprite([
      '................',
      '................',
      '......OOOOOO....',
      '....OOMLLLLLOO..',
      '...OMLLLLLLLEMO.',
      '..OMLLMMMMLLBMO.',
      '.OOOMMMMMMMMMMO.',
      'OMMOMDDDDDDDDDO.',
      'OMOO.OOOOOOOOO..',
      '.OO.............',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], { O: '#4a3f35', D: '#8c7865', M: '#b59e88', L: '#d6c4b0', E: '#f5ebe0', B: '#1e293b' })
  },
  {
    id: ITEM.COOKED_COD,
    key: 'cooked_cod',
    name: 'Pişmiş Morina Balığı (+6 Açlık)',
    isBlock: false,
    maxStack: 64,
    foodRestore: 6,
    healAmount: 2,
    sprite: makeSprite([
      '................',
      '................',
      '......OOOOOO....',
      '....OOMLLLLLOO..',
      '...OMLLLLLLLEMO.',
      '..OMLLMMMMLLBMO.',
      '.OOOMMMMMMMMMMO.',
      'OMMOMDDDDDDDDDO.',
      'OMOO.OOOOOOOOO..',
      '.OO.............',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], { O: '#4a2912', D: '#8c4f23', M: '#bf7536', L: '#e39e54', E: '#fce3b4', B: '#291709' })
  },
  {
    id: ITEM.CARROT,
    key: 'carrot',
    name: 'Havuç (+3 Açlık)',
    isBlock: false,
    maxStack: 64,
    foodRestore: 3,
    healAmount: 1,
    sprite: makeSprite([
      '...........GG.G.',
      '..........GGGgG.',
      '..........gGGg..',
      '........OOgGO...',
      '.......OELLMO...',
      '......OELLMMO...',
      '.....OELMMMDO...',
      '....OELMMMDO....',
      '...OELMMDO......',
      '..OELMDO........',
      '..OEMDO.........',
      '..OODO..........',
      '..OO............',
      '................',
      '................',
      '................'
    ], { G: '#16a34a', g: '#4ade80', O: '#7c2d12', D: '#c2410c', M: '#ea580c', L: '#fb923c', E: '#fdba74' })
  },
  {
    id: ITEM.GOLDEN_CARROT,
    key: 'golden_carrot',
    name: 'Altın Havuç (+6 Açlık & Yüksek Doygunluk)',
    isBlock: false,
    maxStack: 64,
    foodRestore: 6,
    healAmount: 4,
    sprite: makeSprite([
      '...........GG.G.',
      '..........GGGgG.',
      '..........gGGg..',
      '........OOgGO...',
      '.......OELLMO...',
      '......OELLMMO...',
      '.....OELMMMDO...',
      '....OELMMMDO....',
      '...OELMMDO......',
      '..OELMDO........',
      '..OEMDO.........',
      '..OODO..........',
      '..OO............',
      '................',
      '................',
      '................'
    ], { G: '#22c55e', g: '#86efac', O: '#78350f', D: '#b45309', M: '#eab308', L: '#fde047', E: '#fef9c3' })
  },
  {
    id: ITEM.ELYTRA,
    key: 'elytra',
    name: 'Elitra Kanatları (Göğüslük · Havada Space ile Süzül!)',
    isBlock: false,
    maxStack: 1,
    armorPoints: 2,
    armorSlot: 'chest',
    maxDurability: 432,
    sprite: makeSprite([
      '................',
      '....OOO..OOO....',
      '...OGGGOOGGGO...',
      '..OMLLLMMLLLMO..',
      '.OMLLMMOOMMLLMO.',
      '.OMLMMO..OMMLMO.',
      'OMLLMO....OMLLMO',
      'OMLMO......OMLMO',
      'OMMMO......OMMMO',
      'OMDMO......OMDMO',
      '.ODDO......ODDO.',
      '..OO........OO..',
      '................',
      '................',
      '................',
      '................'
    ], { O: '#2d2b38', D: '#565268', M: '#7c7794', L: '#a8a2c2', G: '#eab308' })
  },
  {
    id: ITEM.FIREWORK_ROCKET,
    key: 'firework_rocket',
    name: 'Havai Fişek Roketi (Elitra İtişi & Gökyüzü Şöleni!)',
    isBlock: false,
    maxStack: 64,
    sprite: makeSprite([
      '.......OO.......',
      '......ORRO......',
      '.....ORRRRO.....',
      '....ORRRRRRO....',
      '....OOOOOOOO....',
      '.....OEEEEO.....',
      '.....OERRRO.....',
      '.....OREEEO.....',
      '.....OERRRO.....',
      '.....OEEEEO.....',
      '.....OOOOOO.....',
      '......hHW.......',
      '......hHW.......',
      '......hHW.......',
      '.......W........',
      '................'
    ], { O: '#3f3f46', R: '#dc2626', E: '#f8fafc', h: '#9a6e36', H: '#6b4e21', W: '#3b2911' })
  }
];

const ITEM_MAP = new Map<number, ItemDef>();
for (const b of BLOCKS) {
  if (!b || b.id === 0) continue;
  ITEM_MAP.set(b.id, {
    id: b.id,
    key: b.key,
    name: b.name,
    isBlock: true,
    maxStack: 64
  });
}
for (const it of EXTRA_ITEMS) {
  ITEM_MAP.set(it.id, it);
}

export const ALL_CREATIVE_ITEMS: ItemDef[] = [
  ...EXTRA_ITEMS,
  ...BLOCKS.filter((b) => b && b.inCreative).map((b) => ITEM_MAP.get(b.id)!)
];

export function getItemDef(id: number): ItemDef {
  if (id === ANY_PLANKS) return { id: ANY_PLANKS, key: 'planks', name: 'Tahta Kalas (Her Tür)', isBlock: true, maxStack: 64 };
  return ITEM_MAP.get(id) || { id: 0, key: 'air', name: 'Boş', isBlock: false, maxStack: 64 };
}

// Starter Survival Loadout (Matches Horizon's `survival.webp` & `multiplayer.webp`!)
export function createStarterHotbar(): Array<ItemStack | null> {
  return [
    { id: ITEM.STONE_SWORD, count: 1 },
    { id: ITEM.IRON_PICKAXE, count: 1 },
    { id: ITEM.IRON_AXE, count: 1 },
    { id: ITEM.COOKED_STEAK, count: 16 },
    { id: BLOCK.OAK_PLANKS, count: 48 },
    { id: BLOCK.COBBLESTONE, count: 64 },
    { id: BLOCK.TORCH, count: 32 },
    { id: ITEM.BOW, count: 1 },
    { id: ITEM.ARROW, count: 24 }
  ];
}

// Recipe Book Definitions (1-Click Craftable in 2x2 Inventory or 3x3 Crafting Table!)
export interface CraftRecipe {
  id: string;
  out: ItemStack;
  needsTable: boolean; // false = 2x2 inventory OK, true = 3x3 Crafting Table
  cost: Array<{ id: number; count: number }>;
}

export const RECIPES: CraftRecipe[] = [
  { id: 'oak_planks', out: { id: BLOCK.OAK_PLANKS, count: 4 }, needsTable: false, cost: [{ id: BLOCK.OAK_LOG, count: 1 }] },
  { id: 'cherry_planks', out: { id: BLOCK.CHERRY_PLANKS, count: 4 }, needsTable: false, cost: [{ id: BLOCK.CHERRY_LOG, count: 1 }] },
  { id: 'birch_planks', out: { id: BLOCK.BIRCH_PLANKS, count: 4 }, needsTable: false, cost: [{ id: BLOCK.BIRCH_LOG, count: 1 }] },
  { id: 'spruce_planks', out: { id: BLOCK.SPRUCE_PLANKS, count: 4 }, needsTable: false, cost: [{ id: BLOCK.SPRUCE_LOG, count: 1 }] },
  { id: 'acacia_planks', out: { id: BLOCK.ACACIA_PLANKS, count: 4 }, needsTable: false, cost: [{ id: BLOCK.ACACIA_LOG, count: 1 }] },
  { id: 'sticks', out: { id: ITEM.STICK, count: 4 }, needsTable: false, cost: [{ id: ANY_PLANKS, count: 2 }] },
  { id: 'crafting_table', out: { id: BLOCK.CRAFTING_TABLE, count: 1 }, needsTable: false, cost: [{ id: ANY_PLANKS, count: 4 }] },
  { id: 'torch', out: { id: BLOCK.TORCH, count: 4 }, needsTable: false, cost: [{ id: ITEM.COAL, count: 1 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'furnace', out: { id: BLOCK.FURNACE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 8 }] },
  { id: 'chest', out: { id: BLOCK.CHEST, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 8 }] },
  { id: 'oak_door', out: { id: BLOCK.OAK_DOOR_CLOSED, count: 3 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }] },
  { id: 'ladder', out: { id: BLOCK.LADDER, count: 3 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 7 }] },
  { id: 'bed', out: { id: BLOCK.BED_BLOCK, count: 1 }, needsTable: true, cost: [{ id: BLOCK.WOOL_WHITE, count: 3 }, { id: ANY_PLANKS, count: 3 }] },
  { id: 'bread', out: { id: ITEM.BREAD, count: 1 }, needsTable: true, cost: [{ id: ITEM.WHEAT_ITEM, count: 3 }] },
  { id: 'golden_apple', out: { id: ITEM.GOLDEN_APPLE, count: 1 }, needsTable: true, cost: [{ id: ITEM.APPLE, count: 1 }, { id: ITEM.GOLD_INGOT, count: 8 }] },
  { id: 'bucket', out: { id: ITEM.BUCKET_EMPTY, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 3 }] },
  { id: 'flint_from_gravel', out: { id: ITEM.FLINT, count: 1 }, needsTable: false, cost: [{ id: BLOCK.GRAVEL, count: 1 }] },
  { id: 'flint_steel', out: { id: ITEM.FLINT_AND_STEEL, count: 1 }, needsTable: false, cost: [{ id: ITEM.IRON_INGOT, count: 1 }, { id: ITEM.FLINT, count: 1 }] },
  { id: 'shears', out: { id: ITEM.SHEARS, count: 1 }, needsTable: false, cost: [{ id: ITEM.IRON_INGOT, count: 2 }] },
  { id: 'shield', out: { id: ITEM.SHIELD, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }, { id: ITEM.IRON_INGOT, count: 1 }] },
  { id: 'bow', out: { id: ITEM.BOW, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 3 }, { id: ITEM.STRING, count: 3 }] },
  { id: 'arrows', out: { id: ITEM.ARROW, count: 4 }, needsTable: true, cost: [{ id: ITEM.FLINT, count: 1 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'tnt', out: { id: BLOCK.TNT, count: 1 }, needsTable: true, cost: [{ id: ITEM.GUNPOWDER, count: 4 }, { id: BLOCK.SAND, count: 4 }] },
  { id: 'boat', out: { id: ITEM.BOAT_ITEM, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 5 }] },
  { id: 'lever', out: { id: BLOCK.LEVER_OFF, count: 1 }, needsTable: false, cost: [{ id: ITEM.STICK, count: 1 }, { id: BLOCK.COBBLESTONE, count: 1 }] },
  { id: 'redstone_lamp', out: { id: BLOCK.REDSTONE_LAMP_OFF, count: 1 }, needsTable: true, cost: [{ id: BLOCK.GLOWSTONE, count: 1 }, { id: BLOCK.REDSTONE_DUST_OFF, count: 4 }] },
  { id: 'piston', out: { id: BLOCK.PISTON, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 3 }, { id: BLOCK.COBBLESTONE, count: 4 }, { id: ITEM.IRON_INGOT, count: 1 }, { id: BLOCK.REDSTONE_DUST_OFF, count: 1 }] },
  // Slabs, Stairs, Fence, Lantern, Composter & Copper Block
  { id: 'spruce_slab', out: { id: BLOCK.SPRUCE_SLAB, count: 6 }, needsTable: true, cost: [{ id: BLOCK.SPRUCE_PLANKS, count: 3 }] },
  { id: 'oak_slab', out: { id: BLOCK.OAK_SLAB, count: 6 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 3 }] },
  { id: 'cobble_slab', out: { id: BLOCK.COBBLESTONE_SLAB, count: 6 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 3 }] },
  { id: 'stone_brick_slab', out: { id: BLOCK.STONE_BRICK_SLAB, count: 6 }, needsTable: true, cost: [{ id: BLOCK.STONE_BRICKS, count: 3 }] },
  { id: 'oak_stairs', out: { id: BLOCK.OAK_STAIRS_N, count: 4 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }] },
  { id: 'cobble_stairs', out: { id: BLOCK.COBBLESTONE_STAIRS_N, count: 4 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 6 }] },
  { id: 'oak_fence', out: { id: BLOCK.OAK_FENCE, count: 3 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 4 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'lantern', out: { id: BLOCK.LANTERN, count: 1 }, needsTable: true, cost: [{ id: BLOCK.TORCH, count: 1 }, { id: ITEM.IRON_INGOT, count: 1 }] },
  { id: 'composter', out: { id: BLOCK.COMPOSTER, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 7 }] },
  { id: 'copper_block', out: { id: BLOCK.COPPER_BLOCK, count: 1 }, needsTable: true, cost: [{ id: ITEM.COPPER_INGOT, count: 9 }] },
  // Tool Recipes
  { id: 'wood_pick', out: { id: ITEM.WOOD_PICKAXE, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'wood_sword', out: { id: ITEM.WOOD_SWORD, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 2 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'wood_axe', out: { id: ITEM.WOOD_AXE, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'wood_shovel', out: { id: ITEM.WOOD_SHOVEL, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'wood_hoe', out: { id: ITEM.WOOD_HOE, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 2 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'stone_pick', out: { id: ITEM.STONE_PICKAXE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'stone_sword', out: { id: ITEM.STONE_SWORD, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 2 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'stone_axe', out: { id: ITEM.STONE_AXE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'stone_shovel', out: { id: ITEM.STONE_SHOVEL, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'stone_hoe', out: { id: ITEM.STONE_HOE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.COBBLESTONE, count: 2 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'iron_pick', out: { id: ITEM.IRON_PICKAXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'iron_sword', out: { id: ITEM.IRON_SWORD, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 2 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'iron_axe', out: { id: ITEM.IRON_AXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'iron_shovel', out: { id: ITEM.IRON_SHOVEL, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'iron_hoe', out: { id: ITEM.IRON_HOE, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 2 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'diamond_pick', out: { id: ITEM.DIAMOND_PICKAXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'diamond_sword', out: { id: ITEM.DIAMOND_SWORD, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 2 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'diamond_axe', out: { id: ITEM.DIAMOND_AXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 3 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'diamond_shovel', out: { id: ITEM.DIAMOND_SHOVEL, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'diamond_hoe', out: { id: ITEM.DIAMOND_HOE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 2 }, { id: ITEM.STICK, count: 2 }] },
  // 4-Slot Armor Recipes (Iron, Gold, Diamond)
  { id: 'iron_helmet', out: { id: ITEM.IRON_HELMET, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 5 }] },
  { id: 'iron_chest', out: { id: ITEM.IRON_CHESTPLATE, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 8 }] },
  { id: 'iron_legs', out: { id: ITEM.IRON_LEGGINGS, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 7 }] },
  { id: 'iron_boots', out: { id: ITEM.IRON_BOOTS, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 4 }] },
  { id: 'gold_helmet', out: { id: ITEM.GOLD_HELMET, count: 1 }, needsTable: true, cost: [{ id: ITEM.GOLD_INGOT, count: 5 }] },
  { id: 'gold_chest', out: { id: ITEM.GOLD_CHESTPLATE, count: 1 }, needsTable: true, cost: [{ id: ITEM.GOLD_INGOT, count: 8 }] },
  { id: 'gold_legs', out: { id: ITEM.GOLD_LEGGINGS, count: 1 }, needsTable: true, cost: [{ id: ITEM.GOLD_INGOT, count: 7 }] },
  { id: 'gold_boots', out: { id: ITEM.GOLD_BOOTS, count: 1 }, needsTable: true, cost: [{ id: ITEM.GOLD_INGOT, count: 4 }] },
  { id: 'diamond_helmet', out: { id: ITEM.DIAMOND_HELMET, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 5 }] },
  { id: 'diamond_chest', out: { id: ITEM.DIAMOND_CHESTPLATE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 8 }] },
  { id: 'diamond_legs', out: { id: ITEM.DIAMOND_LEGGINGS, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 7 }] },
  { id: 'diamond_boots', out: { id: ITEM.DIAMOND_BOOTS, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 4 }] },
  // Netherite Smelting / Forging & Diamond -> Netherite Upgrades
  { id: 'netherite_ingot', out: { id: ITEM.NETHERITE_INGOT, count: 1 }, needsTable: true, cost: [{ id: ITEM.NETHERITE_SCRAP, count: 4 }, { id: ITEM.GOLD_INGOT, count: 4 }] },
  { id: 'netherite_block', out: { id: BLOCK.NETHERITE_BLOCK, count: 1 }, needsTable: true, cost: [{ id: ITEM.NETHERITE_INGOT, count: 9 }] },
  { id: 'netherite_sword', out: { id: ITEM.NETHERITE_SWORD, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_SWORD, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_pick', out: { id: ITEM.NETHERITE_PICKAXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_PICKAXE, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_axe', out: { id: ITEM.NETHERITE_AXE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_AXE, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_shovel', out: { id: ITEM.NETHERITE_SHOVEL, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_SHOVEL, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_hoe', out: { id: ITEM.NETHERITE_HOE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_HOE, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_helmet', out: { id: ITEM.NETHERITE_HELMET, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_HELMET, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_chest', out: { id: ITEM.NETHERITE_CHESTPLATE, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_CHESTPLATE, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_legs', out: { id: ITEM.NETHERITE_LEGGINGS, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_LEGGINGS, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  { id: 'netherite_boots', out: { id: ITEM.NETHERITE_BOOTS, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND_BOOTS, count: 1 }, { id: ITEM.NETHERITE_INGOT, count: 1 }] },
  // Wave 6: Pumpkins, Snow Block, Trapdoors & Connecting Panes
  { id: 'snow_block', out: { id: BLOCK.SNOW_BLOCK, count: 1 }, needsTable: false, cost: [{ id: ITEM.SNOWBALL, count: 4 }] },
  { id: 'carved_pumpkin', out: { id: BLOCK.CARVED_PUMPKIN, count: 1 }, needsTable: false, cost: [{ id: BLOCK.PUMPKIN, count: 1 }] },
  { id: 'jack_o_lantern', out: { id: BLOCK.JACK_O_LANTERN, count: 1 }, needsTable: false, cost: [{ id: BLOCK.CARVED_PUMPKIN, count: 1 }, { id: BLOCK.TORCH, count: 1 }] },
  { id: 'oak_trapdoor', out: { id: BLOCK.OAK_TRAPDOOR_CLOSED, count: 2 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }] },
  { id: 'glass_pane', out: { id: BLOCK.GLASS_PANE, count: 16 }, needsTable: true, cost: [{ id: BLOCK.GLASS, count: 6 }] },
  { id: 'iron_bars', out: { id: BLOCK.IRON_BARS, count: 16 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 6 }] },
  // Wave 7: Barrel, Campfire, Anvil, Enchanting Table, Bookshelf, Spyglass, Amethyst & Mace (26.3)
  { id: 'barrel', out: { id: BLOCK.BARREL, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }, { id: BLOCK.OAK_SLAB, count: 2 }] },
  { id: 'campfire', out: { id: BLOCK.CAMPFIRE, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 3 }, { id: ITEM.COAL, count: 1 }, { id: BLOCK.OAK_LOG, count: 3 }] },
  { id: 'bookshelf', out: { id: BLOCK.BOOKSHELF, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 6 }, { id: ITEM.WHEAT_ITEM, count: 3 }] },
  { id: 'anvil', out: { id: BLOCK.ANVIL, count: 1 }, needsTable: true, cost: [{ id: BLOCK.IRON_BLOCK, count: 3 }, { id: ITEM.IRON_INGOT, count: 4 }] },
  { id: 'enchanting_table', out: { id: BLOCK.ENCHANTING_TABLE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.OBSIDIAN, count: 4 }, { id: ITEM.DIAMOND, count: 2 }] },
  { id: 'amethyst_block', out: { id: BLOCK.AMETHYST_BLOCK, count: 1 }, needsTable: false, cost: [{ id: ITEM.AMETHYST_SHARD, count: 4 }] },
  { id: 'spyglass', out: { id: ITEM.SPYGLASS, count: 1 }, needsTable: true, cost: [{ id: ITEM.COPPER_INGOT, count: 2 }, { id: ITEM.AMETHYST_SHARD, count: 1 }] },
  { id: 'mace_26_3', out: { id: ITEM.MACE, count: 1 }, needsTable: true, cost: [{ id: BLOCK.IRON_BLOCK, count: 1 }, { id: ITEM.DIAMOND, count: 2 }, { id: ITEM.STICK, count: 1 }] },
  // Wave 8: Cauldron, Jukebox, 26.3 Spears & Trident
  { id: 'cauldron', out: { id: BLOCK.CAULDRON_EMPTY, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 7 }] },
  { id: 'jukebox', out: { id: BLOCK.JUKEBOX, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 8 }, { id: ITEM.DIAMOND, count: 1 }] },
  { id: 'iron_spear_26_3', out: { id: ITEM.IRON_SPEAR, count: 1 }, needsTable: true, cost: [{ id: ITEM.IRON_INGOT, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'diamond_spear_26_3', out: { id: ITEM.DIAMOND_SPEAR, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 1 }, { id: ITEM.STICK, count: 2 }] },
  { id: 'trident', out: { id: ITEM.TRIDENT, count: 1 }, needsTable: true, cost: [{ id: ITEM.DIAMOND, count: 2 }, { id: BLOCK.SEA_LANTERN, count: 1 }, { id: ITEM.IRON_INGOT, count: 2 }] },
  { id: 'music_disc', out: { id: ITEM.MUSIC_DISC, count: 1 }, needsTable: true, cost: [{ id: ITEM.COAL, count: 4 }, { id: ITEM.AMETHYST_SHARD, count: 1 }] },
  { id: 'wind_charge_26_3', out: { id: ITEM.WIND_CHARGE, count: 4 }, needsTable: false, cost: [{ id: ITEM.GUNPOWDER, count: 1 }, { id: ITEM.AMETHYST_SHARD, count: 1 }] },
  // Wave 9: Crossbow, Leather Armor, Crying Obsidian, Respawn Anchor, Note Block & Cake
  { id: 'crossbow', out: { id: ITEM.CROSSBOW, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 3 }, { id: ITEM.IRON_INGOT, count: 1 }, { id: ITEM.STRING, count: 2 }] },
  { id: 'leather_helmet', out: { id: ITEM.LEATHER_HELMET, count: 1 }, needsTable: true, cost: [{ id: ITEM.LEATHER, count: 5 }] },
  { id: 'leather_chest', out: { id: ITEM.LEATHER_CHESTPLATE, count: 1 }, needsTable: true, cost: [{ id: ITEM.LEATHER, count: 8 }] },
  { id: 'leather_legs', out: { id: ITEM.LEATHER_LEGGINGS, count: 1 }, needsTable: true, cost: [{ id: ITEM.LEATHER, count: 7 }] },
  { id: 'leather_boots', out: { id: ITEM.LEATHER_BOOTS, count: 1 }, needsTable: true, cost: [{ id: ITEM.LEATHER, count: 4 }] },
  { id: 'crying_obsidian', out: { id: BLOCK.CRYING_OBSIDIAN, count: 1 }, needsTable: false, cost: [{ id: BLOCK.OBSIDIAN, count: 1 }, { id: ITEM.AMETHYST_SHARD, count: 1 }] },
  { id: 'respawn_anchor', out: { id: BLOCK.RESPAWN_ANCHOR_0, count: 1 }, needsTable: true, cost: [{ id: BLOCK.CRYING_OBSIDIAN, count: 6 }, { id: BLOCK.GLOWSTONE, count: 3 }] },
  { id: 'note_block', out: { id: BLOCK.NOTE_BLOCK, count: 1 }, needsTable: true, cost: [{ id: ANY_PLANKS, count: 8 }, { id: BLOCK.REDSTONE_DUST_OFF, count: 1 }] },
  { id: 'cake', out: { id: BLOCK.CAKE, count: 1 }, needsTable: true, cost: [{ id: ITEM.WHEAT_ITEM, count: 3 }, { id: ITEM.SWEET_BERRIES, count: 2 }] },
  // Wave 10: Dripstone, Pointed Dripstone, Copper Bulb (T-Flip-Flop), Target Block & Flower Pot
  { id: 'dripstone_block', out: { id: BLOCK.DRIPSTONE_BLOCK, count: 1 }, needsTable: false, cost: [{ id: BLOCK.POINTED_DRIPSTONE, count: 4 }] },
  { id: 'pointed_dripstone', out: { id: BLOCK.POINTED_DRIPSTONE, count: 2 }, needsTable: false, cost: [{ id: BLOCK.DRIPSTONE_BLOCK, count: 1 }] },
  { id: 'dripstone_craft', out: { id: BLOCK.DRIPSTONE_BLOCK, count: 2 }, needsTable: false, cost: [{ id: BLOCK.COBBLESTONE, count: 2 }, { id: BLOCK.GRAVEL, count: 2 }] },
  { id: 'copper_bulb_26_3', out: { id: BLOCK.COPPER_BULB_OFF, count: 4 }, needsTable: true, cost: [{ id: BLOCK.COPPER_BLOCK, count: 3 }, { id: BLOCK.GLOWSTONE, count: 1 }, { id: BLOCK.REDSTONE_DUST_OFF, count: 1 }] },
  { id: 'target_block', out: { id: BLOCK.TARGET_BLOCK, count: 1 }, needsTable: true, cost: [{ id: BLOCK.HAY_BALE, count: 1 }, { id: BLOCK.REDSTONE_DUST_OFF, count: 4 }] },
  { id: 'flower_pot', out: { id: BLOCK.FLOWER_POT, count: 1 }, needsTable: true, cost: [{ id: BLOCK.BRICKS, count: 3 }] },
  { id: 'flower_pot_terra', out: { id: BLOCK.FLOWER_POT, count: 1 }, needsTable: true, cost: [{ id: BLOCK.TERRACOTTA, count: 3 }] },
  // Wave 13: 3D Armor Stand (`armor_stands.rs`)
  { id: 'armor_stand', out: { id: ITEM.ARMOR_STAND, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 6 }, { id: BLOCK.COBBLESTONE_SLAB, count: 1 }] },
  { id: 'armor_stand_stone_brick', out: { id: ITEM.ARMOR_STAND, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 6 }, { id: BLOCK.STONE_BRICK_SLAB, count: 1 }] },
  // Wave 14: Bone Meal, Fishing Rod, Golden Carrot, Firework Rockets & Elytra
  { id: 'bone_meal', out: { id: ITEM.BONE_MEAL, count: 3 }, needsTable: false, cost: [{ id: ITEM.BONE, count: 1 }] },
  { id: 'fishing_rod', out: { id: ITEM.FISHING_ROD, count: 1 }, needsTable: true, cost: [{ id: ITEM.STICK, count: 3 }, { id: ITEM.STRING, count: 2 }] },
  { id: 'golden_carrot', out: { id: ITEM.GOLDEN_CARROT, count: 1 }, needsTable: true, cost: [{ id: ITEM.CARROT, count: 1 }, { id: ITEM.GOLD_INGOT, count: 2 }] },
  { id: 'firework_rocket', out: { id: ITEM.FIREWORK_ROCKET, count: 4 }, needsTable: false, cost: [{ id: ITEM.GUNPOWDER, count: 1 }, { id: ITEM.STICK, count: 1 }] },
  { id: 'elytra_craft', out: { id: ITEM.ELYTRA, count: 1 }, needsTable: true, cost: [{ id: ITEM.LEATHER, count: 4 }, { id: ITEM.ENDER_PEARL, count: 2 }, { id: ITEM.DIAMOND, count: 1 }] }
];

export const SMELT_RECIPES: Array<{ input: number; output: ItemStack; name: string }> = [
  { input: ITEM.RAW_IRON, output: { id: ITEM.IRON_INGOT, count: 1 }, name: 'Ham Demir → Demir Külçesi' },
  { input: BLOCK.IRON_ORE, output: { id: ITEM.IRON_INGOT, count: 1 }, name: 'Demir Cevheri → Demir Külçesi' },
  { input: ITEM.RAW_GOLD, output: { id: ITEM.GOLD_INGOT, count: 1 }, name: 'Ham Altın → Altın Külçesi' },
  { input: BLOCK.GOLD_ORE, output: { id: ITEM.GOLD_INGOT, count: 1 }, name: 'Altın Cevheri → Altın Külçesi' },
  { input: BLOCK.ANCIENT_DEBRIS, output: { id: ITEM.NETHERITE_SCRAP, count: 1 }, name: 'Antik Kalıntı → Netherit Hurdası' },
  { input: BLOCK.WET_SPONGE, output: { id: BLOCK.SPONGE, count: 1 }, name: 'Islak Sünger → Kuru Sünger' },
  { input: BLOCK.SAND, output: { id: BLOCK.GLASS, count: 1 }, name: 'Kum → Cam' },
  { input: BLOCK.COBBLESTONE, output: { id: BLOCK.STONE, count: 1 }, name: 'Kırık Taş → Düz Taş' },
  { input: ITEM.RAW_BEEF, output: { id: ITEM.COOKED_STEAK, count: 1 }, name: 'Çiğ Biftek → Pişmiş Biftek' },
  { input: ITEM.RAW_COD, output: { id: ITEM.COOKED_COD, count: 1 }, name: 'Çiğ Morina → Pişmiş Morina Balığı' }
];

export interface VillagerTrade {
  id: string;
  cost: { id: number; count: number };
  out: ItemStack;
}

export const VILLAGER_TRADES: VillagerTrade[] = [
  { id: 'wheat_emerald', cost: { id: ITEM.WHEAT_ITEM, count: 12 }, out: { id: ITEM.EMERALD, count: 2 } },
  { id: 'coal_emerald', cost: { id: ITEM.COAL, count: 8 }, out: { id: ITEM.EMERALD, count: 1 } },
  { id: 'cobble_emerald', cost: { id: BLOCK.COBBLESTONE, count: 24 }, out: { id: ITEM.EMERALD, count: 1 } },
  { id: 'emerald_steak', cost: { id: ITEM.EMERALD, count: 1 }, out: { id: ITEM.COOKED_STEAK, count: 6 } },
  { id: 'emerald_carrots', cost: { id: ITEM.EMERALD, count: 1 }, out: { id: ITEM.CARROT, count: 8 } },
  { id: 'emerald_gcarrot', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.GOLDEN_CARROT, count: 4 } },
  { id: 'emerald_fishing_rod', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.FISHING_ROD, count: 1 } },
  { id: 'emerald_fireworks', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.FIREWORK_ROCKET, count: 16 } },
  { id: 'emerald_elytra', cost: { id: ITEM.EMERALD, count: 10 }, out: { id: ITEM.ELYTRA, count: 1 } },
  { id: 'emerald_arrows', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.ARROW, count: 16 } },
  { id: 'emerald_gapple', cost: { id: ITEM.EMERALD, count: 3 }, out: { id: ITEM.GOLDEN_APPLE, count: 2 } },
  { id: 'emerald_pearl', cost: { id: ITEM.EMERALD, count: 4 }, out: { id: ITEM.ENDER_PEARL, count: 4 } },
  { id: 'emerald_dpick', cost: { id: ITEM.EMERALD, count: 5 }, out: { id: ITEM.DIAMOND_PICKAXE, count: 1 } },
  { id: 'emerald_dsword', cost: { id: ITEM.EMERALD, count: 6 }, out: { id: ITEM.DIAMOND_SWORD, count: 1 } },
  { id: 'emerald_dchest', cost: { id: ITEM.EMERALD, count: 7 }, out: { id: ITEM.DIAMOND_CHESTPLATE, count: 1 } },
  { id: 'emerald_spyglass', cost: { id: ITEM.EMERALD, count: 3 }, out: { id: ITEM.SPYGLASS, count: 1 } },
  { id: 'emerald_totem', cost: { id: ITEM.EMERALD, count: 12 }, out: { id: ITEM.TOTEM_OF_UNDYING, count: 1 } },
  { id: 'emerald_trident', cost: { id: ITEM.EMERALD, count: 9 }, out: { id: ITEM.TRIDENT, count: 1 } },
  { id: 'emerald_disc', cost: { id: ITEM.EMERALD, count: 4 }, out: { id: ITEM.MUSIC_DISC, count: 1 } },
  { id: 'emerald_wind_charge', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.WIND_CHARGE, count: 8 } },
  { id: 'emerald_crossbow', cost: { id: ITEM.EMERALD, count: 4 }, out: { id: ITEM.CROSSBOW, count: 1 } },
  { id: 'emerald_cake', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: BLOCK.CAKE, count: 1 } },
  { id: 'emerald_armor_stand', cost: { id: ITEM.EMERALD, count: 2 }, out: { id: ITEM.ARMOR_STAND, count: 2 } },
  { id: 'emerald_happy_ghast', cost: { id: ITEM.EMERALD, count: 8 }, out: { id: ITEM.SPAWN_HAPPY_GHAST, count: 1 } },
  { id: 'emerald_mace', cost: { id: ITEM.EMERALD, count: 10 }, out: { id: ITEM.MACE, count: 1 } }
];

// Exact Horizon mining.rs & Vanilla 26.3 break duration (seconds)
export function computeBreakDuration(blockId: number, heldId: number, onGround: boolean, inWater: boolean, enchTier = 0): number {
  const b = getBlock(blockId);
  if (!Number.isFinite(b.hardness)) return Infinity;
  if (b.hardness <= 0.05) return 0.01;

  const item = getItemDef(heldId);
  let speed = 1.0;
  let canHarvest = !b.minTier || b.minTier <= 0;

  if (b.preferredTool !== 'none' && item.toolClass === b.preferredTool) {
    speed = (item.miningSpeed || 2.0) + (enchTier > 0 ? enchTier * enchTier + 1 : 0);
    if ((item.tier || 0) >= (b.minTier || 0)) {
      canHarvest = true;
    }
  } else if (b.preferredTool === 'none') {
    canHarvest = true;
  }

  if (!onGround) speed *= 0.2;
  if (inWater) speed *= 0.2;

  // Vanilla 26.3: ticks = hardness * (canHarvest ? 30 : 100) / speed; seconds = ticks / 20
  const divisor = canHarvest ? 1.5 : 5.0;
  return Math.max(0.05, (b.hardness * divisor) / speed);
}

// Resolve drop when mining a block in Survival (enforces Horizon mining.rs harvest tool & tier gate!)
export function resolveBlockDrop(blockId: number, heldId = 0): ItemStack | null {
  const b = getBlock(blockId);
  const item = getItemDef(heldId);

  // Shears harvest leaves & tall grass intact!
  if (
    heldId === ITEM.SHEARS &&
    (blockId === BLOCK.OAK_LEAVES ||
      blockId === BLOCK.BIRCH_LEAVES ||
      blockId === BLOCK.SPRUCE_LEAVES ||
      blockId === BLOCK.CHERRY_LEAVES ||
      blockId === BLOCK.ACACIA_LEAVES ||
      blockId === BLOCK.TALL_GRASS)
  ) {
    return { id: blockId, count: 1 };
  }

  // Enforce required harvest tool & minimum tier (e.g. Stone/Coal=1, Iron=2, Diamond/Gold/Redstone=3, Obsidian=4)
  if (b.minTier && b.minTier > 0) {
    if (item.toolClass !== b.preferredTool || (item.tier || 0) < b.minTier) {
      return null;
    }
  }

  if (b.dropCount === 0) {
    if ((blockId === BLOCK.OAK_LEAVES || blockId === BLOCK.CHERRY_LEAVES) && Math.random() < 0.16) {
      return { id: ITEM.APPLE, count: 1 };
    }
    return null;
  }

  if (blockId === BLOCK.COAL_ORE) return { id: ITEM.COAL, count: 1 };
  if (blockId === BLOCK.IRON_ORE) return { id: ITEM.RAW_IRON, count: 1 };
  if (blockId === BLOCK.GOLD_ORE) return { id: ITEM.RAW_GOLD, count: 1 };
  if (blockId === BLOCK.DIAMOND_ORE || blockId === BLOCK.DEEPSLATE_DIAMOND_ORE) return { id: ITEM.DIAMOND, count: 1 };
  if (blockId === BLOCK.EMERALD_ORE) return { id: ITEM.EMERALD, count: 1 };
  if (blockId === BLOCK.REDSTONE_ORE) return { id: BLOCK.REDSTONE_DUST_OFF, count: 3 };
  if (blockId === BLOCK.GRAVEL && Math.random() < 0.25) return { id: ITEM.FLINT, count: 1 };
  if (blockId === BLOCK.SNOW_BLOCK && item.toolClass === 'shovel') return { id: ITEM.SNOWBALL, count: 4 };
  if (blockId === BLOCK.AMETHYST_CLUSTER) return { id: ITEM.AMETHYST_SHARD, count: item.toolClass === 'pickaxe' ? 4 : 2 };
  if (blockId === BLOCK.SWEET_BERRY_BUSH) return { id: ITEM.SWEET_BERRIES, count: 2 };
  if (blockId === BLOCK.OAK_LEAVES && Math.random() < 0.16) return { id: ITEM.APPLE, count: 1 };
  if (blockId === BLOCK.WHEAT_CROP) return { id: ITEM.WHEAT_ITEM, count: 2 };
  const id = b.dropId ?? blockId;
  return id > 0 ? { id, count: b.dropCount ?? 1 } : null;
}
