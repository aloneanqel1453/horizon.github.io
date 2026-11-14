export type SoundMaterial = 'grass' | 'stone' | 'wood' | 'sand' | 'snow' | 'glass' | 'water' | 'metal' | 'wool';
export type ToolClass = 'none' | 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'shears' | 'sword';
export type BlockShape =
  | 'cube'
  | 'slab'
  | 'stairs_n'
  | 'stairs_s'
  | 'stairs_e'
  | 'stairs_w'
  | 'fence'
  | 'lantern'
  | 'door_closed'
  | 'door_open'
  | 'trapdoor_closed'
  | 'trapdoor_open'
  | 'pane'
  | 'campfire'
  | 'anvil'
  | 'enchanting_table'
  | 'cauldron'
  | 'cake'
  | 'powder_snow'
  | 'flower_pot';

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  solid: boolean;
  opaque: boolean;
  shape?: BlockShape;
  liquid?: boolean;
  cross?: boolean;
  flatWire?: boolean;
  replaceable?: boolean;
  climbable?: boolean;
  gravity?: boolean;
  portal?: 'nether' | 'end';
  interactive?:
    | 'crafting'
    | 'chest'
    | 'barrel'
    | 'furnace'
    | 'door'
    | 'trapdoor'
    | 'lever'
    | 'bed'
    | 'tnt'
    | 'bell'
    | 'composter'
    | 'campfire'
    | 'anvil'
    | 'enchanting'
    | 'berry_bush'
    | 'cauldron'
    | 'jukebox'
    | 'respawn_anchor'
    | 'note_block'
    | 'cake'
    | 'dragon_egg'
    | 'flower_pot';
  light?: number; // 0..15 block emission
  friction?: number;
  bounce?: number; // #15742 Block.fallOn bounce factor (Slime = 0.85, Bed = 0.66)
  fallDamageMult?: number; // #15742 Hay Bale = 0.2, Slime/Water = 0.0
  contactDamage?: number; // Cactus / Lava / Magma
  hardness: number;
  preferredTool: ToolClass;
  minTier?: number; // 0=any, 1=wood, 2=stone, 3=iron, 4=diamond
  dropId?: number;
  dropCount?: number;
  material: SoundMaterial;
  // Atlas tile indices: [top, side, bottom, frontOptional]
  tiles: [number, number, number, number?];
  inCreative: boolean;
}

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  BEDROCK: 5,
  SAND: 6,
  SANDSTONE: 7,
  GRAVEL: 8,
  OAK_LOG: 9,
  OAK_PLANKS: 10,
  OAK_LEAVES: 11,
  CHERRY_LOG: 12,
  CHERRY_LEAVES: 13,
  CHERRY_PLANKS: 14,
  BIRCH_LOG: 15,
  BIRCH_PLANKS: 16,
  BIRCH_LEAVES: 17,
  SPRUCE_LOG: 18,
  SPRUCE_LEAVES: 19,
  WATER: 20,
  GLASS: 21,
  BRICKS: 22,
  STONE_BRICKS: 23,
  MOSSY_STONE_BRICKS: 24,
  SNOW_GRASS: 25,
  SNOW_BLOCK: 26,
  ICE: 27,
  COAL_ORE: 28,
  IRON_ORE: 29,
  GOLD_ORE: 30,
  DIAMOND_ORE: 31,
  GLOWSTONE: 32,
  SEA_LANTERN: 33,
  CRAFTING_TABLE: 34,
  BOOKSHELF: 35,
  TNT: 36,
  HORIZON_PURPUR: 37,
  TALL_GRASS: 38,
  POPPY: 39,
  DANDELION: 40,
  CHERRY_PETALS: 41,
  CACTUS: 42,
  // New Authentic Village, Survival, Redstone, Nether & End Blocks
  DIRT_PATH: 43,
  FARMLAND: 44,
  WHEAT_CROP: 45,
  CORNFLOWER: 46,
  OXEYE_DAISY: 47,
  TORCH: 48,
  CHEST: 49,
  FURNACE: 50,
  FURNACE_LIT: 51,
  SPRUCE_PLANKS: 52,
  ACACIA_LOG: 53,
  ACACIA_LEAVES: 54,
  ACACIA_PLANKS: 55,
  MOSSY_COBBLESTONE: 56,
  HAY_BALE: 57,
  SLIME_BLOCK: 58,
  WOOL_WHITE: 59,
  WOOL_RED: 60,
  IRON_BLOCK: 61,
  GOLD_BLOCK: 62,
  DIAMOND_BLOCK: 63,
  COPPER_BLOCK: 64,
  EMERALD_ORE: 65,
  REDSTONE_ORE: 66,
  REDSTONE_LAMP_OFF: 67,
  REDSTONE_LAMP_ON: 68,
  LEVER_OFF: 69,
  LEVER_ON: 70,
  OAK_DOOR_CLOSED: 71,
  OAK_DOOR_OPEN: 72,
  LADDER: 73,
  LAVA: 74,
  OBSIDIAN: 75,
  NETHER_PORTAL: 76,
  NETHERRACK: 77,
  SOUL_SAND: 78,
  CRIMSON_NYLIUM: 79,
  CRIMSON_STEM: 80,
  NETHER_WART_BLOCK: 81,
  WARPED_NYLIUM: 82,
  WARPED_STEM: 83,
  WARPED_WART_BLOCK: 84,
  NETHER_BRICKS: 85,
  QUARTZ_ORE: 86,
  END_STONE: 87,
  END_PORTAL: 88,
  END_CRYSTAL_BLOCK: 89,
  DRAGON_EGG: 90,
  TERRACOTTA: 91,
  RED_SAND: 92,
  BELL_BLOCK: 93,
  BED_BLOCK: 94,
  REDSTONE_DUST_OFF: 95,
  REDSTONE_DUST_ON: 96,
  PISTON: 97,
  // Wave 4: 3D Slabs, Directional Stairs, Copper Oxidation (#15835), Fences, Lanterns, Composter (#15843), Magma & Deepslate
  OAK_SLAB: 98,
  COBBLESTONE_SLAB: 99,
  STONE_BRICK_SLAB: 100,
  SPRUCE_SLAB: 101,
  OAK_STAIRS_N: 102,
  OAK_STAIRS_S: 103,
  OAK_STAIRS_E: 104,
  OAK_STAIRS_W: 105,
  COBBLESTONE_STAIRS_N: 106,
  COBBLESTONE_STAIRS_S: 107,
  COBBLESTONE_STAIRS_E: 108,
  COBBLESTONE_STAIRS_W: 109,
  EXPOSED_COPPER: 110,
  WEATHERED_COPPER: 111,
  OXIDIZED_COPPER: 112,
  OAK_FENCE: 113,
  LANTERN: 114,
  MAGMA_BLOCK: 115,
  COMPOSTER: 116,
  DEEPSLATE: 117,
  DEEPSLATE_DIAMOND_ORE: 118,
  // Wave 5: Ancient Debris & Netherite
  ANCIENT_DEBRIS: 119,
  NETHERITE_BLOCK: 120,
  // Wave 6: Dynamic Flowing Liquids, Sponge, Pumpkins (Golem Heads), Trapdoors & Connecting Panes
  FLOWING_WATER: 121,
  FLOWING_LAVA: 122,
  SPONGE: 123,
  WET_SPONGE: 124,
  PUMPKIN: 125,
  CARVED_PUMPKIN: 126,
  JACK_O_LANTERN: 127,
  OAK_TRAPDOOR_CLOSED: 128,
  OAK_TRAPDOOR_OPEN: 129,
  GLASS_PANE: 130,
  IRON_BARS: 131,
  // Wave 7: Barrel, Campfire (`campfire.rs`), Anvil, Enchanting Table, Sweet Berry Bush & Amethyst Geodes
  BARREL: 132,
  CAMPFIRE: 133,
  CAMPFIRE_UNLIT: 134,
  ANVIL: 135,
  ENCHANTING_TABLE: 136,
  SWEET_BERRY_BUSH: 137,
  AMETHYST_BLOCK: 138,
  AMETHYST_CLUSTER: 139,
  // Wave 8: Cauldrons (`cauldrons.rs`) & Jukebox (`jukebox.rs`)
  CAULDRON_EMPTY: 140,
  CAULDRON_WATER: 141,
  CAULDRON_LAVA: 142,
  JUKEBOX: 143,
  // Wave 9: Crying Obsidian, Respawn Anchor (`interact.rs`), Powder Snow (`powder_snow_collision.rs`), Note Block & Cake
  CRYING_OBSIDIAN: 144,
  RESPAWN_ANCHOR_0: 145,
  RESPAWN_ANCHOR_1: 146,
  RESPAWN_ANCHOR_2: 147,
  RESPAWN_ANCHOR_3: 148,
  RESPAWN_ANCHOR_4: 149,
  POWDER_SNOW: 150,
  NOTE_BLOCK: 151,
  CAKE: 152,
  // Wave 10: Dripstone (`speleothem.rs`), Copper Bulb, Target Block & Flower Pots
  DRIPSTONE_BLOCK: 153,
  POINTED_DRIPSTONE: 154,
  COPPER_BULB_OFF: 155,
  COPPER_BULB_ON: 156,
  TARGET_BLOCK: 157,
  FLOWER_POT: 158,
  POTTED_POPPY: 159,
  POTTED_DANDELION: 160,
  POTTED_CACTUS: 161,
  POTTED_CHERRY: 162
} as const;

export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  BEDROCK: 5,
  SAND: 6,
  SANDSTONE_SIDE: 7,
  SANDSTONE_TOP: 8,
  GRAVEL: 9,
  OAK_LOG_SIDE: 10,
  OAK_LOG_TOP: 11,
  OAK_PLANKS: 12,
  OAK_LEAVES: 13,
  CHERRY_LOG_SIDE: 14,
  CHERRY_LOG_TOP: 15,
  CHERRY_LEAVES: 16,
  CHERRY_PLANKS: 17,
  BIRCH_LOG_SIDE: 18,
  BIRCH_LOG_TOP: 19,
  BIRCH_PLANKS: 20,
  BIRCH_LEAVES: 21,
  SPRUCE_LOG_SIDE: 22,
  SPRUCE_LEAVES: 23,
  WATER: 24,
  GLASS: 25,
  BRICKS: 26,
  STONE_BRICKS: 27,
  MOSSY_STONE_BRICKS: 28,
  SNOW: 29,
  SNOW_SIDE: 30,
  ICE: 31,
  COAL_ORE: 32,
  IRON_ORE: 33,
  GOLD_ORE: 34,
  DIAMOND_ORE: 35,
  GLOWSTONE: 36,
  SEA_LANTERN: 37,
  CRAFT_TOP: 38,
  CRAFT_SIDE: 39,
  BOOKSHELF_SIDE: 40,
  TNT_SIDE: 41,
  TNT_TOP: 42,
  TNT_BOTTOM: 43,
  HORIZON_PURPUR: 44,
  TALL_GRASS: 45,
  POPPY: 46,
  DANDELION: 47,
  CHERRY_PETALS: 48,
  CACTUS_SIDE: 49,
  CACTUS_TOP: 50,
  // New Tiles 51..115
  DIRT_PATH_TOP: 51,
  DIRT_PATH_SIDE: 52,
  FARMLAND_TOP: 53,
  WHEAT_CROP: 54,
  CORNFLOWER: 55,
  OXEYE_DAISY: 56,
  TORCH: 57,
  CHEST_TOP: 58,
  CHEST_SIDE: 59,
  CHEST_FRONT: 60,
  FURNACE_TOP: 61,
  FURNACE_SIDE: 62,
  FURNACE_FRONT_OFF: 63,
  FURNACE_FRONT_ON: 64,
  SPRUCE_PLANKS: 65,
  ACACIA_LOG_SIDE: 66,
  ACACIA_LEAVES: 67,
  ACACIA_PLANKS: 68,
  MOSSY_COBBLESTONE: 69,
  HAY_SIDE: 70,
  HAY_TOP: 71,
  SLIME: 72,
  WOOL_WHITE: 73,
  WOOL_RED: 74,
  IRON_BLOCK: 75,
  GOLD_BLOCK: 76,
  DIAMOND_BLOCK: 77,
  COPPER_BLOCK: 78,
  EMERALD_ORE: 79,
  REDSTONE_ORE: 80,
  LAMP_OFF: 81,
  LAMP_ON: 82,
  LEVER_OFF: 83,
  LEVER_ON: 84,
  OAK_DOOR: 85,
  LADDER: 86,
  LAVA: 87,
  OBSIDIAN: 88,
  NETHER_PORTAL: 89,
  NETHERRACK: 90,
  SOUL_SAND: 91,
  CRIMSON_NYLIUM_TOP: 92,
  CRIMSON_NYLIUM_SIDE: 93,
  CRIMSON_STEM: 94,
  NETHER_WART: 95,
  WARPED_NYLIUM_TOP: 96,
  WARPED_NYLIUM_SIDE: 97,
  WARPED_STEM: 98,
  WARPED_WART: 99,
  NETHER_BRICKS: 100,
  QUARTZ_ORE: 101,
  END_STONE: 102,
  END_PORTAL: 103,
  END_CRYSTAL: 104,
  DRAGON_EGG: 105,
  TERRACOTTA: 106,
  RED_SAND: 107,
  BELL: 108,
  BED_TOP: 109,
  BED_SIDE: 110,
  REDSTONE_DUST_OFF: 111,
  REDSTONE_DUST_ON: 112,
  PISTON_TOP: 113,
  PISTON_SIDE: 114,
  // Crack stages 0..9 -> 120..129
  CRACK_0: 120,
  // Wave 4 Tiles 130..138
  EXPOSED_COPPER: 130,
  WEATHERED_COPPER: 131,
  OXIDIZED_COPPER: 132,
  LANTERN: 133,
  MAGMA: 134,
  COMPOSTER_SIDE: 135,
  COMPOSTER_TOP: 136,
  DEEPSLATE: 137,
  DEEPSLATE_DIAMOND: 138,
  // Wave 5 Tiles 139..142
  OAK_DOOR_LOWER: 139,
  ANCIENT_DEBRIS_TOP: 140,
  ANCIENT_DEBRIS_SIDE: 141,
  NETHERITE_BLOCK: 142,
  // Wave 6 Tiles 143..150
  SPONGE: 143,
  WET_SPONGE: 144,
  PUMPKIN_TOP: 145,
  PUMPKIN_SIDE: 146,
  CARVED_PUMPKIN_FRONT: 147,
  JACK_O_LANTERN_FRONT: 148,
  OAK_TRAPDOOR: 149,
  IRON_BARS: 150,
  // Wave 7 Tiles 151..161
  BARREL_TOP: 151,
  BARREL_SIDE: 152,
  CAMPFIRE_LOG: 153,
  CAMPFIRE_FIRE: 154,
  CAMPFIRE_ASH: 155,
  ANVIL_TOP: 156,
  ENCHANT_TOP: 157,
  ENCHANT_SIDE: 158,
  SWEET_BERRY_BUSH: 159,
  AMETHYST_BLOCK: 160,
  AMETHYST_CLUSTER: 161,
  // Wave 8 Tiles 162..165
  CAULDRON_SIDE: 162,
  CAULDRON_TOP: 163,
  JUKEBOX_TOP: 164,
  JUKEBOX_SIDE: 165,
  // Wave 9 Tiles 166..173
  CRYING_OBSIDIAN: 166,
  RESPAWN_ANCHOR_TOP: 167,
  RESPAWN_ANCHOR_SIDE_OFF: 168,
  RESPAWN_ANCHOR_SIDE_ON: 169,
  POWDER_SNOW: 170,
  NOTE_BLOCK: 171,
  CAKE_TOP: 172,
  CAKE_SIDE: 173,
  // Wave 10 Tiles 174..180
  DRIPSTONE_BLOCK: 174,
  POINTED_DRIPSTONE: 175,
  COPPER_BULB_OFF: 176,
  COPPER_BULB_ON: 177,
  TARGET_BLOCK_SIDE: 178,
  TARGET_BLOCK_TOP: 179,
  FLOWER_POT: 180
} as const;

const RAW: BlockDef[] = [
  { id: BLOCK.AIR, key: 'air', name: 'Hava', solid: false, opaque: false, replaceable: true, hardness: 0, preferredTool: 'none', material: 'grass', tiles: [0, 0, 0], inCreative: false },
  { id: BLOCK.GRASS, key: 'grass_block', name: 'Çimenli Toprak', solid: true, opaque: true, hardness: 0.6, preferredTool: 'shovel', dropId: BLOCK.DIRT, material: 'grass', tiles: [TILE.GRASS_TOP, TILE.GRASS_SIDE, TILE.DIRT], inCreative: true },
  { id: BLOCK.DIRT, key: 'dirt', name: 'Toprak', solid: true, opaque: true, hardness: 0.5, preferredTool: 'shovel', material: 'grass', tiles: [TILE.DIRT, TILE.DIRT, TILE.DIRT], inCreative: true },
  { id: BLOCK.STONE, key: 'stone', name: 'Taş', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.COBBLESTONE, material: 'stone', tiles: [TILE.STONE, TILE.STONE, TILE.STONE], inCreative: true },
  { id: BLOCK.COBBLESTONE, key: 'cobblestone', name: 'Kırık Taş', solid: true, opaque: true, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: true },
  { id: BLOCK.BEDROCK, key: 'bedrock', name: 'Katman Kayası', solid: true, opaque: true, hardness: Infinity, preferredTool: 'none', material: 'stone', tiles: [TILE.BEDROCK, TILE.BEDROCK, TILE.BEDROCK], inCreative: false },
  { id: BLOCK.SAND, key: 'sand', name: 'Kum', solid: true, opaque: true, gravity: true, hardness: 0.5, preferredTool: 'shovel', material: 'sand', tiles: [TILE.SAND, TILE.SAND, TILE.SAND], inCreative: true },
  { id: BLOCK.SANDSTONE, key: 'sandstone', name: 'Kumtaşı', solid: true, opaque: true, hardness: 0.8, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.SANDSTONE_TOP, TILE.SANDSTONE_SIDE, TILE.SANDSTONE_TOP], inCreative: true },
  { id: BLOCK.GRAVEL, key: 'gravel', name: 'Çakıl', solid: true, opaque: true, gravity: true, hardness: 0.6, preferredTool: 'shovel', material: 'sand', tiles: [TILE.GRAVEL, TILE.GRAVEL, TILE.GRAVEL], inCreative: true },
  { id: BLOCK.OAK_LOG, key: 'oak_log', name: 'Meşe Kütüğü', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_LOG_TOP, TILE.OAK_LOG_SIDE, TILE.OAK_LOG_TOP], inCreative: true },
  { id: BLOCK.OAK_PLANKS, key: 'oak_planks', name: 'Meşe Tahtası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.OAK_LEAVES, key: 'oak_leaves', name: 'Meşe Yaprakları', solid: true, opaque: false, hardness: 0.2, preferredTool: 'shears', material: 'grass', tiles: [TILE.OAK_LEAVES, TILE.OAK_LEAVES, TILE.OAK_LEAVES], inCreative: true },
  { id: BLOCK.CHERRY_LOG, key: 'cherry_log', name: 'Kiraz Kütüğü', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.CHERRY_LOG_TOP, TILE.CHERRY_LOG_SIDE, TILE.CHERRY_LOG_TOP], inCreative: true },
  { id: BLOCK.CHERRY_LEAVES, key: 'cherry_leaves', name: 'Kiraz Çiçeği Yaprağı', solid: true, opaque: false, hardness: 0.2, preferredTool: 'shears', material: 'grass', tiles: [TILE.CHERRY_LEAVES, TILE.CHERRY_LEAVES, TILE.CHERRY_LEAVES], inCreative: true },
  { id: BLOCK.CHERRY_PLANKS, key: 'cherry_planks', name: 'Kiraz Tahtası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.CHERRY_PLANKS, TILE.CHERRY_PLANKS, TILE.CHERRY_PLANKS], inCreative: true },
  { id: BLOCK.BIRCH_LOG, key: 'birch_log', name: 'Huş Kütüğü', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.BIRCH_LOG_TOP, TILE.BIRCH_LOG_SIDE, TILE.BIRCH_LOG_TOP], inCreative: true },
  { id: BLOCK.BIRCH_PLANKS, key: 'birch_planks', name: 'Huş Tahtası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.BIRCH_PLANKS, TILE.BIRCH_PLANKS, TILE.BIRCH_PLANKS], inCreative: true },
  { id: BLOCK.BIRCH_LEAVES, key: 'birch_leaves', name: 'Huş Yaprakları', solid: true, opaque: false, hardness: 0.2, preferredTool: 'shears', material: 'grass', tiles: [TILE.BIRCH_LEAVES, TILE.BIRCH_LEAVES, TILE.BIRCH_LEAVES], inCreative: true },
  { id: BLOCK.SPRUCE_LOG, key: 'spruce_log', name: 'Ladin Kütüğü', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_LOG_TOP, TILE.SPRUCE_LOG_SIDE, TILE.OAK_LOG_TOP], inCreative: true },
  { id: BLOCK.SPRUCE_LEAVES, key: 'spruce_leaves', name: 'Ladin Yaprakları', solid: true, opaque: false, hardness: 0.2, preferredTool: 'shears', material: 'grass', tiles: [TILE.SPRUCE_LEAVES, TILE.SPRUCE_LEAVES, TILE.SPRUCE_LEAVES], inCreative: true },
  { id: BLOCK.WATER, key: 'water', name: 'Su', solid: false, opaque: false, liquid: true, replaceable: true, fallDamageMult: 0, hardness: Infinity, preferredTool: 'none', material: 'water', tiles: [TILE.WATER, TILE.WATER, TILE.WATER], inCreative: true },
  { id: BLOCK.GLASS, key: 'glass', name: 'Cam', solid: true, opaque: false, hardness: 0.3, preferredTool: 'none', dropCount: 0, material: 'glass', tiles: [TILE.GLASS, TILE.GLASS, TILE.GLASS], inCreative: true },
  { id: BLOCK.BRICKS, key: 'bricks', name: 'Tuğla Bloğu', solid: true, opaque: true, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.BRICKS, TILE.BRICKS, TILE.BRICKS], inCreative: true },
  { id: BLOCK.STONE_BRICKS, key: 'stone_bricks', name: 'Taş Tuğla', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.STONE_BRICKS, TILE.STONE_BRICKS, TILE.STONE_BRICKS], inCreative: true },
  { id: BLOCK.MOSSY_STONE_BRICKS, key: 'mossy_stone_bricks', name: 'Yosunlu Taş Tuğla', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.MOSSY_STONE_BRICKS, TILE.MOSSY_STONE_BRICKS, TILE.MOSSY_STONE_BRICKS], inCreative: true },
  { id: BLOCK.SNOW_GRASS, key: 'snow_grass', name: 'Karlı Toprak', solid: true, opaque: true, hardness: 0.6, preferredTool: 'shovel', dropId: BLOCK.DIRT, material: 'snow', tiles: [TILE.SNOW, TILE.SNOW_SIDE, TILE.DIRT], inCreative: false },
  { id: BLOCK.SNOW_BLOCK, key: 'snow_block', name: 'Kar Bloğu', solid: true, opaque: true, hardness: 0.3, preferredTool: 'shovel', material: 'snow', tiles: [TILE.SNOW, TILE.SNOW, TILE.SNOW], inCreative: true },
  { id: BLOCK.ICE, key: 'ice', name: 'Buz', solid: true, opaque: false, friction: 0.98, hardness: 0.5, preferredTool: 'pickaxe', dropCount: 0, material: 'glass', tiles: [TILE.ICE, TILE.ICE, TILE.ICE], inCreative: true },
  { id: BLOCK.COAL_ORE, key: 'coal_ore', name: 'Kömür Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.COAL_ORE, TILE.COAL_ORE, TILE.COAL_ORE], inCreative: true },
  { id: BLOCK.IRON_ORE, key: 'iron_ore', name: 'Demir Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'stone', tiles: [TILE.IRON_ORE, TILE.IRON_ORE, TILE.IRON_ORE], inCreative: true },
  { id: BLOCK.GOLD_ORE, key: 'gold_ore', name: 'Altın Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 3, material: 'stone', tiles: [TILE.GOLD_ORE, TILE.GOLD_ORE, TILE.GOLD_ORE], inCreative: true },
  { id: BLOCK.DIAMOND_ORE, key: 'diamond_ore', name: 'Elmas Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 3, material: 'stone', tiles: [TILE.DIAMOND_ORE, TILE.DIAMOND_ORE, TILE.DIAMOND_ORE], inCreative: true },
  { id: BLOCK.GLOWSTONE, key: 'glowstone', name: 'Işıktaşı', solid: true, opaque: true, light: 15, hardness: 0.3, preferredTool: 'none', material: 'glass', tiles: [TILE.GLOWSTONE, TILE.GLOWSTONE, TILE.GLOWSTONE], inCreative: true },
  { id: BLOCK.SEA_LANTERN, key: 'sea_lantern', name: 'Deniz Feneri', solid: true, opaque: true, light: 15, hardness: 0.3, preferredTool: 'none', material: 'glass', tiles: [TILE.SEA_LANTERN, TILE.SEA_LANTERN, TILE.SEA_LANTERN], inCreative: true },
  { id: BLOCK.CRAFTING_TABLE, key: 'crafting_table', name: 'Çalışma Masası', solid: true, opaque: true, interactive: 'crafting', hardness: 2.5, preferredTool: 'axe', material: 'wood', tiles: [TILE.CRAFT_TOP, TILE.CRAFT_SIDE, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.BOOKSHELF, key: 'bookshelf', name: 'Kitaplık', solid: true, opaque: true, hardness: 1.5, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.BOOKSHELF_SIDE, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.TNT, key: 'tnt', name: 'TNT', solid: true, opaque: true, interactive: 'tnt', hardness: 0.05, preferredTool: 'none', material: 'grass', tiles: [TILE.TNT_TOP, TILE.TNT_SIDE, TILE.TNT_BOTTOM], inCreative: true },
  { id: BLOCK.HORIZON_PURPUR, key: 'horizon_purpur', name: 'Purpur Bloğu', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.HORIZON_PURPUR, TILE.HORIZON_PURPUR, TILE.HORIZON_PURPUR], inCreative: true },
  { id: BLOCK.TALL_GRASS, key: 'tall_grass', name: 'Çimen Otu', solid: false, opaque: false, cross: true, replaceable: true, hardness: 0.02, preferredTool: 'shears', dropCount: 0, material: 'grass', tiles: [TILE.TALL_GRASS, TILE.TALL_GRASS, TILE.TALL_GRASS], inCreative: true },
  { id: BLOCK.POPPY, key: 'poppy', name: 'Gelincik', solid: false, opaque: false, cross: true, hardness: 0.02, preferredTool: 'none', material: 'grass', tiles: [TILE.POPPY, TILE.POPPY, TILE.POPPY], inCreative: true },
  { id: BLOCK.DANDELION, key: 'dandelion', name: 'Karahindiba', solid: false, opaque: false, cross: true, hardness: 0.02, preferredTool: 'none', material: 'grass', tiles: [TILE.DANDELION, TILE.DANDELION, TILE.DANDELION], inCreative: true },
  { id: BLOCK.CHERRY_PETALS, key: 'cherry_petals', name: 'Kiraz Fidanı', solid: false, opaque: false, cross: true, hardness: 0.02, preferredTool: 'none', material: 'grass', tiles: [TILE.CHERRY_PETALS, TILE.CHERRY_PETALS, TILE.CHERRY_PETALS], inCreative: true },
  { id: BLOCK.CACTUS, key: 'cactus', name: 'Kaktüs', solid: true, opaque: true, contactDamage: 1, hardness: 0.4, preferredTool: 'none', material: 'grass', tiles: [TILE.CACTUS_TOP, TILE.CACTUS_SIDE, TILE.CACTUS_TOP], inCreative: true },
  { id: BLOCK.DIRT_PATH, key: 'dirt_path', name: 'Toprak Patika', solid: true, opaque: true, hardness: 0.65, preferredTool: 'shovel', dropId: BLOCK.DIRT, material: 'grass', tiles: [TILE.DIRT_PATH_TOP, TILE.DIRT_PATH_SIDE, TILE.DIRT], inCreative: true },
  { id: BLOCK.FARMLAND, key: 'farmland', name: 'Ekili Toprak', solid: true, opaque: true, hardness: 0.6, preferredTool: 'shovel', dropId: BLOCK.DIRT, material: 'grass', tiles: [TILE.FARMLAND_TOP, TILE.DIRT, TILE.DIRT], inCreative: true },
  { id: BLOCK.WHEAT_CROP, key: 'wheat_crop', name: 'Buğday Ekini', solid: false, opaque: false, cross: true, hardness: 0.05, preferredTool: 'none', material: 'grass', tiles: [TILE.WHEAT_CROP, TILE.WHEAT_CROP, TILE.WHEAT_CROP], inCreative: true },
  { id: BLOCK.CORNFLOWER, key: 'cornflower', name: 'Mavi Peygamber Çiçeği', solid: false, opaque: false, cross: true, hardness: 0.02, preferredTool: 'none', material: 'grass', tiles: [TILE.CORNFLOWER, TILE.CORNFLOWER, TILE.CORNFLOWER], inCreative: true },
  { id: BLOCK.OXEYE_DAISY, key: 'oxeye_daisy', name: 'Papatya', solid: false, opaque: false, cross: true, hardness: 0.02, preferredTool: 'none', material: 'grass', tiles: [TILE.OXEYE_DAISY, TILE.OXEYE_DAISY, TILE.OXEYE_DAISY], inCreative: true },
  { id: BLOCK.TORCH, key: 'torch', name: 'Meşale', solid: false, opaque: false, cross: true, light: 14, hardness: 0.02, preferredTool: 'none', material: 'wood', tiles: [TILE.TORCH, TILE.TORCH, TILE.TORCH], inCreative: true },
  { id: BLOCK.CHEST, key: 'chest', name: 'Sandık', solid: true, opaque: false, interactive: 'chest', hardness: 2.5, preferredTool: 'axe', material: 'wood', tiles: [TILE.CHEST_TOP, TILE.CHEST_SIDE, TILE.CHEST_TOP, TILE.CHEST_FRONT], inCreative: true },
  { id: BLOCK.FURNACE, key: 'furnace', name: 'Fırın', solid: true, opaque: true, interactive: 'furnace', hardness: 3.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.FURNACE_TOP, TILE.FURNACE_SIDE, TILE.FURNACE_TOP, TILE.FURNACE_FRONT_OFF], inCreative: true },
  { id: BLOCK.FURNACE_LIT, key: 'furnace_lit', name: 'Yanan Fırın', solid: true, opaque: true, interactive: 'furnace', light: 13, hardness: 3.5, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.FURNACE, material: 'stone', tiles: [TILE.FURNACE_TOP, TILE.FURNACE_SIDE, TILE.FURNACE_TOP, TILE.FURNACE_FRONT_ON], inCreative: false },
  { id: BLOCK.SPRUCE_PLANKS, key: 'spruce_planks', name: 'Ladin Tahtası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS], inCreative: true },
  { id: BLOCK.ACACIA_LOG, key: 'acacia_log', name: 'Akasya Kütüğü', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_LOG_TOP, TILE.ACACIA_LOG_SIDE, TILE.OAK_LOG_TOP], inCreative: true },
  { id: BLOCK.ACACIA_LEAVES, key: 'acacia_leaves', name: 'Akasya Yaprağı', solid: true, opaque: false, hardness: 0.2, preferredTool: 'shears', material: 'grass', tiles: [TILE.ACACIA_LEAVES, TILE.ACACIA_LEAVES, TILE.ACACIA_LEAVES], inCreative: true },
  { id: BLOCK.ACACIA_PLANKS, key: 'acacia_planks', name: 'Akasya Tahtası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.ACACIA_PLANKS, TILE.ACACIA_PLANKS, TILE.ACACIA_PLANKS], inCreative: true },
  { id: BLOCK.MOSSY_COBBLESTONE, key: 'mossy_cobblestone', name: 'Yosunlu Kırık Taş', solid: true, opaque: true, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.MOSSY_COBBLESTONE, TILE.MOSSY_COBBLESTONE, TILE.MOSSY_COBBLESTONE], inCreative: true },
  { id: BLOCK.HAY_BALE, key: 'hay_bale', name: 'Saman Balyası', solid: true, opaque: true, fallDamageMult: 0.2, hardness: 0.5, preferredTool: 'none', material: 'grass', tiles: [TILE.HAY_TOP, TILE.HAY_SIDE, TILE.HAY_TOP], inCreative: true },
  { id: BLOCK.SLIME_BLOCK, key: 'slime_block', name: 'Balçık Bloğu', solid: true, opaque: false, bounce: 0.86, fallDamageMult: 0, hardness: 0.05, preferredTool: 'none', material: 'grass', tiles: [TILE.SLIME, TILE.SLIME, TILE.SLIME], inCreative: true },
  { id: BLOCK.WOOL_WHITE, key: 'white_wool', name: 'Beyaz Yün', solid: true, opaque: true, hardness: 0.8, preferredTool: 'shears', material: 'wool', tiles: [TILE.WOOL_WHITE, TILE.WOOL_WHITE, TILE.WOOL_WHITE], inCreative: true },
  { id: BLOCK.WOOL_RED, key: 'red_wool', name: 'Kırmızı Yün', solid: true, opaque: true, hardness: 0.8, preferredTool: 'shears', material: 'wool', tiles: [TILE.WOOL_RED, TILE.WOOL_RED, TILE.WOOL_RED], inCreative: true },
  { id: BLOCK.IRON_BLOCK, key: 'iron_block', name: 'Demir Bloğu', solid: true, opaque: true, hardness: 5.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.IRON_BLOCK, TILE.IRON_BLOCK, TILE.IRON_BLOCK], inCreative: true },
  { id: BLOCK.GOLD_BLOCK, key: 'gold_block', name: 'Altın Bloğu', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 3, material: 'metal', tiles: [TILE.GOLD_BLOCK, TILE.GOLD_BLOCK, TILE.GOLD_BLOCK], inCreative: true },
  { id: BLOCK.DIAMOND_BLOCK, key: 'diamond_block', name: 'Elmas Bloğu', solid: true, opaque: true, hardness: 5.0, preferredTool: 'pickaxe', minTier: 3, material: 'metal', tiles: [TILE.DIAMOND_BLOCK, TILE.DIAMOND_BLOCK, TILE.DIAMOND_BLOCK], inCreative: true },
  { id: BLOCK.COPPER_BLOCK, key: 'copper_block', name: 'Bakır Bloğu', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.COPPER_BLOCK, TILE.COPPER_BLOCK, TILE.COPPER_BLOCK], inCreative: true },
  { id: BLOCK.EMERALD_ORE, key: 'emerald_ore', name: 'Zümrüt Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 3, material: 'stone', tiles: [TILE.EMERALD_ORE, TILE.EMERALD_ORE, TILE.EMERALD_ORE], inCreative: true },
  { id: BLOCK.REDSTONE_ORE, key: 'redstone_ore', name: 'Kızıltaş Cevheri', solid: true, opaque: true, light: 4, hardness: 3.0, preferredTool: 'pickaxe', minTier: 3, material: 'stone', tiles: [TILE.REDSTONE_ORE, TILE.REDSTONE_ORE, TILE.REDSTONE_ORE], inCreative: true },
  { id: BLOCK.REDSTONE_LAMP_OFF, key: 'redstone_lamp', name: 'Kızıltaş Lambası', solid: true, opaque: true, hardness: 0.3, preferredTool: 'none', material: 'glass', tiles: [TILE.LAMP_OFF, TILE.LAMP_OFF, TILE.LAMP_OFF], inCreative: true },
  { id: BLOCK.REDSTONE_LAMP_ON, key: 'redstone_lamp_on', name: 'Yanan Kızıltaş Lambası', solid: true, opaque: true, light: 15, hardness: 0.3, preferredTool: 'none', dropId: BLOCK.REDSTONE_LAMP_OFF, material: 'glass', tiles: [TILE.LAMP_ON, TILE.LAMP_ON, TILE.LAMP_ON], inCreative: false },
  { id: BLOCK.LEVER_OFF, key: 'lever', name: 'Şalter', solid: false, opaque: false, cross: true, interactive: 'lever', hardness: 0.5, preferredTool: 'none', material: 'stone', tiles: [TILE.LEVER_OFF, TILE.LEVER_OFF, TILE.LEVER_OFF], inCreative: true },
  { id: BLOCK.LEVER_ON, key: 'lever_on', name: 'Açık Şalter', solid: false, opaque: false, cross: true, interactive: 'lever', hardness: 0.5, preferredTool: 'none', dropId: BLOCK.LEVER_OFF, material: 'stone', tiles: [TILE.LEVER_ON, TILE.LEVER_ON, TILE.LEVER_ON], inCreative: false },
  { id: BLOCK.OAK_DOOR_CLOSED, key: 'oak_door', name: 'Meşe Kapı', solid: true, opaque: false, shape: 'door_closed', interactive: 'door', hardness: 3.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_DOOR, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.OAK_DOOR_OPEN, key: 'oak_door_open', name: 'Açık Meşe Kapı', solid: true, opaque: false, shape: 'door_open', interactive: 'door', hardness: 3.0, preferredTool: 'axe', dropId: BLOCK.OAK_DOOR_CLOSED, material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_DOOR, TILE.OAK_PLANKS], inCreative: false },
  { id: BLOCK.LADDER, key: 'ladder', name: 'Merdiven', solid: false, opaque: false, cross: true, climbable: true, hardness: 0.4, preferredTool: 'axe', material: 'wood', tiles: [TILE.LADDER, TILE.LADDER, TILE.LADDER], inCreative: true },
  { id: BLOCK.LAVA, key: 'lava', name: 'Lav', solid: false, opaque: false, liquid: true, replaceable: true, light: 15, contactDamage: 4, hardness: Infinity, preferredTool: 'none', material: 'water', tiles: [TILE.LAVA, TILE.LAVA, TILE.LAVA], inCreative: true },
  { id: BLOCK.OBSIDIAN, key: 'obsidian', name: 'Obsidyen', solid: true, opaque: true, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, material: 'stone', tiles: [TILE.OBSIDIAN, TILE.OBSIDIAN, TILE.OBSIDIAN], inCreative: true },
  { id: BLOCK.NETHER_PORTAL, key: 'nether_portal', name: 'Nether Geçidi', solid: false, opaque: false, portal: 'nether', light: 11, hardness: Infinity, preferredTool: 'none', material: 'glass', tiles: [TILE.NETHER_PORTAL, TILE.NETHER_PORTAL, TILE.NETHER_PORTAL], inCreative: true },
  { id: BLOCK.NETHERRACK, key: 'netherrack', name: 'Netherrack', solid: true, opaque: true, hardness: 0.4, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.NETHERRACK, TILE.NETHERRACK, TILE.NETHERRACK], inCreative: true },
  { id: BLOCK.SOUL_SAND, key: 'soul_sand', name: 'Ruh Kumu', solid: true, opaque: true, hardness: 0.5, preferredTool: 'shovel', material: 'sand', tiles: [TILE.SOUL_SAND, TILE.SOUL_SAND, TILE.SOUL_SAND], inCreative: true },
  { id: BLOCK.CRIMSON_NYLIUM, key: 'crimson_nylium', name: 'Kızıl Nilyum', solid: true, opaque: true, hardness: 0.4, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.NETHERRACK, material: 'stone', tiles: [TILE.CRIMSON_NYLIUM_TOP, TILE.CRIMSON_NYLIUM_SIDE, TILE.NETHERRACK], inCreative: true },
  { id: BLOCK.CRIMSON_STEM, key: 'crimson_stem', name: 'Kızıl Kök', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.CHERRY_LOG_TOP, TILE.CRIMSON_STEM, TILE.CHERRY_LOG_TOP], inCreative: true },
  { id: BLOCK.NETHER_WART_BLOCK, key: 'nether_wart_block', name: 'Nether Yumrusu Bloğu', solid: true, opaque: true, hardness: 1.0, preferredTool: 'none', material: 'grass', tiles: [TILE.NETHER_WART, TILE.NETHER_WART, TILE.NETHER_WART], inCreative: true },
  { id: BLOCK.WARPED_NYLIUM, key: 'warped_nylium', name: 'Çarpık Nilyum', solid: true, opaque: true, hardness: 0.4, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.NETHERRACK, material: 'stone', tiles: [TILE.WARPED_NYLIUM_TOP, TILE.WARPED_NYLIUM_SIDE, TILE.NETHERRACK], inCreative: true },
  { id: BLOCK.WARPED_STEM, key: 'warped_stem', name: 'Çarpık Kök', solid: true, opaque: true, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_LOG_TOP, TILE.WARPED_STEM, TILE.OAK_LOG_TOP], inCreative: true },
  { id: BLOCK.WARPED_WART_BLOCK, key: 'warped_wart_block', name: 'Çarpık Yumru Bloğu', solid: true, opaque: true, hardness: 1.0, preferredTool: 'none', material: 'grass', tiles: [TILE.WARPED_WART, TILE.WARPED_WART, TILE.WARPED_WART], inCreative: true },
  { id: BLOCK.NETHER_BRICKS, key: 'nether_bricks', name: 'Nether Tuğlası', solid: true, opaque: true, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.NETHER_BRICKS, TILE.NETHER_BRICKS, TILE.NETHER_BRICKS], inCreative: true },
  { id: BLOCK.QUARTZ_ORE, key: 'nether_quartz_ore', name: 'Nether Kuvars Cevheri', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.QUARTZ_ORE, TILE.QUARTZ_ORE, TILE.QUARTZ_ORE], inCreative: true },
  { id: BLOCK.END_STONE, key: 'end_stone', name: 'End Taşı', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.END_STONE, TILE.END_STONE, TILE.END_STONE], inCreative: true },
  { id: BLOCK.END_PORTAL, key: 'end_portal', name: 'End Geçidi', solid: false, opaque: false, portal: 'end', light: 15, hardness: Infinity, preferredTool: 'none', material: 'glass', tiles: [TILE.END_PORTAL, TILE.END_PORTAL, TILE.END_PORTAL], inCreative: true },
  { id: BLOCK.END_CRYSTAL_BLOCK, key: 'end_crystal', name: 'End Kristali', solid: true, opaque: false, light: 15, hardness: 0.15, preferredTool: 'none', dropCount: 0, material: 'glass', tiles: [TILE.END_CRYSTAL, TILE.END_CRYSTAL, TILE.END_CRYSTAL], inCreative: true },
  { id: BLOCK.DRAGON_EGG, key: 'dragon_egg', name: 'Ejderha Yumurtası', solid: true, opaque: false, interactive: 'dragon_egg', light: 8, hardness: 3.0, preferredTool: 'pickaxe', material: 'stone', tiles: [TILE.DRAGON_EGG, TILE.DRAGON_EGG, TILE.DRAGON_EGG], inCreative: true },
  { id: BLOCK.TERRACOTTA, key: 'terracotta', name: 'Pişmiş Toprak', solid: true, opaque: true, hardness: 1.25, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.TERRACOTTA, TILE.TERRACOTTA, TILE.TERRACOTTA], inCreative: true },
  { id: BLOCK.RED_SAND, key: 'red_sand', name: 'Kırmızı Kum', solid: true, opaque: true, gravity: true, hardness: 0.5, preferredTool: 'shovel', material: 'sand', tiles: [TILE.RED_SAND, TILE.RED_SAND, TILE.RED_SAND], inCreative: true },
  { id: BLOCK.BELL_BLOCK, key: 'bell', name: 'Köy Çanı', solid: true, opaque: false, interactive: 'bell', hardness: 5.0, preferredTool: 'pickaxe', material: 'metal', tiles: [TILE.GOLD_BLOCK, TILE.BELL, TILE.GOLD_BLOCK], inCreative: true },
  { id: BLOCK.BED_BLOCK, key: 'bed', name: 'Yatak', solid: true, opaque: true, interactive: 'bed', bounce: 0.66, fallDamageMult: 0.5, hardness: 0.2, preferredTool: 'none', material: 'wood', tiles: [TILE.BED_TOP, TILE.BED_SIDE, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.REDSTONE_DUST_OFF, key: 'redstone_wire', name: 'Kızıltaş Tozu (Devre)', solid: false, opaque: false, flatWire: true, hardness: 0.02, preferredTool: 'none', material: 'sand', tiles: [TILE.REDSTONE_DUST_OFF, TILE.REDSTONE_DUST_OFF, TILE.REDSTONE_DUST_OFF], inCreative: true },
  { id: BLOCK.REDSTONE_DUST_ON, key: 'redstone_wire_on', name: 'Aktif Kızıltaş Tozu', solid: false, opaque: false, flatWire: true, light: 7, hardness: 0.02, preferredTool: 'none', dropId: BLOCK.REDSTONE_DUST_OFF, material: 'sand', tiles: [TILE.REDSTONE_DUST_ON, TILE.REDSTONE_DUST_ON, TILE.REDSTONE_DUST_ON], inCreative: false },
  { id: BLOCK.PISTON, key: 'piston', name: 'Piston (Kızıltaş İtici)', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', material: 'stone', tiles: [TILE.PISTON_TOP, TILE.PISTON_SIDE, TILE.COBBLESTONE], inCreative: true },
  // Wave 4: 3D Slabs & Directional Stairs
  { id: BLOCK.OAK_SLAB, key: 'oak_slab', name: 'Meşe Basamak', solid: true, opaque: false, shape: 'slab', hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.COBBLESTONE_SLAB, key: 'cobblestone_slab', name: 'Kırık Taş Basamak', solid: true, opaque: false, shape: 'slab', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: true },
  { id: BLOCK.STONE_BRICK_SLAB, key: 'stone_brick_slab', name: 'Taş Tuğla Basamak', solid: true, opaque: false, shape: 'slab', hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.STONE_BRICKS, TILE.STONE_BRICKS, TILE.STONE_BRICKS], inCreative: true },
  { id: BLOCK.SPRUCE_SLAB, key: 'spruce_slab', name: 'Ladin Basamak', solid: true, opaque: false, shape: 'slab', hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS, TILE.SPRUCE_PLANKS], inCreative: true },
  { id: BLOCK.OAK_STAIRS_N, key: 'oak_stairs', name: 'Meşe Merdiven Bloğu', solid: true, opaque: false, shape: 'stairs_n', hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.OAK_STAIRS_S, key: 'oak_stairs_s', name: 'Meşe Merdiven Bloğu', solid: true, opaque: false, shape: 'stairs_s', hardness: 2.0, preferredTool: 'axe', dropId: BLOCK.OAK_STAIRS_N, material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: false },
  { id: BLOCK.OAK_STAIRS_E, key: 'oak_stairs_e', name: 'Meşe Merdiven Bloğu', solid: true, opaque: false, shape: 'stairs_e', hardness: 2.0, preferredTool: 'axe', dropId: BLOCK.OAK_STAIRS_N, material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: false },
  { id: BLOCK.OAK_STAIRS_W, key: 'oak_stairs_w', name: 'Meşe Merdiven Bloğu', solid: true, opaque: false, shape: 'stairs_w', hardness: 2.0, preferredTool: 'axe', dropId: BLOCK.OAK_STAIRS_N, material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: false },
  { id: BLOCK.COBBLESTONE_STAIRS_N, key: 'cobblestone_stairs', name: 'Kırık Taş Merdiven', solid: true, opaque: false, shape: 'stairs_n', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: true },
  { id: BLOCK.COBBLESTONE_STAIRS_S, key: 'cobblestone_stairs_s', name: 'Kırık Taş Merdiven', solid: true, opaque: false, shape: 'stairs_s', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.COBBLESTONE_STAIRS_N, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: false },
  { id: BLOCK.COBBLESTONE_STAIRS_E, key: 'cobblestone_stairs_e', name: 'Kırık Taş Merdiven', solid: true, opaque: false, shape: 'stairs_e', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.COBBLESTONE_STAIRS_N, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: false },
  { id: BLOCK.COBBLESTONE_STAIRS_W, key: 'cobblestone_stairs_w', name: 'Kırık Taş Merdiven', solid: true, opaque: false, shape: 'stairs_w', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.COBBLESTONE_STAIRS_N, material: 'stone', tiles: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE], inCreative: false },
  // Copper Oxidation Family (#15835)
  { id: BLOCK.EXPOSED_COPPER, key: 'exposed_copper', name: 'Açıkta Kalmış Bakır', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.EXPOSED_COPPER, TILE.EXPOSED_COPPER, TILE.EXPOSED_COPPER], inCreative: true },
  { id: BLOCK.WEATHERED_COPPER, key: 'weathered_copper', name: 'Yıpranmış Bakır', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.WEATHERED_COPPER, TILE.WEATHERED_COPPER, TILE.WEATHERED_COPPER], inCreative: true },
  { id: BLOCK.OXIDIZED_COPPER, key: 'oxidized_copper', name: 'Oksitlenmiş Bakır', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.OXIDIZED_COPPER, TILE.OXIDIZED_COPPER, TILE.OXIDIZED_COPPER], inCreative: true },
  // Fences, Lanterns, Magma, Composter (#15843) & Deepslate
  { id: BLOCK.OAK_FENCE, key: 'oak_fence', name: 'Meşe Çit', solid: true, opaque: false, shape: 'fence', hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_PLANKS, TILE.OAK_PLANKS], inCreative: true },
  { id: BLOCK.LANTERN, key: 'lantern', name: 'Fener', solid: true, opaque: false, shape: 'lantern', light: 15, hardness: 1.5, preferredTool: 'pickaxe', material: 'metal', tiles: [TILE.LANTERN, TILE.LANTERN, TILE.LANTERN], inCreative: true },
  { id: BLOCK.MAGMA_BLOCK, key: 'magma_block', name: 'Magma Bloğu', solid: true, opaque: true, light: 5, contactDamage: 1, hardness: 0.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.MAGMA, TILE.MAGMA, TILE.MAGMA], inCreative: true },
  { id: BLOCK.COMPOSTER, key: 'composter', name: 'Gübre Varili', solid: true, opaque: true, interactive: 'composter', hardness: 0.6, preferredTool: 'axe', material: 'wood', tiles: [TILE.COMPOSTER_TOP, TILE.COMPOSTER_SIDE, TILE.SPRUCE_PLANKS], inCreative: true },
  { id: BLOCK.DEEPSLATE, key: 'deepslate', name: 'Kayrak Taşı (Deepslate)', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.DEEPSLATE, TILE.DEEPSLATE, TILE.DEEPSLATE], inCreative: true },
  { id: BLOCK.DEEPSLATE_DIAMOND_ORE, key: 'deepslate_diamond_ore', name: 'Kayrak Elmas Cevheri', solid: true, opaque: true, hardness: 4.5, preferredTool: 'pickaxe', minTier: 3, material: 'stone', tiles: [TILE.DEEPSLATE_DIAMOND, TILE.DEEPSLATE_DIAMOND, TILE.DEEPSLATE_DIAMOND], inCreative: true },
  { id: BLOCK.ANCIENT_DEBRIS, key: 'ancient_debris', name: 'Antik Kalıntı (Netherite)', solid: true, opaque: true, hardness: 10.0, preferredTool: 'pickaxe', minTier: 4, material: 'stone', tiles: [TILE.ANCIENT_DEBRIS_TOP, TILE.ANCIENT_DEBRIS_SIDE, TILE.ANCIENT_DEBRIS_TOP], inCreative: true },
  { id: BLOCK.NETHERITE_BLOCK, key: 'netherite_block', name: 'Netherite Bloğu', solid: true, opaque: true, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, material: 'metal', tiles: [TILE.NETHERITE_BLOCK, TILE.NETHERITE_BLOCK, TILE.NETHERITE_BLOCK], inCreative: true },
  // Wave 6: Flowing Fluids, Sponge, Pumpkins (Golem Construction), Trapdoors & Connecting Panes
  { id: BLOCK.FLOWING_WATER, key: 'flowing_water', name: 'Akan Su', solid: false, opaque: false, liquid: true, replaceable: true, fallDamageMult: 0, hardness: Infinity, preferredTool: 'none', material: 'water', tiles: [TILE.WATER, TILE.WATER, TILE.WATER], inCreative: false },
  { id: BLOCK.FLOWING_LAVA, key: 'flowing_lava', name: 'Akan Lav', solid: false, opaque: false, liquid: true, replaceable: true, light: 15, contactDamage: 4, hardness: Infinity, preferredTool: 'none', material: 'water', tiles: [TILE.LAVA, TILE.LAVA, TILE.LAVA], inCreative: false },
  { id: BLOCK.SPONGE, key: 'sponge', name: 'Sünger (Su Emici)', solid: true, opaque: true, hardness: 0.6, preferredTool: 'hoe', material: 'wool', tiles: [TILE.SPONGE, TILE.SPONGE, TILE.SPONGE], inCreative: true },
  { id: BLOCK.WET_SPONGE, key: 'wet_sponge', name: 'Islak Sünger', solid: true, opaque: true, hardness: 0.6, preferredTool: 'hoe', material: 'wool', tiles: [TILE.WET_SPONGE, TILE.WET_SPONGE, TILE.WET_SPONGE], inCreative: true },
  { id: BLOCK.PUMPKIN, key: 'pumpkin', name: 'Bal Kabağı', solid: true, opaque: true, hardness: 1.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.PUMPKIN_TOP, TILE.PUMPKIN_SIDE, TILE.PUMPKIN_TOP], inCreative: true },
  { id: BLOCK.CARVED_PUMPKIN, key: 'carved_pumpkin', name: 'Oyulmuş Bal Kabağı (Golem Başı)', solid: true, opaque: true, hardness: 1.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.PUMPKIN_TOP, TILE.PUMPKIN_SIDE, TILE.PUMPKIN_TOP, TILE.CARVED_PUMPKIN_FRONT], inCreative: true },
  { id: BLOCK.JACK_O_LANTERN, key: 'jack_o_lantern', name: 'Kabak Feneri', solid: true, opaque: true, light: 15, hardness: 1.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.PUMPKIN_TOP, TILE.PUMPKIN_SIDE, TILE.PUMPKIN_TOP, TILE.JACK_O_LANTERN_FRONT], inCreative: true },
  { id: BLOCK.OAK_TRAPDOOR_CLOSED, key: 'oak_trapdoor', name: 'Meşe Tuzak Kapısı', solid: true, opaque: false, shape: 'trapdoor_closed', interactive: 'trapdoor', hardness: 3.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.OAK_TRAPDOOR, TILE.OAK_PLANKS, TILE.OAK_TRAPDOOR], inCreative: true },
  { id: BLOCK.OAK_TRAPDOOR_OPEN, key: 'oak_trapdoor_open', name: 'Açık Meşe Tuzak Kapısı', solid: true, opaque: false, shape: 'trapdoor_open', interactive: 'trapdoor', climbable: true, hardness: 3.0, preferredTool: 'axe', dropId: BLOCK.OAK_TRAPDOOR_CLOSED, material: 'wood', tiles: [TILE.OAK_PLANKS, TILE.OAK_TRAPDOOR, TILE.OAK_PLANKS], inCreative: false },
  { id: BLOCK.GLASS_PANE, key: 'glass_pane', name: 'İnce Cam Bölme', solid: true, opaque: false, shape: 'pane', hardness: 0.3, preferredTool: 'none', dropCount: 0, material: 'glass', tiles: [TILE.GLASS, TILE.GLASS, TILE.GLASS], inCreative: true },
  { id: BLOCK.IRON_BARS, key: 'iron_bars', name: 'Demir Parmaklık', solid: true, opaque: false, shape: 'pane', hardness: 5.0, preferredTool: 'pickaxe', minTier: 1, material: 'metal', tiles: [TILE.IRON_BARS, TILE.IRON_BARS, TILE.IRON_BARS], inCreative: true },
  // Wave 7: Barrel, Campfire, Anvil, Enchanting Table, Sweet Berry Bush & Amethyst Geodes
  { id: BLOCK.BARREL, key: 'barrel', name: 'Fıçı (27 Bölmeli Depo)', solid: true, opaque: true, interactive: 'barrel', hardness: 2.5, preferredTool: 'axe', material: 'wood', tiles: [TILE.BARREL_TOP, TILE.BARREL_SIDE, TILE.SPRUCE_PLANKS], inCreative: true },
  { id: BLOCK.CAMPFIRE, key: 'campfire', name: 'Kamp Ateşi (Et Pişirir)', solid: true, opaque: false, shape: 'campfire', interactive: 'campfire', light: 15, contactDamage: 1, hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.CAMPFIRE_FIRE, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_ASH], inCreative: true },
  { id: BLOCK.CAMPFIRE_UNLIT, key: 'campfire_unlit', name: 'Sönmüş Kamp Ateşi', solid: true, opaque: false, shape: 'campfire', interactive: 'campfire', hardness: 2.0, preferredTool: 'axe', dropId: BLOCK.CAMPFIRE, material: 'wood', tiles: [TILE.CAMPFIRE_ASH, TILE.CAMPFIRE_LOG, TILE.CAMPFIRE_ASH], inCreative: false },
  { id: BLOCK.ANVIL, key: 'anvil', name: 'Örs (Ekipman Onarımı)', solid: true, opaque: false, shape: 'anvil', interactive: 'anvil', gravity: true, hardness: 5.0, preferredTool: 'pickaxe', minTier: 1, material: 'metal', tiles: [TILE.ANVIL_TOP, TILE.IRON_BLOCK, TILE.ANVIL_TOP], inCreative: true },
  { id: BLOCK.ENCHANTING_TABLE, key: 'enchanting_table', name: 'Büyü Masası (Kitaplık Gücü)', solid: true, opaque: false, shape: 'enchanting_table', interactive: 'enchanting', light: 7, hardness: 5.0, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.ENCHANT_TOP, TILE.ENCHANT_SIDE, TILE.OBSIDIAN], inCreative: true },
  { id: BLOCK.SWEET_BERRY_BUSH, key: 'sweet_berry_bush', name: 'Tatlı Orman Meyvesi Çalısı', solid: false, opaque: false, cross: true, interactive: 'berry_bush', contactDamage: 1, hardness: 0.05, preferredTool: 'none', material: 'grass', tiles: [TILE.SWEET_BERRY_BUSH, TILE.SWEET_BERRY_BUSH, TILE.SWEET_BERRY_BUSH], inCreative: true },
  { id: BLOCK.AMETHYST_BLOCK, key: 'amethyst_block', name: 'Ametist Bloğu', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'glass', tiles: [TILE.AMETHYST_BLOCK, TILE.AMETHYST_BLOCK, TILE.AMETHYST_BLOCK], inCreative: true },
  { id: BLOCK.AMETHYST_CLUSTER, key: 'amethyst_cluster', name: 'Ametist Kümesi', solid: false, opaque: false, cross: true, light: 5, hardness: 1.5, preferredTool: 'pickaxe', material: 'glass', tiles: [TILE.AMETHYST_CLUSTER, TILE.AMETHYST_CLUSTER, TILE.AMETHYST_CLUSTER], inCreative: true },
  // Wave 8: Cauldrons (`cauldrons.rs`) & Jukebox (`jukebox.rs`)
  { id: BLOCK.CAULDRON_EMPTY, key: 'cauldron', name: 'Kazan (Su / Lav Doldurulabilir)', solid: true, opaque: false, shape: 'cauldron', interactive: 'cauldron', hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, material: 'metal', tiles: [TILE.CAULDRON_TOP, TILE.CAULDRON_SIDE, TILE.CAULDRON_TOP], inCreative: true },
  { id: BLOCK.CAULDRON_WATER, key: 'water_cauldron', name: 'Su Dolu Kazan', solid: true, opaque: false, shape: 'cauldron', interactive: 'cauldron', fallDamageMult: 0.4, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.CAULDRON_EMPTY, material: 'metal', tiles: [TILE.CAULDRON_TOP, TILE.CAULDRON_SIDE, TILE.CAULDRON_TOP], inCreative: false },
  { id: BLOCK.CAULDRON_LAVA, key: 'lava_cauldron', name: 'Lav Dolu Kazan', solid: true, opaque: false, shape: 'cauldron', interactive: 'cauldron', light: 15, contactDamage: 3, hardness: 2.0, preferredTool: 'pickaxe', minTier: 1, dropId: BLOCK.CAULDRON_EMPTY, material: 'metal', tiles: [TILE.CAULDRON_TOP, TILE.CAULDRON_SIDE, TILE.CAULDRON_TOP], inCreative: false },
  { id: BLOCK.JUKEBOX, key: 'jukebox', name: 'Müzik Kutusu (Müzik Diski Çalar)', solid: true, opaque: true, interactive: 'jukebox', hardness: 2.0, preferredTool: 'axe', material: 'wood', tiles: [TILE.JUKEBOX_TOP, TILE.JUKEBOX_SIDE, TILE.OAK_PLANKS], inCreative: true },
  // Wave 9: Crying Obsidian, Respawn Anchor (`interact.rs`), Powder Snow (`powder_snow_collision.rs`), Note Block & Cake
  { id: BLOCK.CRYING_OBSIDIAN, key: 'crying_obsidian', name: 'Ağlayan Obsidyen', solid: true, opaque: true, light: 10, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, material: 'stone', tiles: [TILE.CRYING_OBSIDIAN, TILE.CRYING_OBSIDIAN, TILE.CRYING_OBSIDIAN], inCreative: true },
  { id: BLOCK.RESPAWN_ANCHOR_0, key: 'respawn_anchor', name: 'Yeniden Doğma Çapası (Nether)', solid: true, opaque: true, interactive: 'respawn_anchor', hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, material: 'stone', tiles: [TILE.RESPAWN_ANCHOR_TOP, TILE.RESPAWN_ANCHOR_SIDE_OFF, TILE.CRYING_OBSIDIAN], inCreative: true },
  { id: BLOCK.RESPAWN_ANCHOR_1, key: 'respawn_anchor_1', name: 'Yeniden Doğma Çapası (1/4)', solid: true, opaque: true, interactive: 'respawn_anchor', light: 3, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, dropId: BLOCK.RESPAWN_ANCHOR_0, material: 'stone', tiles: [TILE.RESPAWN_ANCHOR_TOP, TILE.RESPAWN_ANCHOR_SIDE_ON, TILE.CRYING_OBSIDIAN], inCreative: false },
  { id: BLOCK.RESPAWN_ANCHOR_2, key: 'respawn_anchor_2', name: 'Yeniden Doğma Çapası (2/4)', solid: true, opaque: true, interactive: 'respawn_anchor', light: 7, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, dropId: BLOCK.RESPAWN_ANCHOR_0, material: 'stone', tiles: [TILE.RESPAWN_ANCHOR_TOP, TILE.RESPAWN_ANCHOR_SIDE_ON, TILE.CRYING_OBSIDIAN], inCreative: false },
  { id: BLOCK.RESPAWN_ANCHOR_3, key: 'respawn_anchor_3', name: 'Yeniden Doğma Çapası (3/4)', solid: true, opaque: true, interactive: 'respawn_anchor', light: 11, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, dropId: BLOCK.RESPAWN_ANCHOR_0, material: 'stone', tiles: [TILE.RESPAWN_ANCHOR_TOP, TILE.RESPAWN_ANCHOR_SIDE_ON, TILE.CRYING_OBSIDIAN], inCreative: false },
  { id: BLOCK.RESPAWN_ANCHOR_4, key: 'respawn_anchor_4', name: 'Yeniden Doğma Çapası (4/4)', solid: true, opaque: true, interactive: 'respawn_anchor', light: 15, hardness: 12.0, preferredTool: 'pickaxe', minTier: 4, dropId: BLOCK.RESPAWN_ANCHOR_0, material: 'stone', tiles: [TILE.RESPAWN_ANCHOR_TOP, TILE.RESPAWN_ANCHOR_SIDE_ON, TILE.CRYING_OBSIDIAN], inCreative: false },
  { id: BLOCK.POWDER_SNOW, key: 'powder_snow', name: 'Toz Kar (Deri Çizmeyle Yürünür)', solid: true, opaque: false, shape: 'powder_snow', fallDamageMult: 0, hardness: 0.25, preferredTool: 'none', dropCount: 0, material: 'snow', tiles: [TILE.POWDER_SNOW, TILE.POWDER_SNOW, TILE.POWDER_SNOW], inCreative: true },
  { id: BLOCK.NOTE_BLOCK, key: 'note_block', name: 'Nota Bloğu (2 Oktav Enstrüman)', solid: true, opaque: true, interactive: 'note_block', hardness: 0.8, preferredTool: 'axe', material: 'wood', tiles: [TILE.NOTE_BLOCK, TILE.NOTE_BLOCK, TILE.NOTE_BLOCK], inCreative: true },
  { id: BLOCK.CAKE, key: 'cake', name: 'Pasta (7 Dilim Doyurur)', solid: true, opaque: false, shape: 'cake', interactive: 'cake', hardness: 0.5, preferredTool: 'none', dropCount: 0, material: 'wool', tiles: [TILE.CAKE_TOP, TILE.CAKE_SIDE, TILE.OAK_PLANKS], inCreative: true },
  // Wave 10: Dripstone (`speleothem.rs`), Copper Bulb, Target Block & Flower Pots
  { id: BLOCK.DRIPSTONE_BLOCK, key: 'dripstone_block', name: 'Damla Taşı Bloğu', solid: true, opaque: true, hardness: 1.5, preferredTool: 'pickaxe', minTier: 1, material: 'stone', tiles: [TILE.DRIPSTONE_BLOCK, TILE.DRIPSTONE_BLOCK, TILE.DRIPSTONE_BLOCK], inCreative: true },
  { id: BLOCK.POINTED_DRIPSTONE, key: 'pointed_dripstone', name: 'Sivri Damla Taşı (Sarkıt / Dikit)', solid: false, opaque: false, cross: true, fallDamageMult: 2.5, hardness: 1.5, preferredTool: 'pickaxe', material: 'stone', tiles: [TILE.POINTED_DRIPSTONE, TILE.POINTED_DRIPSTONE, TILE.POINTED_DRIPSTONE], inCreative: true },
  { id: BLOCK.COPPER_BULB_OFF, key: 'copper_bulb', name: 'Bakır Ampul (T-Flip-Flop)', solid: true, opaque: true, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, material: 'metal', tiles: [TILE.COPPER_BULB_OFF, TILE.COPPER_BULB_OFF, TILE.COPPER_BULB_OFF], inCreative: true },
  { id: BLOCK.COPPER_BULB_ON, key: 'copper_bulb_on', name: 'Yanan Bakır Ampul', solid: true, opaque: true, light: 15, hardness: 3.0, preferredTool: 'pickaxe', minTier: 2, dropId: BLOCK.COPPER_BULB_OFF, material: 'metal', tiles: [TILE.COPPER_BULB_ON, TILE.COPPER_BULB_ON, TILE.COPPER_BULB_ON], inCreative: false },
  { id: BLOCK.TARGET_BLOCK, key: 'target', name: 'Hedef Bloğu (Okçuluk Kızıltaş Sensörü)', solid: true, opaque: true, hardness: 0.5, preferredTool: 'hoe', material: 'grass', tiles: [TILE.TARGET_BLOCK_TOP, TILE.TARGET_BLOCK_SIDE, TILE.TARGET_BLOCK_TOP], inCreative: true },
  { id: BLOCK.FLOWER_POT, key: 'flower_pot', name: 'Çiçek Saksısı', solid: true, opaque: false, shape: 'flower_pot', interactive: 'flower_pot', hardness: 0.05, preferredTool: 'none', material: 'stone', tiles: [TILE.FLOWER_POT, TILE.FLOWER_POT, TILE.FLOWER_POT], inCreative: true },
  { id: BLOCK.POTTED_POPPY, key: 'potted_poppy', name: 'Saksıda Gelincik', solid: true, opaque: false, shape: 'flower_pot', interactive: 'flower_pot', hardness: 0.05, preferredTool: 'none', dropId: BLOCK.FLOWER_POT, material: 'stone', tiles: [TILE.FLOWER_POT, TILE.FLOWER_POT, TILE.FLOWER_POT], inCreative: false },
  { id: BLOCK.POTTED_DANDELION, key: 'potted_dandelion', name: 'Saksıda Karahindiba', solid: true, opaque: false, shape: 'flower_pot', interactive: 'flower_pot', hardness: 0.05, preferredTool: 'none', dropId: BLOCK.FLOWER_POT, material: 'stone', tiles: [TILE.FLOWER_POT, TILE.FLOWER_POT, TILE.FLOWER_POT], inCreative: false },
  { id: BLOCK.POTTED_CACTUS, key: 'potted_cactus', name: 'Saksıda Kaktüs', solid: true, opaque: false, shape: 'flower_pot', interactive: 'flower_pot', hardness: 0.05, preferredTool: 'none', dropId: BLOCK.FLOWER_POT, material: 'stone', tiles: [TILE.FLOWER_POT, TILE.FLOWER_POT, TILE.FLOWER_POT], inCreative: false },
  { id: BLOCK.POTTED_CHERRY, key: 'potted_cherry', name: 'Saksıda Kiraz Fidanı', solid: true, opaque: false, shape: 'flower_pot', interactive: 'flower_pot', hardness: 0.05, preferredTool: 'none', dropId: BLOCK.FLOWER_POT, material: 'stone', tiles: [TILE.FLOWER_POT, TILE.FLOWER_POT, TILE.FLOWER_POT], inCreative: false }
];

export function isWaterBlock(id: number): boolean {
  return id === BLOCK.WATER || id === BLOCK.FLOWING_WATER;
}

export function isLavaBlock(id: number): boolean {
  return id === BLOCK.LAVA || id === BLOCK.FLOWING_LAVA;
}

export const BLOCKS: BlockDef[] = [];
for (const b of RAW) BLOCKS[b.id] = b;

export const INVENTORY_BLOCKS: BlockDef[] = RAW.filter((b) => b.inCreative);

export function getBlock(id: number): BlockDef {
  return BLOCKS[id] || BLOCKS[0];
}

export function isValidBlockId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < BLOCKS.length && !!BLOCKS[id];
}
