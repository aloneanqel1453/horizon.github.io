import './styles.css';
import * as THREE from 'three';
import { HorizonBackdropScene } from './theme/horizonScene';
import { BLOCK, BlockDef, getBlock, isLavaBlock, isWaterBlock } from './world/blocks';
import {
  ALL_CREATIVE_ITEMS,
  ANY_PLANKS,
  CraftRecipe,
  ITEM,
  ItemStack,
  RECIPES,
  SMELT_RECIPES,
  VILLAGER_TRADES,
  computeBreakDuration,
  createStarterHotbar,
  getItemDef,
  isFuelItem,
  isPlankItem,
  resolveBlockDrop
} from './items/catalog';
import { buildVoxelAtlas } from './world/atlas';
import { WORLD_SEED, hash2D } from './world/noise';
import { DimensionId, WORLD_HEIGHT } from './world/terrainGen';
import { WorldManager } from './world/worldManager';
import { WeatherKind, WeatherParticleSystem } from './world/weatherParticles';
import { InputState, PlayerController, raycastVoxel } from './physics/playerPhysics';
import { FirstPersonHand, SKIN_SWATCHES, VoxelCharacter } from './entities/avatars';
import { ALL_MOB_SPECIES, MobSpecies, MobSystem } from './entities/mobSystem';
import { BoatSystem } from './entities/boatSystem';
import { ArmorStandSystem } from './entities/armorStandSystem';
import { ProjectileManager } from './entities/projectiles';
import { GlobalHorizonServer, RemotePlayerState, sanitizeHexColor, sanitizePlayerName } from './net/globalServer';
import { SoundEngine } from './audio/soundEngine';
import { getHudSprites, makePingBarsElement, renderBarIcons } from './ui/hudIcons';
import {
  ALL_SKILL_IDS,
  TENSURA_SKILLS,
  TOP_50_TENSURA_CHARACTERS,
  TensuraFaction,
  TensuraSkillId,
  TensuraSystem
} from './rpg/tensuraSystem';
import { TensuraVfxManager } from './rpg/tensuraVfx';

type UIMode = 'launcher' | 'playing' | 'inventory' | 'chat' | 'paused' | 'settings' | 'tensura' | 'dead';
type InvTab = 'craft' | 'furnace' | 'chest' | 'trade' | 'catalog';
type ArmorSlotKind = 'head' | 'chest' | 'legs' | 'feet';

const SKIN_LABELS: Record<string, string> = {
  '#38bdf8': 'Steve',
  '#6b4bff': 'Horizon',
  '#4ade80': 'Alex',
  '#ef4444': 'Noor',
  '#f59e0b': 'Sunny',
  '#ec4899': 'Ari',
  '#8b5cf6': 'Makena',
  '#e2e8f0': 'Kai'
};

const ARMOR_ORDER: ArmorSlotKind[] = ['head', 'chest', 'legs', 'feet'];
const ARMOR_SHORT_LABELS: Record<ArmorSlotKind, string> = {
  head: 'Miğfer',
  chest: 'Zırh',
  legs: 'Pant.',
  feet: 'Çizme'
};

// --- DOM Elements ---
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const sceneCanvas = document.getElementById('horizon-scene-canvas') as HTMLCanvasElement;
const screenTint = document.getElementById('screen-tint') as HTMLDivElement;

const launcherOverlay = document.getElementById('launcher-overlay') as HTMLDivElement;
const hudEl = document.getElementById('hud') as HTMLDivElement;
const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
const skinNameLabel = document.getElementById('skin-name-label') as HTMLElement;
const skinSwatchesEl = document.getElementById('skin-swatches') as HTMLDivElement;
const lobbyNetDot = document.getElementById('lobby-net-dot') as HTMLSpanElement;
const lobbyOnlineText = document.getElementById('lobby-online-text') as HTMLSpanElement;
const lobbyPingBadge = document.getElementById('lobby-ping-badge') as HTMLSpanElement;
const lobbyPlayersCount = document.getElementById('lobby-players-count') as HTMLSpanElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const openSettingsBtn = document.getElementById('open-settings-btn') as HTMLButtonElement;
const lnavSettingsBtn = document.getElementById('lnav-settings-btn') as HTMLButtonElement;

const f3Panel = document.getElementById('f3-panel') as HTMLPreElement;
const hudFpsVal = document.getElementById('hud-fps-val') as HTMLSpanElement;
const hudPingVal = document.getElementById('hud-ping-val') as HTMLSpanElement;
const hudRpgPill = document.getElementById('hud-rpg-pill') as HTMLButtonElement;
const hudFsBtn = document.getElementById('hud-fs-btn') as HTMLButtonElement | null;
const tensuraVoiceBanner = document.getElementById('tensura-voice-banner') as HTMLDivElement;
const tensuraVoiceTag = document.getElementById('tensura-voice-tag') as HTMLDivElement;
const tensuraVoiceText = document.getElementById('tensura-voice-text') as HTMLDivElement;

const bossBarWrap = document.getElementById('boss-bar-wrap') as HTMLDivElement;
const bossBarTitle = document.getElementById('boss-bar-title') as HTMLDivElement;
const bossBarFill = document.getElementById('boss-bar-fill') as HTMLDivElement;

const attackCooldownWrap = document.getElementById('attack-cooldown-wrap') as HTMLDivElement;
const attackCooldownFill = document.getElementById('attack-cooldown-fill') as HTMLDivElement;

const tabListEl = document.getElementById('tab-list') as HTMLDivElement;
const tabRowsEl = document.getElementById('tab-rows') as HTMLDivElement;

const chatMessagesEl = document.getElementById('chat-messages') as HTMLDivElement;
const chatInputWrap = document.getElementById('chat-input-wrap') as HTMLDivElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const chatSendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
const chatCloseBtn = document.getElementById('chat-close-btn') as HTMLButtonElement;
const subtitlesBox = document.getElementById('subtitles-box') as HTMLDivElement;

const mobileControlsEl = document.getElementById('mobile-controls') as HTMLDivElement;
const mobileLookZone = document.getElementById('mobile-look-zone') as HTMLDivElement;
const mobBtnRpg = document.getElementById('mob-btn-rpg') as HTMLButtonElement;
const mobBtnInv = document.getElementById('mob-btn-inv') as HTMLButtonElement;
const mobBtnSwap = document.getElementById('mob-btn-swap') as HTMLButtonElement;
const mobBtnDrop = document.getElementById('mob-btn-drop') as HTMLButtonElement;
const mobBtnChat = document.getElementById('mob-btn-chat') as HTMLButtonElement;
const mobBtnMode = document.getElementById('mob-btn-mode') as HTMLButtonElement;
const mobBtnCam = document.getElementById('mob-btn-cam') as HTMLButtonElement;
const mobBtnFs = document.getElementById('mob-btn-fs') as HTMLButtonElement;
const mobBtnPause = document.getElementById('mob-btn-pause') as HTMLButtonElement;
const mobileJoystickZone = document.getElementById('mobile-joystick-zone') as HTMLDivElement;
const mobileJoystickBase = document.getElementById('mobile-joystick-base') as HTMLDivElement;
const mobileJoystickKnob = document.getElementById('mobile-joystick-knob') as HTMLDivElement;
const mobBtnSkill = document.getElementById('mob-btn-skill') as HTMLButtonElement;
const mobSkillTitle = document.getElementById('mob-skill-title') as HTMLSpanElement;
const mobBtnBreak = document.getElementById('mob-btn-break') as HTMLButtonElement;
const mobBtnPlace = document.getElementById('mob-btn-place') as HTMLButtonElement;
const mobPlaceTitle = document.getElementById('mob-place-title') as HTMLSpanElement;
const mobPlaceSub = document.getElementById('mob-place-sub') as HTMLSpanElement;
const mobBtnCrouch = document.getElementById('mob-btn-crouch') as HTMLButtonElement;
const mobCrouchTitle = document.getElementById('mob-crouch-title') as HTMLSpanElement;
const mobBtnJump = document.getElementById('mob-btn-jump') as HTMLButtonElement;
const invDesktopHint = document.getElementById('inv-desktop-hint') as HTMLDivElement;
const invTouchBar = document.getElementById('inv-touch-bar') as HTMLDivElement;
const invTouchHeld = document.getElementById('inv-touch-held') as HTMLDivElement;

// Automatic Touch Device Detection: check mobile UA or primary coarse pointer first so Windows Ink / 2-in-1 desktop PCs don't show mobile HUD until actually touched!
let isTouchDevice =
  /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '') ||
  window.matchMedia?.('(pointer: coarse)').matches ||
  (window.matchMedia?.('(hover: none)').matches && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)));
let lastTouchTimestamp = 0;
let wasPointerLocked = false;
let mobileSneakLocked = false;
let mobileInvMode: 'normal' | 'quick' | 'split' = 'normal';
let pendingLookYaw = 0;
let pendingLookPitch = 0;

const hotbarTooltip = document.getElementById('hotbar-tooltip') as HTMLDivElement;
const survivalVitalsEl = document.getElementById('survival-vitals') as HTMLDivElement;
const heartsBar = document.getElementById('hearts-bar') as HTMLDivElement;
const hungerBar = document.getElementById('hunger-bar') as HTMLDivElement;
const armorBar = document.getElementById('armor-bar') as HTMLDivElement;
const airBar = document.getElementById('air-bar') as HTMLDivElement;
const xpLevelNum = document.getElementById('xp-level-num') as HTMLSpanElement;
const xpBarFill = document.getElementById('xp-bar-fill') as HTMLDivElement;
const locatorPipsEl = document.getElementById('locator-pips') as HTMLDivElement;
const offhandHudWrap = document.getElementById('offhand-hud-wrap') as HTMLDivElement;
const hotbarEl = document.getElementById('hotbar') as HTMLDivElement;

const cursorItemEl = document.getElementById('cursor-item') as HTMLDivElement;
const cursorItemImg = document.getElementById('cursor-item-img') as HTMLImageElement;
const cursorItemCount = document.getElementById('cursor-item-count') as HTMLSpanElement;

const invModal = document.getElementById('inventory-modal') as HTMLDivElement;
const tabBtnCraft = document.getElementById('tab-btn-craft') as HTMLButtonElement;
const tabBtnFurnace = document.getElementById('tab-btn-furnace') as HTMLButtonElement;
const tabBtnChest = document.getElementById('tab-btn-chest') as HTMLButtonElement;
const tabBtnTrade = document.getElementById('tab-btn-trade') as HTMLButtonElement;
const tabBtnCatalog = document.getElementById('tab-btn-catalog') as HTMLButtonElement;
const invStationPanel = document.getElementById('inv-station-panel') as HTMLDivElement;
const invCraftFilters = document.getElementById('inv-craft-filters') as HTMLDivElement | null;
const invSearch = document.getElementById('inv-search') as HTMLInputElement;
const invFsBtn = document.getElementById('inv-fs-btn') as HTMLButtonElement | null;
const invCloseBtn = document.getElementById('inv-close-btn') as HTMLButtonElement;
const invGrid = document.getElementById('inv-grid') as HTMLDivElement;
const invArmorLabel = document.getElementById('inv-armor-label') as HTMLSpanElement;
const armorSlotsGrid = document.getElementById('armor-slots-grid') as HTMLDivElement;
const modalOffhandWrap = document.getElementById('modal-offhand-wrap') as HTMLDivElement;
const backpackGrid = document.getElementById('backpack-grid') as HTMLDivElement;
const modalHotbarGrid = document.getElementById('modal-hotbar-grid') as HTMLDivElement;

const deathModal = document.getElementById('death-modal') as HTMLDivElement;
const deathReasonEl = document.getElementById('death-reason') as HTMLParagraphElement;
const respawnBtn = document.getElementById('respawn-btn') as HTMLButtonElement;

const pauseModal = document.getElementById('pause-modal') as HTMLDivElement;
const pauseServerStatus = document.getElementById('pause-server-status') as HTMLParagraphElement;
const resumeBtn = document.getElementById('resume-btn') as HTMLButtonElement;
const pauseInvBtn = document.getElementById('pause-inv-btn') as HTMLButtonElement;
const spawnTpBtn = document.getElementById('spawn-tp-btn') as HTMLButtonElement;
const pauseGamemodeBtn = document.getElementById('pause-gamemode-btn') as HTMLButtonElement;
const pauseSettingsBtn = document.getElementById('pause-settings-btn') as HTMLButtonElement;
const pauseFsBtn = document.getElementById('pause-fs-btn') as HTMLButtonElement | null;
const backTitleBtn = document.getElementById('back-title-btn') as HTMLButtonElement;

const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const settingsDoneBtn = document.getElementById('settings-done-btn') as HTMLButtonElement;
const optRenderDist = document.getElementById('opt-render-dist') as HTMLInputElement;
const valRenderDist = document.getElementById('val-render-dist') as HTMLElement;
const optFov = document.getElementById('opt-fov') as HTMLInputElement;
const valFov = document.getElementById('val-fov') as HTMLElement;
const optSens = document.getElementById('opt-sens') as HTMLInputElement;
const valSens = document.getElementById('val-sens') as HTMLElement;
const optVol = document.getElementById('opt-vol') as HTMLInputElement;
const valVol = document.getElementById('val-vol') as HTMLElement;
const optSubtitlesBtn = document.getElementById('opt-subtitles-btn') as HTMLButtonElement;
const optSprintMode = document.getElementById('opt-sprint-mode') as HTMLButtonElement | null;
const optAutofsLock = document.getElementById('opt-autofs-lock') as HTMLButtonElement | null;
const optMobScale = document.getElementById('opt-mob-scale') as HTMLInputElement;
const valMobScale = document.getElementById('val-mob-scale') as HTMLElement;
const optMobAutojump = document.getElementById('opt-mob-autojump') as HTMLButtonElement;
const optMobLefthand = document.getElementById('opt-mob-lefthand') as HTMLButtonElement;

const tensuraModal = document.getElementById('tensura-modal') as HTMLDivElement;
const tensuraCloseBtn = document.getElementById('tensura-close-btn') as HTMLButtonElement;
const tensuraSageBadge = document.getElementById('tensura-sage-badge') as HTMLSpanElement;
const tensuraTitleText = document.getElementById('tensura-title-text') as HTMLHeadingElement;
const tsEpVal = document.getElementById('ts-ep-val') as HTMLElement;
const tsMpVal = document.getElementById('ts-mp-val') as HTMLElement;
const tsMpFill = document.getElementById('ts-mp-fill') as HTMLDivElement;
const tsBonusVal = document.getElementById('ts-bonus-val') as HTMLElement;
const tensuraMimicBtn = document.getElementById('tensura-mimic-btn') as HTMLButtonElement;
const tensuraCustomName = document.getElementById('tensura-custom-name') as HTMLInputElement;
const tensuraNameBtn = document.getElementById('tensura-name-btn') as HTMLButtonElement;
const tensuraSummonAllyBtn = document.getElementById('tensura-summon-ally-btn') as HTMLButtonElement;
const tensuraCharSearch = document.getElementById('tensura-char-search') as HTMLInputElement;
const tensuraFactionChips = document.getElementById('tensura-faction-chips') as HTMLDivElement;
const tensuraCharGrid = document.getElementById('tensura-char-grid') as HTMLDivElement;
const tensuraSkillList = document.getElementById('tensura-skill-list') as HTMLDivElement;
const sagePanelName = document.getElementById('sage-panel-name') as HTMLSpanElement;
const sageQuickChips = document.getElementById('sage-quick-chips') as HTMLDivElement;
const sageLog = document.getElementById('sage-log') as HTMLDivElement;
const sageInput = document.getElementById('sage-input') as HTMLInputElement;
const sageAskBtn = document.getElementById('sage-ask-btn') as HTMLButtonElement;

// --- Performance & Mobile Preferences ---
type PerfMode = 'turbo' | 'auto' | 'perf' | 'high';
const defaultPerfMode: PerfMode = isTouchDevice ? 'auto' : 'turbo';
let perfMode: PerfMode = (localStorage.getItem('horizon_perf_mode_v3') as PerfMode) || defaultPerfMode;
if (perfMode !== 'turbo' && perfMode !== 'auto' && perfMode !== 'perf' && perfMode !== 'high') {
  perfMode = defaultPerfMode;
}
let dynamicDprScale = 1.0;

let mobBtnScale = 1.0;
let mobAutoJump = true;
let mobLeftHanded = false;
try {
  const mp = JSON.parse(localStorage.getItem('horizon_mob_prefs_v1') || '{}');
  if (typeof mp.scale === 'number' && mp.scale >= 0.85 && mp.scale <= 1.3) mobBtnScale = mp.scale;
  if (typeof mp.autoJump === 'boolean') mobAutoJump = mp.autoJump;
  if (typeof mp.leftHand === 'boolean') mobLeftHanded = mp.leftHand;
} catch {
  // Ignore private-mode storage errors
}

function saveMobilePrefs() {
  try {
    localStorage.setItem(
      'horizon_mob_prefs_v1',
      JSON.stringify({ scale: mobBtnScale, autoJump: mobAutoJump, leftHand: mobLeftHanded })
    );
  } catch {
    // Ignore
  }
}

function applyMobilePrefsToDom() {
  document.documentElement.style.setProperty('--mob-scale', String(mobBtnScale));
  document.body.classList.toggle('mob-left-handed', mobLeftHanded);
  if (optMobScale) optMobScale.value = String(Math.round(mobBtnScale * 100));
  if (valMobScale) valMobScale.textContent = `${Math.round(mobBtnScale * 100)}%`;
  if (optMobAutojump) {
    optMobAutojump.textContent = `Oto-Zıpla: ${mobAutoJump ? 'Açık' : 'Kapalı'}`;
    optMobAutojump.classList.toggle('active', mobAutoJump);
  }
  if (optMobLefthand) {
    optMobLefthand.textContent = `Solak Düzen: ${mobLeftHanded ? 'Açık' : 'Kapalı'}`;
    optMobLefthand.classList.toggle('active', mobLeftHanded);
  }
}
applyMobilePrefsToDom();

function computeTargetPixelRatio(): number {
  const hw = window.devicePixelRatio || 1;
  if (perfMode === 'perf') return Math.min(hw, 0.85);
  if (perfMode === 'turbo') return Math.min(hw, 1.0);
  if (perfMode === 'high') return Math.min(hw, isTouchDevice ? 1.65 : 1.85);
  return Math.max(0.80, Math.min(hw, isTouchDevice ? 1.25 : 1.35) * dynamicDprScale);
}

function pulseHaptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Ignore browsers without vibration support
  }
}

// --- Persistent Player Identity ---
const savedName = sanitizePlayerName(localStorage.getItem('horizon_player_name'), `Gezgin_${Math.floor(1000 + Math.random() * 8999)}`);
let selectedColor = sanitizeHexColor(localStorage.getItem('horizon_player_color'), SKIN_SWATCHES[0]);
nameInput.value = savedName;
skinNameLabel.textContent = SKIN_LABELS[selectedColor.toLowerCase()] || 'Steve';

function getCleanName(): string {
  return sanitizePlayerName(nameInput.value, savedName);
}

// --- Backdrop, Audio, HUD Sprites & WebGL2 Renderer ---
const backdrop = new HorizonBackdropScene(sceneCanvas);
const sound = new SoundEngine();
const hudSprites = getHudSprites();

const renderer = new THREE.WebGLRenderer({
  canvas: gameCanvas,
  antialias: false,
  stencil: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(computeTargetPixelRatio());
renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x78a7ff);
scene.background = skyColor;
const fog = new THREE.Fog(0x78a7ff, 52, 114);
scene.fog = fog;

const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.08, 340);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemiLight = new THREE.HemisphereLight(0xe4f0ff, 0x627052, 0.86);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff8eb, 0.98);
sunLight.position.set(60, 110, 40);
scene.add(sunLight);

function makeCelestialPixelTex(kind: 'sun' | 'moon'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      const d = Math.max(dx, dy);
      if (kind === 'sun') {
        ctx.fillStyle =
          d <= 2.6 ? '#ffffff' : d <= 4.6 ? '#fef9c3' : d <= 6.2 ? '#fde047' : '#f59e0b';
      } else {
        const crater =
          (x >= 3 && x <= 5 && y >= 4 && y <= 6) ||
          (x >= 9 && x <= 12 && y >= 8 && y <= 11) ||
          (x >= 5 && x <= 7 && y >= 10 && y <= 12);
        ctx.fillStyle =
          d >= 6.8 ? '#94a3b8' : crater ? '#94a3b8' : d <= 3.5 ? '#f8fafc' : '#dbeafe';
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const celestialGroup = new THREE.Group();
const skyDomeGeo = new THREE.SphereGeometry(235, 20, 12);
{
  const posAttr = skyDomeGeo.attributes.position;
  const cols = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const ny = Math.max(-1, Math.min(1, posAttr.getY(i) / 235));
    const horizon = 1 - Math.min(1, Math.abs(ny) * 1.35);
    const rM = 0.78 + horizon * 0.30;
    const gM = 0.84 + horizon * 0.24;
    const bM = 0.96 + horizon * 0.10;
    cols[i * 3] = rM;
    cols[i * 3 + 1] = gM;
    cols[i * 3 + 2] = bM;
  }
  skyDomeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}
const skyDomeMat = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false
});
const skyDomeMesh = new THREE.Mesh(skyDomeGeo, skyDomeMat);
skyDomeMesh.renderOrder = -10;

const sunMesh = new THREE.Mesh(
  new THREE.BoxGeometry(16, 16, 16),
  new THREE.MeshBasicMaterial({ map: makeCelestialPixelTex('sun'), fog: false, depthWrite: false })
);
sunMesh.renderOrder = -5;
const moonMesh = new THREE.Mesh(
  new THREE.BoxGeometry(12, 12, 12),
  new THREE.MeshBasicMaterial({ map: makeCelestialPixelTex('moon'), fog: false, depthWrite: false })
);
moonMesh.renderOrder = -5;
celestialGroup.add(skyDomeMesh, sunMesh, moonMesh);
scene.add(celestialGroup);

// --- Build Atlas, World, Physics, Projectiles & Entities ---
const atlas = buildVoxelAtlas();
const world = new WorldManager(scene, atlas.texture);
world.ensureSpawnAreaSync();

gameCanvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
});
gameCanvas.addEventListener('webglcontextrestored', () => {
  atlas.texture.needsUpdate = true;
  localAvatar.refreshGpuTextures();
  fpHand.refreshGpuTextures();
  for (const av of remoteAvatars.values()) av.refreshGpuTextures();
  world.ensureAreaSyncAround(player.x, player.z);
  syncViewportSize();
});

const projectiles = new ProjectileManager(scene);

const player = new PlayerController();
player.x = 0.5;
player.z = 7.5;
player.y = world.getSafeSurfaceY(player.x, player.z);
player.onStep = (mat) => {
  if (world.getBlock(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z)) === BLOCK.AMETHYST_BLOCK) {
    sound.playAmethystChime();
  }
  sound.playStep(mat);
};

// Target Block Selection Wireframe Box
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
const highlightMat = new THREE.LineBasicMaterial({ color: 0x0a0a0f, transparent: true, opacity: 0.72 });
const highlightBox = new THREE.LineSegments(highlightGeo, highlightMat);
highlightBox.visible = false;
scene.add(highlightBox);

const fpHand = new FirstPersonHand(atlas.texture, selectedColor);
fpHand.setLeftHanded(mobLeftHanded);
camera.add(fpHand.group);

let localAvatar = new VoxelCharacter(getCleanName(), selectedColor, atlas.texture, false);
localAvatar.root.visible = false;
scene.add(localAvatar.root);

const mobs = new MobSystem(scene, atlas.texture);
const tensura = new TensuraSystem();
const tensuraVfx = new TensuraVfxManager(scene);
let voiceBannerTimer = 0;
let urielShieldTimer = 0;

function showVoiceOfWorldBanner(tag: string, message: string) {
  if (tensuraVoiceTag) tensuraVoiceTag.textContent = tag;
  if (tensuraVoiceText) tensuraVoiceText.textContent = message;
  tensuraVoiceBanner?.classList.remove('hidden');
  voiceBannerTimer = 4.5;
}

function appendSageMessage(role: 'user' | 'sage', text: string) {
  if (!sageLog) return;
  const row = document.createElement('div');
  row.className = `sage-msg ${role}`;
  row.textContent = role === 'user' ? `Sen: ${text}` : text;
  sageLog.appendChild(row);
  while (sageLog.children.length > 24) sageLog.removeChild(sageLog.firstChild!);
  sageLog.scrollTop = sageLog.scrollHeight;
}

tensura.onVoiceAnnouncement = (tag: string, message: string) => {
  showVoiceOfWorldBanner(tag, message);
  appendSageMessage('sage', `${tag} ${message}`);
  pushChat({ sender: tag.replace(/[«»]/g, '').trim(), color: '#38bdf8', text: message, system: true });
  sound.playAmethystChime();
};

tensura.onAutoHealPlayer = (amount: number) => {
  if (uiMode !== 'dead' && health > 0 && health < 20) {
    health = Math.min(20, health + amount);
    renderVitalsAndXp();
  }
};

const boats = new BoatSystem(scene);
boats.onToast = (text, color) => pushChat({ sender: 'Horizon', color: color || '#7dd3fc', text, system: true });
const armorStands = new ArmorStandSystem(scene, atlas.texture);
armorStands.ensureShowcaseStand(world);
armorStands.onToast = (text, color) => pushChat({ sender: 'Zırh Askısı', color: color || '#fde047', text, system: true });
const weatherSys = new WeatherParticleSystem(scene);

// --- Directional Audio Subtitles ---
let subtitlesEnabled = localStorage.getItem('horizon_subtitles') !== '0';
const activeSubtitles = new Map<string, { el: HTMLDivElement; dirEl: HTMLSpanElement; exp: number }>();

function updateSubtitleButton() {
  optSubtitlesBtn.textContent = subtitlesEnabled ? 'Açık' : 'Kapalı';
  optSubtitlesBtn.classList.toggle('active', subtitlesEnabled);
  if (!subtitlesEnabled) {
    subtitlesBox.innerHTML = '';
    subtitlesBox.classList.add('hidden');
    activeSubtitles.clear();
  }
}
updateSubtitleButton();

optSubtitlesBtn.addEventListener('click', () => {
  subtitlesEnabled = !subtitlesEnabled;
  localStorage.setItem('horizon_subtitles', subtitlesEnabled ? '1' : '0');
  updateSubtitleButton();
  sound.playClick();
});

function pushSubtitle(label: string, wx?: number, wz?: number) {
  if (!subtitlesEnabled || uiMode === 'launcher') return;
  let dirTxt = '·';
  if (wx !== undefined && wz !== undefined) {
    const dx = wx - player.x;
    const dz = wz - player.z;
    if (dx * dx + dz * dz > 28 * 28) return;
    if (dx * dx + dz * dz > 1.2) {
      const pan = sound.stereoPan(wx, wz, player.x, player.z, player.yaw);
      if (pan < -0.22) dirTxt = '<';
      else if (pan > 0.22) dirTxt = '>';
    }
  }
  const now = performance.now();
  let entry = activeSubtitles.get(label);
  if (!entry) {
    const row = document.createElement('div');
    row.className = 'subtitle-row';
    const dSpan = document.createElement('span');
    dSpan.className = 'subtitle-dir';
    const tSpan = document.createElement('span');
    tSpan.textContent = label;
    row.append(dSpan, tSpan);
    subtitlesBox.appendChild(row);
    entry = { el: row, dirEl: dSpan, exp: now + 2200 };
    activeSubtitles.set(label, entry);
  }
  entry.dirEl.textContent = dirTxt;
  entry.exp = now + 2200;
  subtitlesBox.classList.remove('hidden');
}

function pruneSubtitles(now: number) {
  if (activeSubtitles.size === 0) return;
  for (const [k, v] of activeSubtitles) {
    if (now >= v.exp) {
      v.el.remove();
      activeSubtitles.delete(k);
    }
  }
  if (activeSubtitles.size === 0) subtitlesBox.classList.add('hidden');
}

// Launcher Navigation Tabs
document.querySelectorAll<HTMLButtonElement>('.lnav-tab[data-ltab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.ltab || 'overview';
    document.querySelectorAll('.lnav-tab[data-ltab]').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('ltab-overview')?.classList.toggle('hidden', tab !== 'overview');
    document.getElementById('ltab-features')?.classList.toggle('hidden', tab !== 'features');
    document.getElementById('ltab-patch')?.classList.toggle('hidden', tab !== 'patch');
    sound.playClick();
  });
});

// Settings Category Tabs
document.querySelectorAll<HTMLButtonElement>('.stab-btn[data-stab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.stab || 'graphics';
    document.querySelectorAll('.stab-btn[data-stab]').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('stab-graphics')?.classList.toggle('hidden', tab !== 'graphics');
    document.getElementById('stab-audio')?.classList.toggle('hidden', tab !== 'audio');
    document.getElementById('stab-controls')?.classList.toggle('hidden', tab !== 'controls');
    sound.playClick();
  });
});

// Skin Swatches (8 Named Horizon Skins)
SKIN_SWATCHES.forEach((hex) => {
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'skin-swatch' + (hex.toLowerCase() === selectedColor.toLowerCase() ? ' active' : '');
  sw.style.background = hex;
  sw.title = SKIN_LABELS[hex.toLowerCase()] || 'Skin';
  sw.addEventListener('click', () => {
    selectedColor = hex;
    localStorage.setItem('horizon_player_color', hex);
    skinNameLabel.textContent = SKIN_LABELS[hex.toLowerCase()] || 'Steve';
    skinSwatchesEl.querySelectorAll('.skin-swatch').forEach((el) => el.classList.remove('active'));
    sw.classList.add('active');
    fpHand.setAccent(hex);
    server.updateIdentity(getCleanName(), selectedColor);
    sound.playClick();
  });
  skinSwatchesEl.appendChild(sw);
});

// ============================================================================
// SURVIVAL STATE, FULL CURSOR INVENTORY, 4-SLOT ARMOR, OFFHAND & CHESTS
// ============================================================================
let gameMode: 'survival' | 'creative' = 'survival';
let health = 20;
let hunger = 20;
let saturation = 5;
let hurtImmunity = 0;
let armorPoints = 0;
let airSupply = 16; // 8 bubbles * 2
let xpTotal = 0;
let xpLevel = 0;
let spawnPoint: {
  x: number;
  y: number;
  z: number;
  dim: DimensionId;
  bedPos?: [number, number, number];
  anchorPos?: [number, number, number];
} = {
  x: 0.5,
  y: 49.05,
  z: 7.5,
  dim: 'overworld'
};
let cinematicHudHidden = false;

const hotbar: Array<ItemStack | null> = createStarterHotbar();
const backpack: Array<ItemStack | null> = new Array(27).fill(null);
const armorSlots: Array<ItemStack | null> = [null, null, null, null]; // head, chest, legs, feet
let offhandSlot: ItemStack | null = { id: ITEM.SHIELD, count: 1 };
let cursorStack: ItemStack | null = null;

// Helpful starter supplies in backpack
backpack[0] = { id: BLOCK.OAK_LOG, count: 16 };
backpack[1] = { id: ITEM.COAL, count: 12 };
backpack[2] = { id: ITEM.FLINT_AND_STEEL, count: 1 };
backpack[3] = { id: ITEM.BUCKET_WATER, count: 1 };
backpack[4] = { id: ITEM.ENDER_PEARL, count: 4 };
backpack[5] = { id: ITEM.APPLE, count: 8 };
backpack[6] = { id: ITEM.BOAT_ITEM, count: 1 };
backpack[7] = { id: BLOCK.REDSTONE_DUST_OFF, count: 16 };
backpack[8] = { id: BLOCK.LEVER_OFF, count: 4 };
backpack[9] = { id: BLOCK.PISTON, count: 2 };
backpack[10] = { id: ITEM.IRON_HOE, count: 1 };
backpack[11] = { id: ITEM.IRON_SHOVEL, count: 1 };
backpack[12] = { id: ITEM.ELYTRA, count: 1 };
backpack[13] = { id: ITEM.FIREWORK_ROCKET, count: 16 };
backpack[14] = { id: ITEM.FISHING_ROD, count: 1 };
backpack[15] = { id: ITEM.BONE_MEAL, count: 16 };
backpack[16] = { id: ITEM.GOLDEN_CARROT, count: 8 };

let selectedSlot = 0;
let activeInvTab: InvTab = 'craft';
let usingCraftingTable = false;
let activeChestKey = '';

const CHEST_STORAGE_KEY = 'horizon_web_chests_v4_emerald';
const chestStorage = new Map<string, Array<ItemStack | null>>();

(function loadPersistedChests() {
  try {
    const raw = localStorage.getItem(CHEST_STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Array<ItemStack | null>>;
    for (const [k, arr] of Object.entries(obj)) {
      if (Array.isArray(arr)) {
        const clean = new Array<ItemStack | null>(27).fill(null);
        for (let i = 0; i < Math.min(27, arr.length); i++) {
          const s = arr[i];
          if (s && typeof s.id === 'number' && s.id > 0 && typeof s.count === 'number' && s.count > 0) {
            clean[i] = {
              id: s.id,
              count: Math.min(64, Math.floor(s.count)),
              damage: s.damage,
              ench: s.ench,
              loaded: s.loaded
            };
          }
        }
        chestStorage.set(k, clean);
      }
    }
  } catch {
    // Ignore malformed chest storage
  }
})();

function savePersistedChests(broadcastActive = true) {
  try {
    const out: Record<string, Array<ItemStack | null>> = {};
    for (const [k, v] of chestStorage.entries()) out[k] = v;
    localStorage.setItem(CHEST_STORAGE_KEY, JSON.stringify(out));
  } catch {
    // Ignore storage quota
  }
  if (broadcastActive && activeChestKey) {
    const cur = chestStorage.get(activeChestKey);
    if (cur) {
      server.broadcastWorldEvent({ t: 'chest', k: activeChestKey, s: cur });
    }
  }
}

function getOrPopulateChest(dim: DimensionId, wx: number, y: number, wz: number): Array<ItemStack | null> {
  const fullKey = `${dim}:${wx},${y},${wz}`;
  let slots = chestStorage.get(fullKey);
  if (!slots) {
    slots = new Array<ItemStack | null>(27).fill(null);
    // P1 #16 Fix: Only generate natural dungeon/village loot if this chest was NOT placed by a player!
    if (!world.hasPlayerPlacedBlockAt(dim, wx, y, wz)) {
      const r = hash2D(wx || 1, wz || 1, (y || 1) + 99);
      if (world.getBlock(wx, y, wz) === BLOCK.BARREL) {
        slots[0] = { id: ITEM.RAW_BEEF, count: 6 };
        slots[1] = { id: ITEM.SWEET_BERRIES, count: 8 };
        slots[2] = { id: ITEM.SPYGLASS, count: 1 };
        slots[3] = { id: ITEM.COAL, count: 8 };
        slots[4] = { id: ITEM.COPPER_INGOT, count: 6 };
        slots[5] = { id: ITEM.AMETHYST_SHARD, count: 4 };
      } else if (dim === 'overworld' && Math.abs(wx) <= 3 && wz <= -14 && wz >= -19) {
        // North Veldora Crystal Alcove Treasure Chest (0, floorY + 1, -16)
        slots[0] = { id: ITEM.MACE, count: 1 };
        slots[1] = { id: ITEM.WIND_CHARGE, count: 24 };
        slots[2] = { id: ITEM.DIAMOND_SPEAR, count: 1 };
        slots[3] = { id: ITEM.TOTEM_OF_UNDYING, count: 1 };
        slots[4] = { id: ITEM.GOLDEN_APPLE, count: 4 };
        slots[5] = { id: ITEM.AMETHYST_SHARD, count: 12 };
        slots[6] = { id: ITEM.DIAMOND, count: 5 };
        slots[7] = { id: ITEM.EMERALD, count: 10 };
      } else if (dim === 'overworld' && wx <= -15 && wx >= -21 && wz <= -11 && wz >= -17) {
        // West Monster Hunt Ring Supply Chest (-18, floorY + 1, -14)
        slots[0] = { id: ITEM.CROSSBOW, count: 1, loaded: true, ench: 2 };
        slots[1] = { id: ITEM.ARROW, count: 32 };
        slots[2] = { id: ITEM.DIAMOND_SWORD, count: 1, ench: 1 };
        slots[3] = { id: ITEM.BONE, count: 12 };
        slots[4] = { id: ITEM.COOKED_STEAK, count: 8 };
        slots[5] = { id: ITEM.GOLDEN_APPLE, count: 2 };
        slots[6] = { id: ITEM.SPYGLASS, count: 1 };
        slots[7] = { id: ITEM.MUSIC_DISC, count: 1 };
      } else {
        slots[0] = { id: ITEM.IRON_INGOT, count: 4 + Math.floor(r * 6) };
        slots[1] = { id: ITEM.BREAD, count: 5 };
        slots[2] = { id: ITEM.EMERALD, count: 2 + Math.floor(r * 4) };
        slots[3] = { id: r > 0.5 ? ITEM.DIAMOND : ITEM.GOLDEN_APPLE, count: r > 0.5 ? 2 : 1 };
        slots[4] = { id: BLOCK.OBSIDIAN, count: 6 };
        slots[5] = { id: ITEM.ARROW, count: 16 };
        slots[6] = { id: ITEM.BONE, count: 5 };
        slots[7] = { id: ITEM.IRON_CHESTPLATE, count: 1 };
      }
    }
    chestStorage.set(fullKey, slots);
    savePersistedChests(false);
  }
  return slots;
}

const equippedArmorTuple: [number, number, number, number] = [0, 0, 0, 0];

function getEquippedArmorTuple(): [number, number, number, number] {
  equippedArmorTuple[0] = armorSlots[0]?.id || 0;
  equippedArmorTuple[1] = armorSlots[1]?.id || 0;
  equippedArmorTuple[2] = armorSlots[2]?.id || 0;
  equippedArmorTuple[3] = armorSlots[3]?.id || 0;
  return equippedArmorTuple;
}

function recomputeArmorPoints() {
  let total = tensura.getNaturalArmorBonus();
  for (const st of armorSlots) {
    if (st && st.id > 0) {
      total += getItemDef(st.id).armorPoints || 0;
    }
  }
  armorPoints = Math.min(20, total);
  player.wearingLeatherBoots = armorSlots[3]?.id === ITEM.LEATHER_BOOTS;
  invArmorLabel.textContent = `${armorPoints} Zırh`;
  const tup = getEquippedArmorTuple();
  const enchMask =
    (armorSlots[0]?.ench ? 1 : 0) |
    (armorSlots[1]?.ench ? 2 : 0) |
    (armorSlots[2]?.ench ? 4 : 0) |
    (armorSlots[3]?.ench ? 8 : 0);
  localAvatar.setArmor(tup[0], tup[1], tup[2], tup[3], enchMask);
}

function damageEquippedArmor(amount = 1) {
  if (gameMode === 'creative') return;
  let changed = false;
  for (let i = 0; i < armorSlots.length; i++) {
    const st = armorSlots[i];
    if (!st) continue;
    const def = getItemDef(st.id);
    if (!def.maxDurability) continue;
    st.damage = (st.damage || 0) + amount;
    changed = true;
    if (st.damage >= def.maxDurability) {
      armorSlots[i] = null;
      sound.playBreak('metal');
    }
  }
  if (changed) {
    recomputeArmorPoints();
    renderVitalsAndXp();
    if (uiMode === 'inventory') refreshModalInventory();
  }
}

function activeItemId(): number {
  return hotbar[selectedSlot]?.id || 0;
}

function updateCursorVisual() {
  if (!cursorStack || cursorStack.id <= 0 || cursorStack.count <= 0 || uiMode !== 'inventory') {
    cursorItemEl.classList.add('hidden');
    invTouchHeld.textContent = 'Elde: Yok';
    return;
  }
  const def = getItemDef(cursorStack.id);
  invTouchHeld.textContent = `Elde: ${def.name} ×${cursorStack.count}`;
  if (isTouchDevice && performance.now() - lastTouchTimestamp < 2000) {
    cursorItemEl.classList.add('hidden');
    return;
  }
  cursorItemImg.src = atlas.icons.get(cursorStack.id) || '';
  cursorItemCount.textContent = cursorStack.count > 1 ? String(cursorStack.count) : '';
  cursorItemEl.classList.remove('hidden');
}

window.addEventListener('mousemove', (e) => {
  if (uiMode === 'inventory' && cursorStack) {
    cursorItemEl.style.left = `${e.clientX}px`;
    cursorItemEl.style.top = `${e.clientY}px`;
  }
});

function addItemToList(list: Array<ItemStack | null>, stack: ItemStack): number {
  const def = getItemDef(stack.id);
  let rem = stack.count;
  for (let i = 0; i < list.length && rem > 0; i++) {
    const s = list[i];
    if (
      s &&
      s.id === stack.id &&
      !s.damage &&
      !stack.damage &&
      !s.loaded &&
      !stack.loaded &&
      (s.ench || 0) === (stack.ench || 0) &&
      s.count < def.maxStack
    ) {
      const take = Math.min(rem, def.maxStack - s.count);
      s.count += take;
      rem -= take;
    }
  }
  for (let i = 0; i < list.length && rem > 0; i++) {
    if (!list[i]) {
      const take = Math.min(rem, def.maxStack);
      list[i] = { id: stack.id, count: take, damage: stack.damage, ench: stack.ench, loaded: stack.loaded };
      rem -= take;
    }
  }
  return rem;
}

function addItemToInventory(stack: ItemStack): boolean {
  const def = getItemDef(stack.id);
  let rem = stack.count;

  // 1. Merge into matching stacks across hotbar then backpack
  for (const list of [hotbar, backpack]) {
    for (let i = 0; i < list.length && rem > 0; i++) {
      const s = list[i];
      if (
        s &&
        s.id === stack.id &&
        !s.damage &&
        !stack.damage &&
        !s.loaded &&
        !stack.loaded &&
        (s.ench || 0) === (stack.ench || 0) &&
        s.count < def.maxStack
      ) {
        const take = Math.min(rem, def.maxStack - s.count);
        s.count += take;
        rem -= take;
      }
    }
  }
  // 2. Fill empty slots in hotbar then backpack
  for (const list of [hotbar, backpack]) {
    for (let i = 0; i < list.length && rem > 0; i++) {
      if (!list[i]) {
        const take = Math.min(rem, def.maxStack);
        list[i] = { id: stack.id, count: take, damage: stack.damage, ench: stack.ench, loaded: stack.loaded };
        rem -= take;
      }
    }
  }

  renderHotbar();
  if (uiMode === 'inventory') refreshModalInventory();
  return rem < stack.count;
}

function giveOrDropItem(stack: ItemStack) {
  const def = getItemDef(stack.id);
  let rem = stack.count;
  for (const list of [hotbar, backpack]) {
    rem = addItemToList(list, {
      id: stack.id,
      count: rem,
      damage: stack.damage,
      ench: stack.ench,
      loaded: stack.loaded
    });
    if (rem <= 0) break;
  }
  renderHotbar();
  if (uiMode === 'inventory') refreshModalInventory();
  if (rem > 0) {
    const dir = lookDirection();
    world.spawnItemDrop(
      player.x + dir.dx * 0.8,
      player.y + 1.2,
      player.z + dir.dz * 0.8,
      {
        id: stack.id,
        count: Math.min(def.maxStack, rem),
        damage: stack.damage,
        ench: stack.ench,
        loaded: stack.loaded
      },
      0.8
    );
  }
}

function returnCursorToInventory() {
  if (!cursorStack) return;
  const st = cursorStack;
  cursorStack = null;
  updateCursorVisual();
  giveOrDropItem(st);
}

function matchesRecipeItem(slotId: number, reqId: number): boolean {
  if (reqId === ANY_PLANKS) return isPlankItem(slotId);
  return slotId === reqId;
}

function countItemInInventory(reqId: number): number {
  let total = 0;
  for (const s of hotbar) if (s && matchesRecipeItem(s.id, reqId)) total += s.count;
  for (const s of backpack) if (s && matchesRecipeItem(s.id, reqId)) total += s.count;
  if (offhandSlot && matchesRecipeItem(offhandSlot.id, reqId)) total += offhandSlot.count;
  return total;
}

function consumeItemFromInventory(reqId: number, amount: number): boolean {
  if (countItemInInventory(reqId) < amount) return false;
  let rem = amount;
  for (const list of [hotbar, backpack]) {
    for (let i = 0; i < list.length && rem > 0; i++) {
      const s = list[i];
      if (s && matchesRecipeItem(s.id, reqId)) {
        const take = Math.min(rem, s.count);
        s.count -= take;
        rem -= take;
        if (s.count <= 0) list[i] = null;
      }
    }
  }
  if (rem > 0 && offhandSlot && matchesRecipeItem(offhandSlot.id, reqId)) {
    const take = Math.min(rem, offhandSlot.count);
    offhandSlot.count -= take;
    rem -= take;
    if (offhandSlot.count <= 0) offhandSlot = null;
  }
  renderHotbar();
  return rem === 0;
}

function hasAnyFuelInInventory(): boolean {
  for (const s of hotbar) if (s && isFuelItem(s.id)) return true;
  for (const s of backpack) if (s && isFuelItem(s.id)) return true;
  return false;
}

function consumeOneFuelFromInventory(): boolean {
  // Prefer Coal first, then planks/sticks/logs
  if (consumeItemFromInventory(ITEM.COAL, 1)) return true;
  for (const list of [backpack, hotbar]) {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s && isFuelItem(s.id)) {
        s.count -= 1;
        if (s.count <= 0) list[i] = null;
        renderHotbar();
        return true;
      }
    }
  }
  return false;
}

function damageHeldTool(amount = 1, useOffhand = false) {
  if (gameMode === 'creative') return;
  const slot = useOffhand ? offhandSlot : hotbar[selectedSlot];
  if (!slot) return;
  const def = getItemDef(slot.id);
  if (!def.maxDurability) return;
  slot.damage = (slot.damage || 0) + amount;
  if (slot.damage >= def.maxDurability) {
    if (useOffhand) offhandSlot = null;
    else hotbar[selectedSlot] = null;
    sound.playBreak('metal');
  }
  renderHotbar();
}

function grantXp(amount: number) {
  xpTotal += amount;
  const prevLevel = xpLevel;
  xpLevel = Math.floor(Math.sqrt(xpTotal / 7));
  sound.playXp(xpLevel > prevLevel);
  renderVitalsAndXp();
}

function applyDamage(amount: number, reason: string) {
  if (gameMode === 'creative' || uiMode === 'dead' || amount <= 0) return;
  if (urielShieldTimer > 0 && reason !== 'Boşluk') {
    sound.playAmethystChime();
    pushSubtitle('Uriel Mutlak Bariyer korudu!');
    return;
  }
  if (hurtImmunity > 0 && reason !== 'Boşluk') return;
  hurtImmunity = 0.45;
  const reduction = Math.min(0.80, armorPoints * 0.04);
  const finalDmg = reason === 'Boşluk' ? 999 : Math.max(1, Math.round(amount * (1 - reduction)));
  health = Math.max(0, health - finalDmg);
  damageEquippedArmor(1);
  sound.playHurt();
  pushSubtitle('Oyuncu hasar aldı');
  localAvatar.triggerHurt();
  server.broadcastHurt();
  flashScreen('damage');
  renderVitalsAndXp();

  if (health <= 0) {
    // Horizon 26.3 `totem.rs`: Mainhand checked first, then Offhand — prevents non-Void death!
    if (reason !== 'Boşluk') {
      const mainHasTotem = hotbar[selectedSlot]?.id === ITEM.TOTEM_OF_UNDYING;
      const offHasTotem = !mainHasTotem && offhandSlot?.id === ITEM.TOTEM_OF_UNDYING;
      if (mainHasTotem || offHasTotem) {
        if (mainHasTotem && hotbar[selectedSlot]) {
          hotbar[selectedSlot]!.count -= 1;
          if (hotbar[selectedSlot]!.count <= 0) hotbar[selectedSlot] = null;
        } else if (offHasTotem && offhandSlot) {
          offhandSlot.count -= 1;
          if (offhandSlot.count <= 0) offhandSlot = null;
        }
        health = 8;
        hunger = Math.max(hunger, 18);
        saturation = Math.max(saturation, 6);
        hurtImmunity = 1.4;
        sound.playTotemPop();
        flashScreen('totem', 650);
        pushSubtitle('Ölümsüzlük Totemi tetiklendi!');
        pushChat({ sender: 'Totem', color: '#facc15', text: 'Ölümsüzlük Totemi sizi ölümden kurtardı! (+8 Can & Yenilenme)', system: true });
        renderHotbar();
        renderVitalsAndXp();
        return;
      }
    }
    mobs.mountedMob = null;
    boats.mountedBoat = null;
    returnCursorToInventory();
    clearMovementKeys();
    uiMode = 'dead';
    syncMobileHudVisibility();
    document.exitPointerLock?.();
    deathReasonEl.textContent = `${reason} nedeniyle öldünüz.`;
    deathModal.classList.remove('hidden');
  }
}

function computeShieldBlockHands(): { main: boolean; off: boolean } {
  if (
    uiMode !== 'playing' ||
    !rightMouseHeld ||
    bowDrawing ||
    tridentDrawing ||
    crossbowCharging ||
    spearCouching ||
    spyglassZooming ||
    eatingActive
  ) {
    return { main: false, off: false };
  }
  const mainId = activeItemId();
  if (mainId === ITEM.SHIELD) {
    return { main: true, off: false };
  }
  if (offhandSlot?.id === ITEM.SHIELD) {
    return { main: false, off: true };
  }
  return { main: false, off: false };
}

function applyCombatDamage(amount: number, source: string, knockX: number, knockZ: number) {
  if (gameMode === 'creative' || uiMode === 'dead' || hurtImmunity > 0) return;
  if (urielShieldTimer > 0) {
    sound.playAmethystChime();
    pushSubtitle('Uriel Mutlak Bariyer engelledi!');
    return;
  }
  const shieldHands = computeShieldBlockHands();
  if ((shieldHands.main || shieldHands.off) && shieldRaiseTimer >= 0.18) {
    // Check 180-degree front arc if knockback direction is provided (#15811)
    let frontArc = true;
    const kLen = Math.hypot(knockX, knockZ);
    if (kLen > 0.01) {
      const look = lookDirection();
      // Attack comes FROM (-knockX, -knockZ); dot with look > -0.15 = front hemisphere
      const dot = (look.dx * -knockX + look.dz * -knockZ) / kLen;
      frontArc = dot >= -0.15;
    }
    if (frontArc) {
      sound.playPlace('metal');
      pushSubtitle('Kalkan engelledi');
      tensuraVfx.spawnShieldDeflect(player.x, player.y + 1.0, player.z, player.yaw);
      damageHeldTool(1, shieldHands.off);
      const kbMult = source.includes('Keçi') ? 0.5 : 1.1;
      player.vx += knockX * kbMult;
      player.vz += knockZ * kbMult;
      hurtImmunity = 0.35;
      return;
    }
  }
  player.vx += knockX * 4.6;
  player.vy = Math.max(player.vy, 3.6);
  player.vz += knockZ * 4.6;
  applyDamage(amount, source);
}

// ============================================================================
// PIXEL HUD & FULL INTERACTIVE CURSOR SLOT RENDERING
// ============================================================================
function renderVitalsAndXp() {
  survivalVitalsEl.classList.toggle('hidden', gameMode === 'creative');
  renderBarIcons(heartsBar, health, 20, hudSprites.heartFull, hudSprites.heartHalf, hudSprites.heartEmpty, false);
  renderBarIcons(hungerBar, hunger, 20, hudSprites.hungerFull, hudSprites.hungerHalf, hudSprites.hungerEmpty, true);

  if (armorPoints > 0 && gameMode === 'survival') {
    armorBar.classList.remove('hidden');
    renderBarIcons(armorBar, armorPoints, 20, hudSprites.armorFull, hudSprites.armorFull, hudSprites.armorEmpty, false);
  } else {
    armorBar.classList.add('hidden');
  }

  if (player.headUnderwater && gameMode === 'survival') {
    airBar.classList.remove('hidden');
    renderBarIcons(airBar, airSupply, 16, hudSprites.bubble, hudSprites.bubble, '', true);
  } else {
    airBar.classList.add('hidden');
  }

  const curBase = xpLevel * xpLevel * 7;
  const nextBase = (xpLevel + 1) * (xpLevel + 1) * 7;
  const frac = Math.max(0, Math.min(1, (xpTotal - curBase) / Math.max(1, nextBase - curBase)));
  xpBarFill.style.width = `${Math.round(frac * 100)}%`;
  xpLevelNum.textContent = String(xpLevel);
  xpLevelNum.classList.toggle('hidden', xpLevel <= 0);
}

function buildSlotElement(stack: ItemStack | null, selected = false, placeholder = ''): HTMLDivElement {
  const slot = document.createElement('div');
  slot.className =
    'mc-slot' +
    (selected ? ' selected' : '') +
    (stack?.ench ? ' enchanted' : '') +
    (stack?.loaded ? ' loaded' : '');

  if (stack && stack.id > 0 && stack.count > 0) {
    const def = getItemDef(stack.id);
    const iconUrl = atlas.icons.get(stack.id);
    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = def.name;
      slot.appendChild(img);
    }
    if (stack.count > 1) {
      const cnt = document.createElement('span');
      cnt.className = 'slot-count';
      cnt.textContent = String(stack.count);
      slot.appendChild(cnt);
    }
    if (def.maxDurability && stack.damage) {
      const ratio = Math.max(0, 1 - stack.damage / def.maxDurability);
      const bar = document.createElement('div');
      bar.className = 'slot-durability';
      const fill = document.createElement('i');
      fill.style.width = `${Math.round(ratio * 100)}%`;
      fill.style.background = ratio > 0.5 ? '#4ade80' : ratio > 0.22 ? '#facc15' : '#ef4444';
      bar.appendChild(fill);
      slot.appendChild(bar);
    }
    const enchRoman = stack.ench === 3 ? ' ★III' : stack.ench === 2 ? ' ★II' : stack.ench === 1 ? ' ★I' : '';
    const loadedTxt = stack.loaded ? ' [Dolu]' : '';
    slot.title = def.name + enchRoman + loadedTxt;
  } else if (placeholder) {
    const ph = document.createElement('span');
    ph.className = 'slot-placeholder';
    ph.textContent = placeholder;
    slot.appendChild(ph);
  }
  return slot;
}

function swapMainhandAndOffhand() {
  const tmp = hotbar[selectedSlot];
  hotbar[selectedSlot] = offhandSlot;
  offhandSlot = tmp;
  miningProgress = 0;
  miningTargetKey = '';
  eatingActive = false;
  eatingTimer = 0;
  shieldRaiseTimer = 0;
  sound.playClick();
  renderHotbar();
}

function dropSelectedItem(entireStack = false) {
  const cur = hotbar[selectedSlot];
  if (!cur) return;
  const dropCount = entireStack ? cur.count : 1;
  const dropStack: ItemStack = {
    id: cur.id,
    count: dropCount,
    damage: cur.damage,
    ench: cur.ench,
    loaded: cur.loaded
  };
  cur.count -= dropCount;
  if (cur.count <= 0) hotbar[selectedSlot] = null;
  renderHotbar();
  const dir = lookDirection();
  world.spawnItemDrop(player.x + dir.dx * 0.9, player.y + 1.3, player.z + dir.dz * 0.9, dropStack, 1.2);
}

function renderHotbar() {
  hotbarEl.innerHTML = '';
  for (let idx = 0; idx < 9; idx++) {
    const slot = buildSlotElement(hotbar[idx], idx === selectedSlot);
    slot.addEventListener('click', () => selectHotbarSlot(idx));
    slot.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastTouchTimestamp = performance.now();
        selectHotbarSlot(idx);
        sound.playClick();
      },
      { passive: false }
    );
    hotbarEl.appendChild(slot);
  }

  // Offhand HUD Slot (to left of hotbar when occupied — tap on touch to swap Mainhand <-> Offhand)
  offhandHudWrap.innerHTML = '';
  if (offhandSlot && offhandSlot.id > 0 && offhandSlot.count > 0) {
    offhandHudWrap.classList.remove('hidden');
    offhandHudWrap.appendChild(buildSlotElement(offhandSlot, false));
  } else {
    offhandHudWrap.classList.add('hidden');
  }

  const held = hotbar[selectedSlot];
  const heldId = held?.id || 0;
  const heldLoaded = Boolean(held?.loaded);
  const offId = offhandSlot?.id || 0;
  const offLoaded = Boolean(offhandSlot?.loaded);
  const def = getItemDef(heldId);
  hotbarTooltip.textContent = heldId > 0 ? def.name : '';
  fpHand.setBlock(heldId, heldLoaded);
  fpHand.setOffhand(offId, offLoaded);
  localAvatar.setHeldBlock(heldId, heldLoaded);
  localAvatar.setOffhandItem(offId, offLoaded);
}

offhandHudWrap.addEventListener('click', () => {
  if (uiMode === 'playing') swapMainhandAndOffhand();
});
offhandHudWrap.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    swapMainhandAndOffhand();
  },
  { passive: false }
);

function selectHotbarSlot(idx: number) {
  const nextSlot = ((idx % 9) + 9) % 9;
  if (nextSlot !== selectedSlot) {
    miningProgress = 0;
    miningTargetKey = '';
    eatingActive = false;
    eatingTimer = 0;
    shieldRaiseTimer = 0;
  }
  selectedSlot = nextSlot;
  renderHotbar();
}

// Horizontal Finger Swipe Across Hotbar (Android & iOS fast weapon/block cycling!)
let hotbarSwipeId: number | null = null;
let hotbarSwipeStartX = 0;
let hotbarSwipeBaseSlot = 0;
hotbarEl.addEventListener(
  'touchstart',
  (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    hotbarSwipeId = t.identifier;
    hotbarSwipeStartX = t.clientX;
    hotbarSwipeBaseSlot = selectedSlot;
  },
  { passive: true }
);
hotbarEl.addEventListener(
  'touchmove',
  (e) => {
    if (hotbarSwipeId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === hotbarSwipeId) {
        const deltaSlots = Math.trunc((t.clientX - hotbarSwipeStartX) / 28);
        const want = (((hotbarSwipeBaseSlot + deltaSlots) % 9) + 9) % 9;
        if (want !== selectedSlot) {
          selectHotbarSlot(want);
          sound.playClick();
          pulseHaptic(6);
        }
        break;
      }
    }
  },
  { passive: true }
);
window.addEventListener(
  'touchend',
  (e) => {
    if (hotbarSwipeId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === hotbarSwipeId) {
        hotbarSwipeId = null;
        break;
      }
    }
  },
  { passive: true }
);

recomputeArmorPoints();
renderVitalsAndXp();
renderHotbar();

// Touch Inventory Mode Buttons (Al/Koy, Hızlı Kuşan, Yarıya Böl)
document.querySelectorAll<HTMLButtonElement>('.inv-tmode-btn[data-tmode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    mobileInvMode = (btn.dataset.tmode as 'normal' | 'quick' | 'split') || 'normal';
    document.querySelectorAll('.inv-tmode-btn[data-tmode]').forEach((b) => b.classList.toggle('active', b === btn));
    sound.playClick();
  });
});

// Generic Interactive Inventory Slot Handler (Desktop LMB/RMB/Shift+Click + Mobile Tap Modes!)
function bindInteractiveSlot(
  el: HTMLDivElement,
  getSlot: () => ItemStack | null,
  setSlot: (v: ItemStack | null) => void,
  opts: {
    accept?: (st: ItemStack) => boolean;
    maxCount?: number;
    onShiftClick?: (st: ItemStack) => ItemStack | null;
    onChange?: () => void;
  } = {}
) {
  const executeSlotAction = (button: 0 | 2, shiftQuick: boolean, clientX: number, clientY: number) => {
    const cur = getSlot();

    // Shift + Click / Mobile 'Hızlı Kuşan' quick transfer / auto-equip
    if (shiftQuick && cur && opts.onShiftClick) {
      const leftover = opts.onShiftClick(cur);
      setSlot(leftover);
      opts.onChange?.();
      sound.playClick();
      renderHotbar();
      refreshModalInventory();
      return;
    }

    if (button === 0) {
      if (!cursorStack) {
        if (!cur) return;
        cursorStack = cur;
        setSlot(null);
      } else {
        if (opts.accept && !opts.accept(cursorStack)) return;
        const def = getItemDef(cursorStack.id);
        const cap = Math.min(def.maxStack, opts.maxCount ?? def.maxStack);
        if (!cur) {
          const put = Math.min(cap, cursorStack.count);
          setSlot({
            id: cursorStack.id,
            count: put,
            damage: cursorStack.damage,
            ench: cursorStack.ench,
            loaded: cursorStack.loaded
          });
          cursorStack.count -= put;
          if (cursorStack.count <= 0) cursorStack = null;
        } else if (
          cur.id === cursorStack.id &&
          !cur.damage &&
          !cursorStack.damage &&
          !cur.loaded &&
          !cursorStack.loaded &&
          (cur.ench || 0) === (cursorStack.ench || 0) &&
          cur.count < cap
        ) {
          const take = Math.min(cap - cur.count, cursorStack.count);
          cur.count += take;
          cursorStack.count -= take;
          if (cursorStack.count <= 0) cursorStack = null;
          setSlot(cur);
        } else if (cursorStack.count <= cap) {
          setSlot(cursorStack);
          cursorStack = cur;
        }
      }
    } else if (button === 2) {
      if (!cursorStack && cur) {
        // Split half into cursor
        const take = Math.ceil(cur.count / 2);
        cursorStack = { id: cur.id, count: take, damage: cur.damage, ench: cur.ench, loaded: cur.loaded };
        cur.count -= take;
        setSlot(cur.count > 0 ? cur : null);
      } else if (cursorStack) {
        if (opts.accept && !opts.accept(cursorStack)) return;
        const def = getItemDef(cursorStack.id);
        const cap = Math.min(def.maxStack, opts.maxCount ?? def.maxStack);
        if (!cur) {
          setSlot({
            id: cursorStack.id,
            count: 1,
            damage: cursorStack.damage,
            ench: cursorStack.ench,
            loaded: cursorStack.loaded
          });
          cursorStack.count -= 1;
          if (cursorStack.count <= 0) cursorStack = null;
        } else if (
          cur.id === cursorStack.id &&
          !cur.damage &&
          !cursorStack.damage &&
          !cur.loaded &&
          !cursorStack.loaded &&
          (cur.ench || 0) === (cursorStack.ench || 0) &&
          cur.count < cap
        ) {
          cur.count += 1;
          cursorStack.count -= 1;
          if (cursorStack.count <= 0) cursorStack = null;
          setSlot(cur);
        }
      }
    }

    if (cursorStack) {
      cursorItemEl.style.left = `${clientX}px`;
      cursorItemEl.style.top = `${clientY}px`;
    }
    opts.onChange?.();
    sound.playClick();
    updateCursorVisual();
    renderHotbar();
    refreshModalInventory();
  };

  el.addEventListener('mousedown', (e) => {
    if (performance.now() - lastTouchTimestamp < 650) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 0 || e.button === 2) {
      executeSlotAction(e.button, e.shiftKey, e.clientX, e.clientY);
    }
  });

  let tapStartX = 0;
  let tapStartY = 0;
  el.addEventListener(
    'touchstart',
    (e) => {
      lastTouchTimestamp = performance.now();
      const t = e.changedTouches[0];
      if (t) {
        tapStartX = t.clientX;
        tapStartY = t.clientY;
      }
    },
    { passive: true }
  );
  el.addEventListener(
    'touchend',
    (e) => {
      lastTouchTimestamp = performance.now();
      const t = e.changedTouches[0];
      if (!t) return;
      if (Math.hypot(t.clientX - tapStartX, t.clientY - tapStartY) > 14) return;
      e.preventDefault();
      e.stopPropagation();
      const isQuick = mobileInvMode === 'quick';
      const btn: 0 | 2 = mobileInvMode === 'split' ? 2 : 0;
      executeSlotAction(btn, isQuick, t.clientX, t.clientY);
    },
    { passive: false }
  );
}

function tryAutoEquipOrMove(st: ItemStack, fromHotbar: boolean): ItemStack | null {
  const def = getItemDef(st.id);
  const autoSlot = def.armorSlot || (st.id === BLOCK.CARVED_PUMPKIN ? 'head' : undefined);
  // 1. Auto-equip armor (or Carved Pumpkin helmet #15628) if matching armor slot is empty
  if (autoSlot) {
    const aIdx = ARMOR_ORDER.indexOf(autoSlot);
    if (aIdx !== -1 && !armorSlots[aIdx]) {
      armorSlots[aIdx] = { id: st.id, count: 1, damage: st.damage, ench: st.ench, loaded: st.loaded };
      recomputeArmorPoints();
      renderVitalsAndXp();
      sound.playPlace('metal');
      const rem = st.count - 1;
      return rem > 0 ? { id: st.id, count: rem, damage: st.damage, ench: st.ench, loaded: st.loaded } : null;
    }
  }
  // 2. If Chest tab is open, move into open Chest!
  if (activeInvTab === 'chest' && activeChestKey) {
    const [dimStr, coords] = activeChestKey.split(':');
    const [wx, y, wz] = (coords || '').split(',').map(Number);
    const chestSlots = getOrPopulateChest((dimStr as DimensionId) || world.dimension, wx, y, wz);
    const rem = addItemToList(chestSlots, st);
    savePersistedChests();
    return rem > 0 ? { id: st.id, count: rem, damage: st.damage, ench: st.ench, loaded: st.loaded } : null;
  }
  // 3. Otherwise transfer between Hotbar <-> Backpack
  const target = fromHotbar ? backpack : hotbar;
  const rem = addItemToList(target, st);
  return rem > 0 ? { id: st.id, count: rem, damage: st.damage, ench: st.ench, loaded: st.loaded } : null;
}

// ============================================================================
// CRAFTING, FURNACE, CHEST & CREATIVE CATALOG UI
// ============================================================================
type CraftFilterKind = 'all' | 'craftable' | 'gear' | 'blocks';
let activeCraftFilter: CraftFilterKind = 'all';

invCraftFilters?.querySelectorAll<HTMLButtonElement>('.craft-filter-btn[data-cfilter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeCraftFilter = (btn.dataset.cfilter as CraftFilterKind) || 'all';
    invCraftFilters.querySelectorAll('.craft-filter-btn[data-cfilter]').forEach((b) => b.classList.toggle('active', b === btn));
    sound.playClick();
    refreshModalInventory();
  });
});

function setInvTab(tab: InvTab) {
  if (tab === 'catalog' && gameMode !== 'creative') tab = 'craft';
  activeInvTab = tab;
  tabBtnCraft.classList.toggle('active', tab === 'craft');
  tabBtnFurnace.classList.toggle('active', tab === 'furnace');
  tabBtnChest.classList.toggle('active', tab === 'chest');
  tabBtnTrade.classList.toggle('active', tab === 'trade');
  tabBtnCatalog.classList.toggle('active', tab === 'catalog');

  invCraftFilters?.classList.toggle('hidden', tab !== 'craft');
  invStationPanel.classList.toggle('hidden', tab === 'catalog');
  invGrid.classList.toggle('hidden', tab !== 'catalog');
  invSearch.classList.toggle('hidden', gameMode !== 'creative');
  refreshModalInventory();
}

tabBtnCraft.addEventListener('click', () => setInvTab('craft'));
tabBtnFurnace.addEventListener('click', () => setInvTab('furnace'));
tabBtnChest.addEventListener('click', () => setInvTab('chest'));
tabBtnTrade.addEventListener('click', () => setInvTab('trade'));
tabBtnCatalog.addEventListener('click', () => setInvTab('catalog'));

function canCraft(r: CraftRecipe): boolean {
  if (gameMode === 'creative') return true;
  if (r.needsTable && !usingCraftingTable) return false;
  return r.cost.every((c) => countItemInInventory(c.id) >= c.count);
}

function refreshModalInventory() {
  // P0 #6: Enforce Creative-only visibility of Catalog tab & search
  tabBtnCatalog.classList.toggle('hidden', gameMode !== 'creative');
  invSearch.classList.toggle('hidden', gameMode !== 'creative');

  // 1. Station / Recipe / Chest / Trade / Catalog Panel
  if (activeInvTab === 'craft') {
    invStationPanel.innerHTML = '';
    const note = document.createElement('div');
    note.className = 'craft-station-note';
    note.textContent = usingCraftingTable
      ? '3×3 Çalışma Masası Aktif — Tüm alet, silah, zırh ve blok tarifleri açık!'
      : '2×2 Envanter Üretimi — 3×3 alet & zırhlar için Çalışma Masasına sağ tıklayın.';
    invStationPanel.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'recipe-grid';

    for (const r of RECIPES) {
      const ok = canCraft(r);
      const outDef = getItemDef(r.out.id);
      const isGearRecipe = Boolean(
        outDef.toolClass ||
          outDef.armorSlot ||
          outDef.attackDamage ||
          r.out.id === ITEM.SHIELD ||
          r.out.id === ITEM.BOW ||
          r.out.id === ITEM.CROSSBOW ||
          r.out.id === ITEM.ARROW
      );
      if (activeCraftFilter === 'craftable' && !ok) continue;
      if (activeCraftFilter === 'gear' && !isGearRecipe) continue;
      if (activeCraftFilter === 'blocks' && isGearRecipe) continue;

      const card = document.createElement('div');
      card.className = 'recipe-card ' + (ok ? 'craftable' : 'locked');
      const img = document.createElement('img');
      img.src = atlas.icons.get(r.out.id) || '';
      img.alt = outDef.name;
      const meta = document.createElement('div');
      meta.className = 'recipe-meta';
      const title = document.createElement('strong');
      title.textContent = `${outDef.name} ×${r.out.count}`;
      const costTxt = document.createElement('span');
      costTxt.textContent = r.cost.map((c) => `${c.count}× ${getItemDef(c.id).name}`).join(', ');
      meta.append(title, costTxt);
      card.append(img, meta);

      card.addEventListener('click', () => {
        if (!canCraft(r)) return;
        if (gameMode !== 'creative') {
          for (const c of r.cost) consumeItemFromInventory(c.id, c.count);
        }
        giveOrDropItem({ ...r.out });
        sound.playPlace('wood');
        refreshModalInventory();
      });
      grid.appendChild(card);
    }
    invStationPanel.appendChild(grid);
  } else if (activeInvTab === 'furnace') {
    invStationPanel.innerHTML = '';
    const hasFuel = gameMode === 'creative' || hasAnyFuelInInventory();
    const grid = document.createElement('div');
    grid.className = 'recipe-grid';

    for (const sr of SMELT_RECIPES) {
      const canSmelt = gameMode === 'creative' || (countItemInInventory(sr.input) >= 1 && hasFuel);
      const card = document.createElement('div');
      card.className = 'recipe-card ' + (canSmelt ? 'craftable' : 'locked');
      const img = document.createElement('img');
      img.src = atlas.icons.get(sr.output.id) || '';
      const meta = document.createElement('div');
      meta.className = 'recipe-meta';
      const title = document.createElement('strong');
      title.textContent = sr.name;
      const sub = document.createElement('span');
      sub.textContent = '1× Girdi + Yakıt (Kömür / Odun / Tahta)';
      meta.append(title, sub);
      card.append(img, meta);
      card.addEventListener('click', () => {
        if (!canSmelt) return;
        if (gameMode !== 'creative') {
          if (!consumeItemFromInventory(sr.input, 1)) return;
          if (!consumeOneFuelFromInventory()) return;
        }
        giveOrDropItem({ ...sr.output });
        grantXp(3);
        sound.playPlace('stone');
        refreshModalInventory();
      });
      grid.appendChild(card);
    }
    invStationPanel.appendChild(grid);
  } else if (activeInvTab === 'chest') {
    invStationPanel.innerHTML = '';
    const [dimStr, coords] = activeChestKey.split(':');
    const [wx, y, wz] = (coords || '0,0,0').split(',').map(Number);
    const slots = getOrPopulateChest((dimStr as DimensionId) || world.dimension, wx, y, wz);
    const chestGrid = document.createElement('div');
    chestGrid.className = 'mc-slot-grid';
    slots.forEach((st, idx) => {
      const el = buildSlotElement(st, false);
      bindInteractiveSlot(
        el,
        () => slots[idx],
        (v) => {
          slots[idx] = v;
          savePersistedChests();
        },
        {
          onShiftClick: (item) => {
            let rem = addItemToList(hotbar, item);
            if (rem > 0) {
              rem = addItemToList(backpack, {
                id: item.id,
                count: rem,
                damage: item.damage,
                ench: item.ench,
                loaded: item.loaded
              });
            }
            savePersistedChests();
            return rem > 0
              ? { id: item.id, count: rem, damage: item.damage, ench: item.ench, loaded: item.loaded }
              : null;
          }
        }
      );
      chestGrid.appendChild(el);
    });
    invStationPanel.appendChild(chestGrid);
  } else if (activeInvTab === 'trade') {
    invStationPanel.innerHTML = '';
    const note = document.createElement('div');
    note.style.marginBottom = '8px';
    note.style.fontSize = '12px';
    note.textContent = 'Köylü Zümrüt Takası — Ürün satıp Zümrüt kazanın veya Elmas ekipman satın alın.';
    invStationPanel.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'recipe-grid';

    for (const tr of VILLAGER_TRADES) {
      const ok = gameMode === 'creative' || countItemInInventory(tr.cost.id) >= tr.cost.count;
      const outDef = getItemDef(tr.out.id);
      const costDef = getItemDef(tr.cost.id);
      const card = document.createElement('div');
      card.className = 'recipe-card ' + (ok ? 'craftable' : 'locked');
      const img = document.createElement('img');
      img.src = atlas.icons.get(tr.out.id) || '';
      img.alt = outDef.name;
      const meta = document.createElement('div');
      meta.className = 'recipe-meta';
      const title = document.createElement('strong');
      title.textContent = `${outDef.name} ×${tr.out.count}`;
      const sub = document.createElement('span');
      sub.textContent = `Bedel: ${tr.cost.count}× ${costDef.name}`;
      meta.append(title, sub);
      card.append(img, meta);

      card.addEventListener('click', () => {
        if (gameMode !== 'creative' && !consumeItemFromInventory(tr.cost.id, tr.cost.count)) return;
        giveOrDropItem({ ...tr.out });
        grantXp(4);
        sound.playXp(false);
        refreshModalInventory();
      });
      grid.appendChild(card);
    }
    invStationPanel.appendChild(grid);
  } else {
    populateCatalogGrid(invSearch.value);
  }

  // 2. Render 4 Armor Slots + Offhand Slot
  recomputeArmorPoints();
  armorSlotsGrid.innerHTML = '';
  ARMOR_ORDER.forEach((slotKind, idx) => {
    const el = buildSlotElement(armorSlots[idx], false, ARMOR_SHORT_LABELS[slotKind]);
    bindInteractiveSlot(
      el,
      () => armorSlots[idx],
      (v) => {
        armorSlots[idx] = v;
        recomputeArmorPoints();
        renderVitalsAndXp();
      },
      {
        accept: (st) =>
          getItemDef(st.id).armorSlot === slotKind ||
          (slotKind === 'head' && st.id === BLOCK.CARVED_PUMPKIN),
        maxCount: 1,
        onShiftClick: (item) => {
          let rem = addItemToList(backpack, item);
          if (rem > 0) {
            rem = addItemToList(hotbar, {
              id: item.id,
              count: rem,
              damage: item.damage,
              ench: item.ench,
              loaded: item.loaded
            });
          }
          return rem > 0
            ? { id: item.id, count: rem, damage: item.damage, ench: item.ench, loaded: item.loaded }
            : null;
        },
        onChange: () => {
          recomputeArmorPoints();
          renderVitalsAndXp();
        }
      }
    );
    armorSlotsGrid.appendChild(el);
  });

  modalOffhandWrap.innerHTML = '';
  const offEl = buildSlotElement(offhandSlot, false, 'Kalkan');
  bindInteractiveSlot(
    offEl,
    () => offhandSlot,
    (v) => { offhandSlot = v; },
    {
      onShiftClick: (item) => {
        let rem = addItemToList(hotbar, item);
        if (rem > 0) {
          rem = addItemToList(backpack, {
            id: item.id,
            count: rem,
            damage: item.damage,
            ench: item.ench,
            loaded: item.loaded
          });
        }
        return rem > 0
          ? { id: item.id, count: rem, damage: item.damage, ench: item.ench, loaded: item.loaded }
          : null;
      }
    }
  );
  modalOffhandWrap.appendChild(offEl);

  // 3. Render Player Backpack (27) & Modal Hotbar (9)
  backpackGrid.innerHTML = '';
  backpack.forEach((st, idx) => {
    const el = buildSlotElement(st, false);
    bindInteractiveSlot(
      el,
      () => backpack[idx],
      (v) => { backpack[idx] = v; },
      { onShiftClick: (item) => tryAutoEquipOrMove(item, false) }
    );
    backpackGrid.appendChild(el);
  });

  modalHotbarGrid.innerHTML = '';
  hotbar.forEach((st, idx) => {
    const el = buildSlotElement(st, idx === selectedSlot);
    bindInteractiveSlot(
      el,
      () => hotbar[idx],
      (v) => { hotbar[idx] = v; },
      { onShiftClick: (item) => tryAutoEquipOrMove(item, true) }
    );
    modalHotbarGrid.appendChild(el);
  });
}

function populateCatalogGrid(filter = '') {
  if (gameMode !== 'creative') return;
  invGrid.innerHTML = '';
  const q = filter.trim().toLocaleLowerCase('tr');
  for (const item of ALL_CREATIVE_ITEMS) {
    if (q && !item.name.toLocaleLowerCase('tr').includes(q) && !item.key.includes(q)) continue;
    const card = document.createElement('div');
    card.className = 'inv-item';
    const img = document.createElement('img');
    img.src = atlas.icons.get(item.id) || '';
    img.alt = item.name;
    const lbl = document.createElement('span');
    lbl.textContent = item.name;
    card.append(img, lbl);
    card.addEventListener('click', (e) => {
      if (item.armorSlot) {
        const aIdx = ARMOR_ORDER.indexOf(item.armorSlot);
        if (aIdx !== -1) {
          armorSlots[aIdx] = { id: item.id, count: 1 };
          recomputeArmorPoints();
          renderVitalsAndXp();
        }
      } else {
        const isTouchTap = isTouchDevice && performance.now() - lastTouchTimestamp < 1200;
        const count = e.shiftKey || isTouchTap ? item.maxStack : 1;
        let targetIdx = selectedSlot;
        if (hotbar[targetIdx] && hotbar[targetIdx]!.id !== item.id) {
          const emptyIdx = hotbar.findIndex((s) => !s);
          if (emptyIdx !== -1) targetIdx = emptyIdx;
        }
        if (
          hotbar[targetIdx] &&
          hotbar[targetIdx]!.id === item.id &&
          !hotbar[targetIdx]!.damage &&
          !hotbar[targetIdx]!.loaded &&
          !(hotbar[targetIdx]!.ench) &&
          hotbar[targetIdx]!.count < item.maxStack
        ) {
          hotbar[targetIdx]!.count = Math.min(item.maxStack, hotbar[targetIdx]!.count + count);
        } else {
          hotbar[targetIdx] = { id: item.id, count };
          selectedSlot = targetIdx;
        }
        renderHotbar();
      }
      sound.playClick();
      refreshModalInventory();
    });
    invGrid.appendChild(card);
  }
}

invSearch.addEventListener('input', () => {
  if (gameMode !== 'creative') return;
  if (activeInvTab !== 'catalog') setInvTab('catalog');
  else populateCatalogGrid(invSearch.value);
});
invCloseBtn.addEventListener('click', () => enterPlayingMode());

// ============================================================================
// RESPAWN & WORLD / PHYSICS / PROJECTILE / MOB CALLBACKS
// ============================================================================
function resolveSafeRespawnPoint(sx: number, sy: number, sz: number): { x: number; y: number; z: number } {
  const bx = Math.floor(sx);
  const by = Math.floor(sy);
  const bz = Math.floor(sz);
  const offsets: Array<[number, number]> = [
    [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [-2, 0], [0, 2], [0, -2]
  ];
  for (const dy of [0, -1, 1]) {
    const cy = by + dy;
    if (cy < 2 || cy >= WORLD_HEIGHT - 3) continue;
    for (const [ox, oz] of offsets) {
      const tx = bx + ox;
      const tz = bz + oz;
      const floorId = world.getBlock(tx, cy - 1, tz);
      const floorDef = getBlock(floorId);
      if (!floorDef.solid || isLavaBlock(floorId) || floorId === BLOCK.MAGMA_BLOCK) continue;
      if (isLavaBlock(world.getBlock(tx, cy, tz)) || isLavaBlock(world.getBlock(tx, cy + 1, tz))) continue;
      const px = tx + 0.5;
      const py = cy + 0.05;
      const pz = tz + 0.5;
      if (!player.collidesAt(world, px, py, pz, player.standHeight, py)) {
        return { x: px, y: py, z: pz };
      }
    }
  }
  return { x: sx, y: world.getSafeSurfaceY(sx, sz), z: sz };
}

respawnBtn.addEventListener('click', () => {
  sound.playClick();
  health = 20;
  hunger = 20;
  saturation = 5;
  airSupply = 16;
  player.freezeProgress = 0;
  hurtImmunity = 1.0;
  deathModal.classList.add('hidden');
  if (world.dimension !== spawnPoint.dim) {
    switchDimension(spawnPoint.dim, spawnPoint.x, spawnPoint.z, spawnPoint.y);
  } else {
    world.ensureAreaSyncAround(spawnPoint.x, spawnPoint.z);
  }
  if (spawnPoint.bedPos) {
    const [bx, by, bz] = spawnPoint.bedPos;
    if (world.getBlock(bx, by, bz) !== BLOCK.BED_BLOCK) {
      spawnPoint = { x: 0.5, y: 49.05, z: 7.5, dim: 'overworld' };
      switchDimension('overworld', 0.5, 7.5);
      pushChat({
        sender: 'Yatak',
        color: '#f2c46b',
        text: 'Yatağınız kırıldığı için Köy Meydanında yeniden doğdunuz.',
        system: true
      });
    }
  } else if (spawnPoint.anchorPos) {
    // Horizon 26.3 `interact.rs`: Consume 1 charge from Nether Respawn Anchor on respawn; if destroyed/empty, fallback to Overworld!
    const [ax, ay, az] = spawnPoint.anchorPos;
    const aid = world.getBlock(ax, ay, az);
    if (aid >= BLOCK.RESPAWN_ANCHOR_1 && aid <= BLOCK.RESPAWN_ANCHOR_4) {
      const nextAnchor = aid === BLOCK.RESPAWN_ANCHOR_1 ? BLOCK.RESPAWN_ANCHOR_0 : aid - 1;
      world.setBlock(ax, ay, az, nextAnchor, false);
      server.broadcastBlockEdit(ax, ay, az, nextAnchor, world.dimension);
      sound.playPortal();
    } else {
      spawnPoint = { x: 0.5, y: 49.05, z: 7.5, dim: 'overworld' };
      switchDimension('overworld', 0.5, 7.5);
      pushChat({
        sender: 'Yeniden Doğma Çapası',
        color: '#f2c46b',
        text: 'Yeniden Doğma Çapanızın şarjı bittiği veya kırıldığı için Köy Meydanında doğdunuz.',
        system: true
      });
    }
  }
  const safePt = resolveSafeRespawnPoint(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  player.x = safePt.x;
  player.y = safePt.y;
  player.z = safePt.z;
  player.vx = 0; player.vy = 0; player.vz = 0;
  player.resetFallDistance();
  renderVitalsAndXp();
  enterPlayingMode();
});

world.onPickupItem = (stack) => {
  const ok = addItemToInventory(stack);
  if (ok) {
    sound.playClick();
    pushSubtitle('Eşya toplandı');
  }
  return ok;
};
world.onPickupXp = (amt) => grantXp(amt);
world.onLocalBatchEdits = (edits) => server.broadcastBlockEditsBatch(edits);
world.onRemoteLiveEdit = (wx, y, wz, prevId, nextId) => {
  const gain = sound.distanceGain(wx + 0.5, y + 0.5, wz + 0.5, player.x, player.y, player.z);
  if (gain <= 0.03) return;
  const pan = sound.stereoPan(wx + 0.5, wz + 0.5, player.x, player.z, player.yaw);
  if (nextId === BLOCK.AIR && prevId !== BLOCK.AIR) {
    sound.playBreak(getBlock(prevId).material, gain, pan);
    pushSubtitle('Blok kırıldı', wx + 0.5, wz + 0.5);
  } else if (nextId !== BLOCK.AIR) {
    sound.playPlace(getBlock(nextId).material, gain, pan);
    pushSubtitle('Blok koyuldu', wx + 0.5, wz + 0.5);
  }
};

// P1 #14 Fix: Clean up container / Jukebox / Campfire / NoteBlock / Cake state on TNT, remote breaks & support pops!
world.onBlockRemovedAt = (wx, y, wz, prevId, isLocalOrigin) => {
  const bKey = `${world.dimension}:${wx},${y},${wz}`;
  if (prevId === BLOCK.JUKEBOX && jukeboxPlayingAt === bKey) {
    sound.stopMusicDisc();
    jukeboxPlayingAt = null;
    if (isLocalOrigin) {
      world.spawnItemDrop(wx + 0.5, y + 0.75, wz + 0.5, { id: ITEM.MUSIC_DISC, count: 1 }, 0.3);
    }
  } else if (prevId === BLOCK.CHEST || prevId === BLOCK.BARREL) {
    const stored = chestStorage.get(bKey);
    if (stored) {
      if (isLocalOrigin) {
        for (const st of stored) {
          if (st && st.id > 0 && st.count > 0) {
            world.spawnItemDrop(wx + 0.5, y + 0.5, wz + 0.5, { ...st }, 0.25);
          }
        }
      }
      chestStorage.delete(bKey);
      savePersistedChests(false);
    }
    if (activeChestKey === bKey && uiMode === 'inventory') {
      enterPlayingMode();
    }
  } else if (prevId === BLOCK.CAMPFIRE || prevId === BLOCK.CAMPFIRE_UNLIT) {
    const cf = campfireCookSlots.get(bKey);
    if (cf) {
      if (isLocalOrigin && cf.timers.length > 0) {
        world.spawnItemDrop(wx + 0.5, y + 0.5, wz + 0.5, { id: ITEM.RAW_BEEF, count: cf.timers.length }, 0.25);
      }
      campfireCookSlots.delete(bKey);
    }
  } else if (prevId === BLOCK.NOTE_BLOCK) {
    noteBlockPitches.delete(bKey);
    poweredNoteBlocks.delete(bKey);
  } else if (prevId === BLOCK.COPPER_BULB_OFF || prevId === BLOCK.COPPER_BULB_ON) {
    poweredCopperBulbs.delete(bKey);
  } else if (prevId === BLOCK.TARGET_BLOCK) {
    activeTargetBlocks.delete(bKey);
  } else if (prevId === BLOCK.CAKE) {
    cakeBites.delete(bKey);
  } else if (
    prevId === BLOCK.BED_BLOCK &&
    spawnPoint.bedPos &&
    spawnPoint.bedPos[0] === wx &&
    spawnPoint.bedPos[1] === y &&
    spawnPoint.bedPos[2] === wz
  ) {
    spawnPoint = { x: 0.5, y: 49.05, z: 7.5, dim: 'overworld' };
  } else if (
    prevId >= BLOCK.RESPAWN_ANCHOR_0 &&
    prevId <= BLOCK.RESPAWN_ANCHOR_4 &&
    spawnPoint.anchorPos &&
    spawnPoint.anchorPos[0] === wx &&
    spawnPoint.anchorPos[1] === y &&
    spawnPoint.anchorPos[2] === wz
  ) {
    spawnPoint = { x: 0.5, y: 49.05, z: 7.5, dim: 'overworld' };
  } else if (
    isLocalOrigin &&
    gameMode === 'survival' &&
    (prevId === BLOCK.POTTED_POPPY ||
      prevId === BLOCK.POTTED_DANDELION ||
      prevId === BLOCK.POTTED_CACTUS ||
      prevId === BLOCK.POTTED_CHERRY)
  ) {
    const plantId =
      prevId === BLOCK.POTTED_POPPY
        ? BLOCK.POPPY
        : prevId === BLOCK.POTTED_DANDELION
          ? BLOCK.DANDELION
          : prevId === BLOCK.POTTED_CACTUS
            ? BLOCK.CACTUS
            : BLOCK.CHERRY_PETALS;
    world.spawnItemDrop(wx + 0.5, y + 0.45, wz + 0.5, { id: plantId, count: 1 }, 0.25);
  }
};

world.onExplosion = (ex, ey, ez) => {
  sound.playExplosion();
  pushSubtitle('Patlama!', ex, ez);
  mobs.explosionDamageAt(ex, ey, ez, 7.0, 22, world.dimension, world, sound);
  const dx = player.x - ex;
  const dy = player.y - ey;
  const dz = player.z - ez;
  const d = Math.max(1.2, Math.hypot(dx, dy, dz));
  if (d < 8) {
    const force = (8 - d) * 1.9;
    player.vx += (dx / d) * force;
    player.vy += Math.max(4, (dy / d) * force + 4.5);
    player.vz += (dz / d) * force;
    applyDamage(Math.round((8 - d) * 2.2), 'TNT Patlaması');
  }
};

// Horizon 26.3 `falling_damage.rs` & `speleothem.rs`: Falling Anvil / Stalactite crushes entities on landing!
world.onAnvilLand = (ax, ay, az, fallDist) => {
  const gain = sound.distanceGain(ax + 0.5, ay + 0.5, az + 0.5, player.x, player.y, player.z);
  if (gain > 0.04) {
    sound.playPlace('metal');
    sound.playBell();
    pushSubtitle('Ağır kütle düştü!', ax + 0.5, az + 0.5);
  }
  const crushDmg = fallDist > 1.0 ? Math.min(40, Math.max(0, Math.round((Math.ceil(fallDist) - 1) * 2))) : 0;
  if (crushDmg > 0) {
    mobs.crushEntitiesAt(ax, ay, az, crushDmg, world.dimension, world, sound);
    if (
      Math.abs(player.x - (ax + 0.5)) < 0.72 &&
      Math.abs(player.z - (az + 0.5)) < 0.72 &&
      player.y <= ay + 1.05 &&
      player.y + 1.8 >= ay - 0.1
    ) {
      applyDamage(crushDmg, 'Düşen Örs / Sarkıt');
    }
  }
};

player.onLand = (fallDist: number, landedBlock: BlockDef) => {
  sound.playStep(landedBlock.material || 'stone');
  if (elytraGliding) {
    const hardCrash = Math.abs(player.vy) > 13.5 && Math.hypot(player.vx, player.vz) > 16;
    elytraGliding = false;
    fireworkBoostTimer = 0;
    localAvatar.gliding = false;
    if (!hardCrash) return;
  }
  if (tensura.hasFallDamageImmunity()) return;
  if (fallDist <= 3.2) return;
  const mult = landedBlock.fallDamageMult ?? 1.0;
  const dmg = Math.floor((fallDist - 3.0) * mult);
  if (dmg > 0) {
    sound.playHitBlock(landedBlock.material || 'stone', 0.85);
    applyDamage(dmg, 'Yüksekten Düşme');
  }
};

player.onContactHazard = (dmg, src) => applyDamage(dmg, src);

player.onPortalTrigger = (kind) => {
  sound.playPortal();
  pushSubtitle('Boyut geçidi uğultusu');
  flashScreen('portal');
  if (kind === 'nether') {
    if (world.dimension === 'overworld') {
      switchDimension('nether', 0.5, 0.5);
      pushChat({ sender: 'Boyut', color: '#ff8a8a', text: 'Nether boyutuna geçtiniz! (Dönmek için geçide girin veya /spawn yazın)', system: true });
    } else {
      switchDimension('overworld', 15.5, -0.5);
      pushChat({ sender: 'Boyut', color: '#4ade80', text: 'Ana Dünya Köy Meydanına döndünüz.', system: true });
    }
  } else if (kind === 'end') {
    if (world.dimension !== 'end') {
      switchDimension('end', 10.5, 0.5);
      pushChat({ sender: 'Boyut', color: '#d8b4fe', text: 'The End boyutuna ulaştınız!', system: true });
    } else {
      switchDimension('overworld', 0.5, 7.5);
    }
  }
};

projectiles.onPearlLand = (px, py, pz) => {
  mobs.mountedMob = null;
  boats.mountedBoat = null;
  world.ensureAreaSyncAround(px, pz);
  player.x = px;
  player.y = py;
  player.z = pz;
  player.vx = 0; player.vy = 0; player.vz = 0;
  sound.playPortal();
  pushSubtitle('Ender İncisi ışınlandı', px, pz);
  flashScreen('portal');
  applyDamage(2, 'Ender İncisi Işınlanması');
};

projectiles.onHitEntity = (proj) => {
  const hitMob = mobs.checkProjectileHit(proj, world, sound);
  if (hitMob && proj.fromPlayer) {
    sound.playArrowDing();
    pushSubtitle(proj.kind === 'trident' ? 'Üçlü Mızrak isabet etti!' : 'Mermi isabet etti');
  }
  return hitMob;
};
projectiles.onHitPlayer = (dmg, src, kx = 0, kz = 0) => applyCombatDamage(dmg, src, kx, kz);
function triggerCrystalExplosion(bx: number, by: number, bz: number) {
  world.setBlock(bx, by, bz, BLOCK.AIR, true);
  server.broadcastBlockEdit(bx, by, bz, BLOCK.AIR, world.dimension);
  world.spawnBlockDebris(bx, by, bz, BLOCK.AMETHYST_BLOCK);
  sound.playExplosion();
  pushSubtitle('End Kristali patladı', bx + 0.5, bz + 0.5);
  const ex = bx + 0.5;
  const ey = by + 0.5;
  const ez = bz + 0.5;
  mobs.explosionDamageAt(ex, ey, ez, 6.5, 20, world.dimension, world, sound);
  mobs.windBurstWave(ex, ey, ez, world.dimension);
  const dx = player.x - ex;
  const dy = player.y - ey;
  const dz = player.z - ez;
  const d = Math.max(1.1, Math.hypot(dx, dy, dz));
  if (d < 6.5) {
    const force = (6.5 - d) * 1.8;
    player.vx += (dx / d) * force;
    player.vy += Math.max(3.6, (dy / d) * force + 3.8);
    player.vz += (dz / d) * force;
    applyDamage(Math.round((6.5 - d) * 2.4), 'End Kristali Patlaması');
  }
}

projectiles.onDestroyCrystal = (bx, by, bz) => {
  triggerCrystalExplosion(bx, by, bz);
};
projectiles.onTridentReturn = (returnStack) => {
  sound.playTridentReturn();
  if (uiMode === 'dead') {
    world.spawnItemDrop(player.x, Math.max(2, player.y + 0.8), player.z, { ...returnStack }, 0.4);
  } else {
    giveOrDropItem(returnStack);
  }
  pushSubtitle('Üçlü Mızrak geri döndü!');
};
projectiles.onHitTargetBlock = (bx, by, bz, power, fromLocal) => {
  activeTargetBlocks.set(`${world.dimension}:${bx},${by},${bz}`, { power, remaining: 1.0, dim: world.dimension });
  propagateRedstoneAround(bx, by, bz);
  if (fromLocal) {
    if (power >= 12) sound.playArrowDing();
    pushSubtitle(`Hedef Bloğu vuruldu! (Sinyal: ${power}/15)`, bx + 0.5, bz + 0.5);
  }
};
projectiles.onWindBurst = (wx, wy, wz, fromLocal, fromAlly) => {
  if (sound.distanceGain(wx, wy, wz, player.x, player.y, player.z) > 0.04) {
    sound.playRiptide();
    pushSubtitle('Rüzgar Yükü patladı!', wx, wz);
  }
  world.spawnBlockDebris(Math.floor(wx), Math.floor(wy), Math.floor(wz), BLOCK.SNOW_BLOCK);
  mobs.windBurstWave(wx, wy, wz, world.dimension);

  // Horizon 26.3 `wind.rs`: Rocket-jump launch (allied companion Breeze charges NEVER knock the player!)
  if (!fromAlly) {
    const dx = player.x - wx;
    const dy = player.y + 0.9 - wy;
    const dz = player.z - wz;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 3.6) {
      const hDist = Math.hypot(dx, dz);
      const boost = Math.max(0.35, 1 - dist / 3.6);
      if (hDist > 0.08) {
        player.vx += (dx / hDist) * 6.4 * boost;
        player.vz += (dz / hDist) * 6.4 * boost;
      }
      player.vy = Math.max(player.vy, 11.8 * boost + 2.2);
      player.onGround = false;
      player.setWindBurstGrace(player.y);
    }
  }

  // Flip nearby doors, trapdoors, levers & ring bells (`wind.rs` redstone/door interaction)
  if (fromLocal) {
    const ibx = Math.floor(wx);
    const iby = Math.floor(wy);
    const ibz = Math.floor(wz);
    const toggledDoors = new Set<string>();
    for (let oy = -1; oy <= 1; oy++) {
      for (let oz = -1; oz <= 1; oz++) {
        for (let ox = -1; ox <= 1; ox++) {
          const tx = ibx + ox;
          const ty = iby + oy;
          const tz = ibz + oz;
          const id = world.getBlock(tx, ty, tz);
          if (id === BLOCK.OAK_DOOR_CLOSED || id === BLOCK.OAK_DOOR_OPEN) {
            const dk = `${tx},${ty},${tz}`;
            if (toggledDoors.has(dk)) continue;
            const next = id === BLOCK.OAK_DOOR_CLOSED ? BLOCK.OAK_DOOR_OPEN : BLOCK.OAK_DOOR_CLOSED;
            world.setBlock(tx, ty, tz, next, false);
            server.broadcastBlockEdit(tx, ty, tz, next, world.dimension);
            toggledDoors.add(dk);
            for (const dyOff of [-1, 1]) {
              const adj = world.getBlock(tx, ty + dyOff, tz);
              if (adj === BLOCK.OAK_DOOR_CLOSED || adj === BLOCK.OAK_DOOR_OPEN) {
                world.setBlock(tx, ty + dyOff, tz, next, false);
                server.broadcastBlockEdit(tx, ty + dyOff, tz, next, world.dimension);
                toggledDoors.add(`${tx},${ty + dyOff},${tz}`);
                break;
              }
            }
          } else if (id === BLOCK.OAK_TRAPDOOR_CLOSED || id === BLOCK.OAK_TRAPDOOR_OPEN) {
            const next = id === BLOCK.OAK_TRAPDOOR_CLOSED ? BLOCK.OAK_TRAPDOOR_OPEN : BLOCK.OAK_TRAPDOOR_CLOSED;
            world.setBlock(tx, ty, tz, next, false);
            server.broadcastBlockEdit(tx, ty, tz, next, world.dimension);
          } else if (id === BLOCK.LEVER_OFF || id === BLOCK.LEVER_ON) {
            const next = id === BLOCK.LEVER_OFF ? BLOCK.LEVER_ON : BLOCK.LEVER_OFF;
            world.setBlock(tx, ty, tz, next, false);
            server.broadcastBlockEdit(tx, ty, tz, next, world.dimension);
            propagateRedstoneAround(tx, ty, tz);
          } else if (id === BLOCK.BELL_BLOCK) {
            sound.playBell();
          }
        }
      }
    }
  }
};

mobs.onPlayerDamage = (dmg, src, kx, kz) => applyCombatDamage(dmg, src, kx, kz);
mobs.onPlayerHeal = (amt) => {
  if (gameMode === 'survival' && health > 0 && health < 20 && uiMode !== 'dead') {
    health = Math.min(20, health + amt);
    renderVitalsAndXp();
  }
};
mobs.onOpenVillagerTrade = () => openInventoryModal('trade');
mobs.onToast = (text, color) => pushChat({ sender: 'Horizon', color: color || '#4ade80', text, system: true });
mobs.onWorldBlockChange = (wx, y, wz, blockId) => server.broadcastBlockEdit(wx, y, wz, blockId, world.dimension);
mobs.onMobKilled = (mob) => {
  const isBoss = mob.species === 'wither' || mob.species === 'warden';
  const epGain = isBoss ? 2400 : mob.hostile ? 160 + Math.round(mob.maxHp * 6) : 45;
  const soulGain = isBoss ? 5 : mob.hostile ? 1 : 0;
  tensura.grantEpAndSoul(epGain, soulGain, mob.name);
  syncTensuraFormAndStats();
};
mobs.onDragonDefeated = () => {
  tensura.grantEpAndSoul(6000, 10, 'Ender Ejderhası');
  syncTensuraFormAndStats();
};

function formatPingLabel(pingMs: number): string {
  return pingMs > 0 ? `${pingMs} ms` : 'Ölçülüyor...';
}

// ============================================================================
// SINGLE GLOBAL MULTIPLAYER SERVER ("Horizon Global #1")
// ============================================================================
const remoteAvatars = new Map<string, VoxelCharacter>();
const server = new GlobalHorizonServer(getCleanName(), selectedColor);
armorStands.onSyncEvent = (ev) => server.broadcastWorldEvent(ev);

server.getWorldDiff = () => world.getAllEdits();

server.onStatusChange = () => {
  const count = server.onlineCount();
  const globalLive = server.connectedGlobal;
  const pingTxt = formatPingLabel(server.currentPing);
  lobbyNetDot.className = 'status-dot ' + (globalLive ? 'online' : 'local');
  lobbyOnlineText.textContent = globalLive ? 'Global Sunucu Aktif' : 'Ağ Bağlanıyor';
  lobbyPingBadge.textContent = pingTxt;
  lobbyPlayersCount.textContent = `${count} Oyuncu Çevrimiçi`;
  pauseServerStatus.textContent = `Horizon Global #1 — ${count} Oyuncu · ${pingTxt}`;
  if (hudPingVal) hudPingVal.textContent = pingTxt;
  refreshTabScoreboard();
};

server.onPeerJoin = (peer: RemotePlayerState) => {
  const av = new VoxelCharacter(peer.name, peer.color, atlas.texture, true);
  av.targetPos.set(peer.x, peer.y, peer.z);
  av.root.position.set(peer.x, peer.y, peer.z);
  av.setHeldBlock(peer.held);
  av.setArmor(...peer.armor);
  av.setOffhandItem(peer.offhandId || (peer.offhandShield ? ITEM.SHIELD : 0));
  av.setSlimeForm(Boolean(peer.slimeForm), 4);
  av.root.visible = peer.dim === world.dimension;
  scene.add(av.root);
  remoteAvatars.set(peer.id, av);
  pushChat({ sender: 'Sunucu', color: '#4ade80', text: `${peer.name} Horizon Global #1 dünyasına katıldı.`, system: true });
};

server.onPeerUpdate = (peer: RemotePlayerState) => {
  let av = remoteAvatars.get(peer.id);
  if (!av) return;

  if (av.renderedName !== peer.name || av.renderedColor !== peer.color) {
    const prevPos = av.root.position.clone();
    const prevYaw = av.root.rotation.y;
    const prevWalk = av.walkPhase;
    av.dispose(scene);
    av = new VoxelCharacter(peer.name, peer.color, atlas.texture, true);
    av.root.position.copy(prevPos);
    av.root.rotation.y = prevYaw;
    av.walkPhase = prevWalk;
    scene.add(av.root);
    remoteAvatars.set(peer.id, av);
    refreshTabScoreboard();
  }

  const wasVisible = av.root.visible;
  av.root.visible = peer.dim === world.dimension;
  av.targetPos.set(peer.x, peer.y, peer.z);
  if ((!wasVisible && av.root.visible) || av.root.position.distanceToSquared(av.targetPos) > 64) {
    av.root.position.copy(av.targetPos);
    av.root.rotation.y = peer.yaw;
  }
  av.targetYaw = peer.yaw;
  av.targetPitch = peer.pitch;
  av.sneaking = peer.sneak;
  av.blocking = peer.blocking;
  av.setHeldBlock(peer.held);
  av.setArmor(...peer.armor);
  av.setOffhandItem(peer.offhandId || (peer.offhandShield ? ITEM.SHIELD : 0));
  av.setSlimeForm(Boolean(peer.slimeForm), 4);
};

server.onPeerSwing = (peerId: string) => {
  remoteAvatars.get(peerId)?.triggerSwing();
};

server.onPeerHurt = (peerId: string) => {
  const av = remoteAvatars.get(peerId);
  if (!av) return;
  av.triggerHurt();
  const gain = sound.distanceGain(av.root.position.x, av.root.position.y, av.root.position.z, player.x, player.y, player.z);
  if (gain > 0.06) {
    sound.playHurt();
    pushSubtitle('Oyuncu yaralandı', av.root.position.x, av.root.position.z);
  }
};

server.onPeerMine = (pkt) => {
  if (pkt.dim !== world.dimension) {
    world.clearRemoteCrackByPeer(pkt.peerId);
    return;
  }
  world.updateRemoteBreakCrack(pkt.peerId, pkt.wx, pkt.y, pkt.wz, pkt.stage);
  if (pkt.stage >= 0) {
    remoteAvatars.get(pkt.peerId)?.triggerSwing();
    world.spawnMiningChips(pkt.wx, pkt.y, pkt.wz, pkt.nx, pkt.ny, pkt.nz, pkt.blockId, 3);
    const gain = sound.distanceGain(pkt.wx + 0.5, pkt.y + 0.5, pkt.wz + 0.5, player.x, player.y, player.z);
    if (gain > 0.03) {
      const pan = sound.stereoPan(pkt.wx + 0.5, pkt.wz + 0.5, player.x, player.z, player.yaw);
      sound.playHitBlock(getBlock(pkt.blockId).material, gain, pan);
      pushSubtitle('Blok kazılıyor', pkt.wx + 0.5, pkt.wz + 0.5);
    }
  }
};

server.onPeerProjectile = (pkt) => {
  if (pkt.dim !== world.dimension) return;
  if (pkt.kind === 'arrow') {
    projectiles.shootArrow(pkt.x, pkt.y, pkt.z, pkt.dx, pkt.dy, pkt.dz, pkt.speed, false, 6, true);
  } else if (pkt.kind === 'snowball') {
    projectiles.shootSnowball(pkt.x, pkt.y, pkt.z, pkt.dx, pkt.dy, pkt.dz, false, true, 1);
  } else if (pkt.kind === 'trident') {
    projectiles.throwTrident(pkt.x, pkt.y, pkt.z, pkt.dx, pkt.dy, pkt.dz, pkt.speed, false, true, 9);
  } else if (pkt.kind === 'wind_charge') {
    projectiles.shootWindCharge(pkt.x, pkt.y, pkt.z, pkt.dx, pkt.dy, pkt.dz, pkt.speed, false);
  } else {
    projectiles.throwEnderPearl(pkt.x, pkt.y, pkt.z, pkt.dx, pkt.dy, pkt.dz, false);
  }
  if (sound.distanceGain(pkt.x, pkt.y, pkt.z, player.x, player.y, player.z) > 0.04) {
    if (pkt.kind === 'trident') sound.playTridentThrow();
    else sound.playBow();
    pushSubtitle(
      pkt.kind === 'snowball'
        ? 'Kartopu fırlatıldı'
        : pkt.kind === 'trident'
          ? 'Üçlü Mızrak fırlatıldı'
          : pkt.kind === 'wind_charge'
            ? 'Rüzgar Yükü fırlatıldı'
            : 'Ok fırlatıldı',
      pkt.x,
      pkt.z
    );
  }
};

server.onRemoteTnt = (wx, y, wz, dim) => {
  if (dim === world.dimension) {
    world.igniteTnt(wx, y, wz, false);
    if (sound.distanceGain(wx + 0.5, y + 0.5, wz + 0.5, player.x, player.y, player.z) > 0.04) {
      sound.playFuse();
      pushSubtitle('TNT tıslaması', wx + 0.5, wz + 0.5);
    }
  }
};

server.onPeerLeave = (peerId: string, name: string) => {
  world.clearRemoteCrackByPeer(peerId);
  const av = remoteAvatars.get(peerId);
  if (av) {
    av.dispose(scene);
    remoteAvatars.delete(peerId);
  }
  pushChat({ sender: 'Sunucu', color: '#f2c46b', text: `${name} sunucudan ayrıldı.`, system: true });
};

server.onBlockEdit = (edits, isLive) => world.applyRemoteEditsBatch(edits, isLive);
server.onWorldEvent = (ev) => {
  if (!ev || typeof ev.t !== 'string') return;
  if (ev.t === 'note' && Number.isInteger(ev.x) && Number.isInteger(ev.y) && Number.isInteger(ev.z)) {
    const dim = (ev.dm === 'nether' || ev.dm === 'end' ? ev.dm : 'overworld') as DimensionId;
    const pitch = Math.max(0, Math.min(24, Number(ev.p) || 0));
    noteBlockPitches.set(`${dim}:${ev.x},${ev.y},${ev.z}`, pitch);
    if (dim === world.dimension && sound.distanceGain(ev.x + 0.5, ev.y + 0.5, ev.z + 0.5, player.x, player.y, player.z) > 0.03) {
      sound.playNoteBlock(pitch, noteBlockInstrumentBelow(ev.x, ev.y, ev.z));
      pushSubtitle('Nota Bloğu çaldı', ev.x + 0.5, ev.z + 0.5);
    }
  } else if (ev.t === 'jukebox' && typeof ev.k === 'string') {
    if (ev.on) {
      jukeboxPlayingAt = ev.k;
      if (ev.k.startsWith(`${world.dimension}:`)) sound.playMusicDisc();
    } else if (jukeboxPlayingAt === ev.k) {
      sound.stopMusicDisc();
      jukeboxPlayingAt = null;
    }
  } else if (ev.t === 'cake' && typeof ev.k === 'string') {
    const b = Number(ev.b) || 0;
    if (b >= 7) cakeBites.delete(ev.k);
    else cakeBites.set(ev.k, b);
  } else if (ev.t === 'chest' && typeof ev.k === 'string' && Array.isArray(ev.s)) {
    const clean = new Array<ItemStack | null>(27).fill(null);
    for (let i = 0; i < Math.min(27, ev.s.length); i++) {
      const s = ev.s[i];
      if (s && typeof s.id === 'number' && s.id > 0 && typeof s.count === 'number' && s.count > 0) {
        clean[i] = {
          id: s.id,
          count: Math.min(64, Math.floor(s.count)),
          damage: s.damage,
          ench: s.ench,
          loaded: s.loaded
        };
      }
    }
    chestStorage.set(ev.k, clean);
    savePersistedChests(false);
    if (uiMode === 'inventory' && activeInvTab === 'chest' && activeChestKey === ev.k) {
      refreshModalInventory();
    }
  } else if (ev.t === 'stand') {
    armorStands.applyRemoteEvent(ev);
  }
};
server.onChat = (msg) => pushChat(msg);
server.onStatusChange();

function refreshTabScoreboard() {
  tabRowsEl.innerHTML = '';
  const dimLabels: Record<DimensionId, string> = { overworld: 'Dünya', nether: 'Nether', end: 'End' };
  const all = [
    { name: `${server.selfName} (Sen)`, color: server.selfColor, ping: server.currentPing, dim: world.dimension },
    ...Array.from(server.peers.values()).map((p) => ({
      name: p.name,
      color: p.color,
      ping: p.ping,
      dim: p.dim
    }))
  ];
  for (const row of all) {
    const div = document.createElement('div');
    div.className = 'tab-player-row';

    const left = document.createElement('div');
    left.className = 'tab-p-left';
    const av = document.createElement('span');
    av.className = 'tab-avatar';
    av.style.background = sanitizeHexColor(row.color);
    const nm = document.createElement('span');
    nm.textContent = row.name;
    left.append(av, nm);

    const right = document.createElement('div');
    right.className = 'tab-p-right';
    const dm = document.createElement('span');
    dm.textContent = `${dimLabels[row.dim]} · ${row.ping > 0 ? `${row.ping}ms` : '...'}`;
    right.append(dm, makePingBarsElement(row.ping > 0 ? row.ping : 35));

    div.append(left, right);
    tabRowsEl.appendChild(div);
  }
}

function updateLocatorBar() {
  locatorPipsEl.innerHTML = '';
  for (const peer of server.peers.values()) {
    if (peer.dim !== world.dimension) continue;
    const dx = peer.x - player.x;
    const dz = peer.z - player.z;
    const bearing = Math.atan2(-dx, -dz);
    let rel = bearing - player.yaw;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    if (Math.abs(rel) > Math.PI * 0.65) continue;

    const pct = 50 - (rel / (Math.PI * 0.65)) * 48;
    const pip = document.createElement('span');
    pip.className = 'locator-pip';
    pip.style.left = `${pct.toFixed(1)}%`;
    pip.style.background = sanitizeHexColor(peer.color);
    locatorPipsEl.appendChild(pip);
  }
}

// ============================================================================
// CHAT, COMMANDS & DIMENSION TRAVEL
// ============================================================================
function pushChat(msg: { sender: string; color: string; text: string; system?: boolean }) {
  const line = document.createElement('div');
  line.className = 'chat-line';
  if (msg.system) {
    line.style.color = sanitizeHexColor(msg.color, '#a9a9ff');
    line.textContent = `[Horizon] ${msg.text}`;
  } else {
    const nameEl = document.createElement('strong');
    nameEl.style.color = sanitizeHexColor(msg.color, '#a9a9ff');
    nameEl.textContent = `<${msg.sender}> `;
    line.append(nameEl, document.createTextNode(msg.text));
  }
  chatMessagesEl.appendChild(line);
  while (chatMessagesEl.children.length > 9) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild!);
  }
  window.setTimeout(() => line.classList.add('faded'), 10000);
}

pushChat({
  sender: 'Büyük Bilge',
  color: '#38bdf8',
  text: 'Zümrüt Çayır · Tempest (#2026077) dünyasına reenkarne oldunuz! [K] Büyük Bilge RPG Menüsü · [R] Avcı Yeteneği · [V] Balçık/İnsan Formu (/help)',
  system: true
});

let timeOfDay = 0.27; // Bright crisp morning-noon start
let cameraPerson: 0 | 1 | 2 = 0;
let showF3 = false;
let jukeboxPlayingAt: string | null = null;

function switchDimension(dim: DimensionId, tx: number, tz: number, targetY?: number) {
  mobs.mountedMob = null;
  boats.mountedBoat = null;
  projectiles.clear();
  weatherSys.clearSparks();
  if (jukeboxPlayingAt && !jukeboxPlayingAt.startsWith(`${dim}:`)) {
    sound.stopMusicDisc();
    jukeboxPlayingAt = null;
  }
  server.broadcastMine(0, 0, 0, -1, 0, 0, 1, 0, world.dimension);
  world.setDimension(dim, tx, tz);
  player.x = tx;
  player.z = tz;
  player.y = targetY ?? world.getSafeSurfaceY(tx, tz);
  player.vx = 0; player.vy = 0; player.vz = 0;
  player.resetFallDistance();
  server.selfDim = dim;
  server.publishPresenceNow(true);
  for (const [id, av] of remoteAvatars.entries()) {
    const p = server.peers.get(id);
    av.root.visible = !!p && p.dim === dim;
  }
}

function updateGamemodeLabels() {
  pauseGamemodeBtn.textContent = gameMode === 'creative' ? 'Mod: Yaratıcı (F4)' : 'Mod: Hayatta Kalma (F4)';
  mobBtnMode.textContent = gameMode === 'creative' ? 'Yaratıcı' : 'Hayatta';
  mobBtnMode.classList.toggle('active', gameMode === 'creative');
}

function toggleGameMode(target?: 'survival' | 'creative') {
  gameMode = target ?? (gameMode === 'survival' ? 'creative' : 'survival');
  player.flying = gameMode === 'creative' || (player.flying && tensura.canDemonLordFly());
  player.vy = 0;
  if (player.flying) {
    mobileSneakLocked = false;
    input.sneak = false;
    mobBtnCrouch.classList.remove('active', 'pressed');
  }
  updateGamemodeLabels();
  renderVitalsAndXp();
  if (uiMode === 'inventory') {
    if (gameMode === 'survival' && activeInvTab === 'catalog') setInvTab('craft');
    else refreshModalInventory();
  }
}

function handleCommand(raw: string) {
  const parts = raw.slice(1).trim().split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();

  if (cmd === 'help' || cmd === 'yardim') {
    pushChat({
      sender: 'Komutlar',
      color: '#a9a9ff',
      text: '/arena, /donus <karakter>, /isim [ad], /dost, /bilge <soru>, /form, /spawn, /nether, /end, /summon <tür>, /weather, /rtp, /gamemode <0|1>, /time, /tp, /heal, /seed, /list',
      system: true
    });
    return;
  }
  if (cmd === 'arena' || cmd === 'sinav' || cmd === 'raid') {
    if (world.dimension !== 'overworld') {
      switchDimension('overworld', -14.5, -11.5);
    } else if (Math.hypot(player.x - (-18), player.z - (-13)) > 24) {
      world.ensureAreaSyncAround(-18, -13);
      player.x = -13.5;
      player.z = -11.5;
      player.y = world.getSafeSurfaceY(player.x, player.z);
      player.vy = 0;
    }
    startTempestArena();
    return;
  }
  if (cmd === 'bilge' || cmd === 'sage' || cmd === 'raphael' || cmd === 'ciel') {
    const q = raw.slice(1 + cmd.length).trim() || 'Durumum nedir?';
    askGreatSageInteractive(q);
    return;
  }
  if (cmd === 'donus' || cmd === 'karakter' || cmd === 'transform' || cmd === 'evrim' || cmd === 'evolve') {
    const arg = raw.slice(1 + cmd.length).trim();
    if (!arg) {
      openTensuraModal();
      return;
    }
    const res = tensura.transformIntoCharacter(arg);
    syncTensuraFormAndStats();
    if (!res.ok) {
      pushChat({ sender: tensura.getSageName(), color: '#fbbf24', text: res.msg, system: true });
    }
    return;
  }
  if (cmd === 'dost' || cmd === 'ordu' || cmd === 'ally') {
    const custom = raw.slice(1 + cmd.length).trim();
    summonLoyalCompanion(custom);
    return;
  }
  if (cmd === 'isim' || cmd === 'name') {
    const custom = raw.slice(1 + cmd.length).trim();
    nameLookedAtMob(custom);
    return;
  }
  if (cmd === 'form' || cmd === 'slime') {
    const canStand = !player.collidesAt(world, player.x, player.y, player.z, player.standHeight, player.y);
    const res = tensura.toggleHumanMimicry(canStand);
    syncTensuraFormAndStats();
    pushChat({ sender: tensura.getSageName(), color: '#38bdf8', text: res.msg, system: true });
    return;
  }
  if (cmd === 'weather' || cmd === 'hava') {
    const sub = (parts[1] || 'clear').toLowerCase();
    const map: Record<string, WeatherKind> = {
      clear: 'clear', acik: 'clear', gunes: 'clear',
      rain: 'rain', yagmur: 'rain',
      snow: 'snow', kar: 'snow',
      thunder: 'thunder', firtina: 'thunder'
    };
    const kind = map[sub] || 'rain';
    weatherSys.setWeather(kind);
    pushChat({ sender: 'Horizon', color: '#7dd3fc', text: `Hava durumu güncellendi: ${kind}`, system: true });
    return;
  }
  if (cmd === 'summon' || cmd === 'mob') {
    const req = (parts[1] || '').toLowerCase();
    const match = ALL_MOB_SPECIES.find((m) => m.species === req);
    if (!match) {
      pushChat({
        sender: 'Canlılar (24 Tür)',
        color: '#a9a9ff',
        text: `Kullanım: /summon <tür> · Türler: ${ALL_MOB_SPECIES.map((s) => s.species).join(', ')}`,
        system: true
      });
      return;
    }
    const dir = lookDirection();
    const sx = player.x + dir.dx * 3.0;
    const sz = player.z + dir.dz * 3.0;
    const sy = world.getSafeSurfaceY(sx, sz);
    mobs.spawnMob(match.species, sx, sy, sz, world.dimension);
    pushChat({ sender: 'Horizon', color: '#4ade80', text: `${match.name} çağrıldı!`, system: true });
    return;
  }
  if (cmd === 'spawn' || cmd === 'overworld') {
    switchDimension('overworld', 0.5, 7.5);
    pushChat({ sender: 'Horizon', color: '#4ade80', text: 'Köy Meydanına ışınlandınız.', system: true });
    return;
  }
  if (cmd === 'nether') {
    switchDimension('nether', 0.5, 0.5);
    pushChat({ sender: 'Horizon', color: '#ff8a8a', text: 'Nether boyutuna ışınlandınız.', system: true });
    return;
  }
  if (cmd === 'end') {
    switchDimension('end', 10.5, 0.5);
    pushChat({ sender: 'Horizon', color: '#d8b4fe', text: 'The End boyutuna ışınlandınız!', system: true });
    return;
  }
  if (cmd === 'rtp') {
    mobs.mountedMob = null;
    boats.mountedBoat = null;
    const rx = Math.round((Math.random() - 0.5) * 600);
    const rz = Math.round((Math.random() - 0.5) * 600);
    world.ensureAreaSyncAround(rx, rz);
    player.x = rx + 0.5;
    player.z = rz + 0.5;
    player.y = world.getSafeSurfaceY(player.x, player.z);
    player.vy = 0;
    pushChat({ sender: 'Horizon', color: '#4ade80', text: `Rastgele keşif noktası: ${rx}, ${rz}`, system: true });
    return;
  }
  if (cmd === 'fly' || cmd === 'gamemode' || cmd === 'gm') {
    if (parts[1] === 'survival' || parts[1] === '0' || parts[1] === 's') toggleGameMode('survival');
    else if (parts[1] === 'creative' || parts[1] === '1' || parts[1] === 'c') toggleGameMode('creative');
    else toggleGameMode();
    pushChat({ sender: 'Horizon', color: '#a9a9ff', text: `Oyun modu: ${gameMode === 'creative' ? 'Yaratıcı (Uçuş)' : 'Hayatta Kalma'}`, system: true });
    return;
  }
  if (cmd === 'heal') {
    health = 20; hunger = 20; saturation = 5; renderVitalsAndXp();
    pushChat({ sender: 'Horizon', color: '#4ade80', text: 'Can ve açlık yenilendi.', system: true });
    return;
  }
  if (cmd === 'time') {
    const sub = parts[1] === 'set' ? parts[2] : parts[1];
    if (sub === 'day' || sub === 'gunduz') timeOfDay = 0.25;
    else if (sub === 'sunset' || sub === 'aksam') timeOfDay = 0.51;
    else if (sub === 'night' || sub === 'gece') timeOfDay = 0.78;
    pushChat({ sender: 'Horizon', color: '#f2c46b', text: `Dünya saati güncellendi (${sub || 'day'}).`, system: true });
    return;
  }
  if (cmd === 'seed') {
    pushChat({ sender: 'Horizon', color: '#4ade80', text: `Ortak Dünya Seed: ${WORLD_SEED}`, system: true });
    return;
  }
  if (cmd === 'list') {
    const names = [server.selfName, ...Array.from(server.peers.values()).map((p) => p.name)];
    pushChat({ sender: 'Oyuncular', color: '#4ade80', text: `Çevrimiçi (${names.length}): ${names.join(', ')}`, system: true });
    return;
  }
  if (cmd === 'tp') {
    mobs.mountedMob = null;
    boats.mountedBoat = null;
    if (parts.length >= 4) {
      const tx = parseFloat(parts[1]), ty = parseFloat(parts[2]), tz = parseFloat(parts[3]);
      if (Number.isFinite(tx) && Number.isFinite(ty) && Number.isFinite(tz)) {
        world.ensureAreaSyncAround(tx, tz);
        player.x = tx; player.y = ty; player.z = tz; player.vy = 0;
        pushChat({ sender: 'Horizon', color: '#4ade80', text: `Işınlandı: ${tx}, ${ty}, ${tz}`, system: true });
        return;
      }
    } else if (parts[1]) {
      const target = Array.from(server.peers.values()).find((p) => p.name.toLowerCase() === parts[1].toLowerCase());
      if (target) {
        if (target.dim !== world.dimension) switchDimension(target.dim, target.x, target.z);
        else world.ensureAreaSyncAround(target.x, target.z);
        player.x = target.x; player.y = target.y + 0.5; player.z = target.z; player.vy = 0;
        pushChat({ sender: 'Horizon', color: '#4ade80', text: `${target.name} yanına ışınlandınız.`, system: true });
        return;
      }
    }
    pushChat({ sender: 'Hata', color: '#ff8a8a', text: 'Kullanım: /tp <x> <y> <z> veya /tp <oyuncu>', system: true });
    return;
  }
  if (cmd === 'clear') {
    chatMessagesEl.innerHTML = '';
    return;
  }
  pushChat({ sender: 'Hata', color: '#ff8a8a', text: `Bilinmeyen komut: /${cmd} (/help yazın)`, system: true });
}

// ============================================================================
// UI MODE, PAUSE MENU & HORIZON SETTINGS MANAGEMENT
// ============================================================================
let uiMode: UIMode = 'launcher';
let settingsOpenedFromLauncher = false;
let mouseSensitivity = 1.0;

const input: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  sneak: false,
  sprint: false
};

let lastSpacePress = 0;
let lastWPressMs = 0;
let ctrlKeyHeld = false;
let cKeyHeld = false;
let sprintLatched = false;
let sprintToggleMode = localStorage.getItem('horizon_sprint_toggle') === '1';
let autoFullscreenLock = localStorage.getItem('horizon_autofs_lock') !== '0';
let userOptedOutFullscreen = false;
let programmaticFsRequest = false;
let fullscreenTransitionUntil = 0;
let doubleTapSprint = false;
let hasUserPlayedSession = false;
let lastRightMouseDownMs = 0;
let lastSpearSlotIdx = 0;
let camelDashCooldown = 0;
let camelDashBoost = 0;
let leftMouseHeld = false;
let rightMouseHeld = false;
let rightPlaceCooldown = 0;
let miningTargetKey = '';
let miningProgress = 0;
let postBreakDelay = 0;
let attackCooldown = 0;
let shieldRaiseTimer = 0;
let eatingActive = false;
let eatingIsOffhand = false;
let eatingItemId = 0;
let eatingTimer = 0;
let eatingCrunchClock = 0;
let goldenAppleRegenTimer = 0;
let wasPlayerInWater = false;
let bowDrawing = false;
let bowCharge = 0;
let tridentDrawing = false;
let tridentCharge = 0;
let crossbowCharging = false;
let crossbowCharge = 0;
let spearCouching = false;
let spearStrikeCooldown = 0;
let spyglassZooming = false;
let elytraGliding = false;
let elytraWearAccum = 0;
let fireworkBoostTimer = 0;
let fireworkSparkAccum = 0;
const pendingSkyFireworks: Array<{ x: number; y: number; z: number; timer: number; colA: number; colB: number }> = [];

// 3D Fishing Rod Bobber & Catenary Line
const fishingBobberGroup = new THREE.Group();
{
  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.10, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  lower.position.y = 0.05;
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.10, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  upper.position.y = 0.15;
  const tip = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x334155 })
  );
  tip.position.y = 0.23;
  fishingBobberGroup.add(lower, upper, tip);
  fishingBobberGroup.visible = false;
  scene.add(fishingBobberGroup);
}
const fishingLinePositions = new Float32Array(7 * 3);
const fishingLineGeo = new THREE.BufferGeometry();
fishingLineGeo.setAttribute('position', new THREE.BufferAttribute(fishingLinePositions, 3));
const fishingLine = new THREE.Line(
  fishingLineGeo,
  new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.82 })
);
fishingLine.frustumCulled = false;
fishingLine.visible = false;
scene.add(fishingLine);

const fishingState = {
  active: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  inWater: false,
  biteWait: 0,
  biteWindow: 0,
  dim: 'overworld' as DimensionId
};

function retractFishingBobber() {
  fishingState.active = false;
  fishingState.inWater = false;
  fishingState.biteWindow = 0;
  fishingBobberGroup.visible = false;
  fishingLine.visible = false;
}

// ============================================================================
// 5-WAVE TEMPEST ARENA TRIAL (West Hunt Ring Altar Bell & /arena)
// ============================================================================
let arenaActive = false;
let arenaWave = 0;
let arenaWaveDelay = 0;
let arenaMobs: Array<ReturnType<typeof mobs.spawnMob>> = [];
let arenaWaveMaxHp = 1;

const ARENA_WAVE_SPECS: Array<{ title: string; roster: MobSpecies[]; ep: number; souls: number }> = [
  { title: 'Öncü Avcılar', roster: ['zombie', 'zombie', 'skeleton', 'skeleton'], ep: 2500, souls: 1 },
  { title: 'Çöl & Baskın Birliği', roster: ['husk', 'husk', 'pillager', 'pillager', 'spider'], ep: 4500, souls: 1 },
  { title: 'Fırtına & Cadı Çemberi', roster: ['breeze', 'breeze', 'witch', 'enderman'], ep: 7500, souls: 2 },
  { title: 'Heykel & Karanlık Muhafızlar', roster: ['creaking', 'creaking', 'wither_skeleton', 'wither_skeleton', 'breeze'], ep: 12000, souls: 2 },
  { title: 'Tempest Kadim Şampiyonu', roster: ['warden', 'pillager', 'pillager'], ep: 25000, souls: 5 }
];

function spawnTempestArenaWave(waveIdx: number) {
  const spec = ARENA_WAVE_SPECS[waveIdx];
  if (!spec) return;
  arenaWave = waveIdx + 1;
  arenaMobs = [];
  let sumHp = 0;
  const cx = -18.0;
  const cz = -14.0;
  world.ensureAreaSyncAround(cx, cz);
  const strikes: Array<[number, number, number]> = [];
  for (let i = 0; i < spec.roster.length; i++) {
    const ang = (i / spec.roster.length) * Math.PI * 2;
    const rad = spec.roster[i] === 'warden' ? 2.5 : 5.5 + (i % 2) * 1.8;
    const sx = cx + Math.cos(ang) * rad;
    const sz = cz + Math.sin(ang) * rad;
    const sy = world.getSafeSurfaceY(sx, sz);
    const spawned = mobs.spawnMob(spec.roster[i], sx, sy, sz, 'overworld');
    if (spec.roster[i] === 'warden') {
      spawned.name = '★ Tempest Arena Şampiyonu';
      spawned.maxHp = 220;
      spawned.hp = 220;
    }
    arenaMobs.push(spawned);
    sumHp += spawned.maxHp;
    strikes.push([sx, sy, sz]);
  }
  arenaWaveMaxHp = Math.max(1, sumHp);
  tensuraVfx.spawnTempestLightning(strikes);
  tensuraVfx.spawnNovaSphere(cx, world.getSafeSurfaceY(cx, cz) + 0.9, cz, 6.5, 0xfacc15, 0x38bdf8);
  sound.playBell();
  showVoiceOfWorldBanner(
    `« Tempest Arena · Dalga ${arenaWave}/5 »`,
    `${spec.title} sahaya indi! Tüm düşmanları alt ederek ödülleri ve EP'yi kazanın!`
  );
  pushChat({
    sender: 'Tempest Arena',
    color: '#facc15',
    text: `⚔ Dalga ${arenaWave}/5 (${spec.title}) başladı! (${spec.roster.length} düşman)`,
    system: true
  });
}

function startTempestArena() {
  if (arenaActive) {
    const alive = arenaMobs.filter((m) => !m.dead && m.deathTimer <= 0 && !m.ally).length;
    pushSubtitle(`Arena devam ediyor: Dalga ${arenaWave}/5 (${alive} düşman kaldı)`);
    sound.playBell();
    return;
  }
  arenaActive = true;
  arenaWave = 0;
  arenaWaveDelay = 0;
  spawnTempestArenaWave(0);
}

function updateTempestArena(dt: number): { title: string; hp: number; maxHp: number } | null {
  if (!arenaActive || world.dimension !== 'overworld') return null;
  let aliveCount = 0;
  let remHp = 0;
  for (let i = 0; i < arenaMobs.length; i++) {
    const m = arenaMobs[i];
    if (!m.dead && m.deathTimer <= 0 && !m.ally && !m.tamed) {
      aliveCount++;
      remHp += Math.max(0, m.hp);
    }
  }
  if (aliveCount > 0) {
    return {
      title: `⚔ Tempest Arena — Dalga ${arenaWave}/5 (${aliveCount} Düşman)`,
      hp: remHp,
      maxHp: arenaWaveMaxHp
    };
  }
  if (arenaWaveDelay <= 0) {
    const clearedSpec = ARENA_WAVE_SPECS[arenaWave - 1];
    if (clearedSpec) {
      tensura.grantEpAndSoul(clearedSpec.ep, clearedSpec.souls);
      grantXp(18 * arenaWave);
      health = Math.min(20, health + 6);
      hunger = Math.min(20, hunger + 6);
      renderVitalsAndXp();
      syncTensuraFormAndStats();
    }
    if (arenaWave >= ARENA_WAVE_SPECS.length) {
      arenaActive = false;
      arenaMobs = [];
      const ry = world.getSafeSurfaceY(-18, -12) + 0.6;
      world.spawnItemDrop(-17.5, ry, -12.0, { id: ITEM.TOTEM_OF_UNDYING, count: 1 }, 0.35);
      world.spawnItemDrop(-18.5, ry, -12.0, { id: ITEM.NETHERITE_SWORD, count: 1, ench: 3 }, 0.35);
      world.spawnItemDrop(-18.0, ry, -11.5, { id: ITEM.GOLDEN_APPLE, count: 4 }, 0.35);
      world.spawnItemDrop(-18.0, ry, -12.5, { id: ITEM.DIAMOND, count: 8 }, 0.35);
      tensuraVfx.spawnSkyPillar(-18, ry - 0.5, -11, 3.2, 18, 0xfef08a, 0x38bdf8);
      sound.playTotemPop();
      flashScreen('totem', 450);
      showVoiceOfWorldBanner(
        '« Dünya\'nın Sesi · Arena Zaferi! »',
        '5 Dalgalık Tempest Arena Sınavını tamamladınız! ★III Netherite Kılıç, Ölümsüzlük Totemi, Elmaslar ve +25,000 EP kazanıldı!'
      );
      return null;
    }
    arenaWaveDelay = 2.4;
    sound.playXp(true);
    pushSubtitle(`Dalga ${arenaWave} temizlendi! Sonraki dalga hazırlanıyor...`);
    return {
      title: `⚔ Tempest Arena — Dalga ${arenaWave + 1}/5 Hazırlanıyor...`,
      hp: arenaWaveMaxHp,
      maxHp: arenaWaveMaxHp
    };
  }
  arenaWaveDelay -= dt;
  if (arenaWaveDelay <= 0) {
    spawnTempestArenaWave(arenaWave);
  }
  return {
    title: `⚔ Tempest Arena — Dalga ${Math.min(5, arenaWave + 1)}/5 Başlıyor...`,
    hp: arenaWaveMaxHp,
    maxHp: arenaWaveMaxHp
  };
}

interface CampfireState {
  dim: DimensionId;
  bx: number;
  by: number;
  bz: number;
  timers: number[];
}
const campfireCookSlots = new Map<string, CampfireState>();
const berryCooldowns = new Map<string, number>();
const noteBlockPitches = new Map<string, number>();
const poweredNoteBlocks = new Set<string>();
const poweredCopperBulbs = new Set<string>();
const activeTargetBlocks = new Map<string, { power: number; remaining: number; dim: DimensionId }>();
const cakeBites = new Map<string, number>();

let joyTouchId: number | null = null;
let joyCenterX = 0;
let joyCenterY = 0;
let mobileSprintLocked = false;
let lookTouchId: number | null = null;
let lookLastX = 0;
let lookLastY = 0;
let breakTouchId: number | null = null;
let breakLastX = 0;
let breakLastY = 0;
let placeTouchId: number | null = null;
let placeLastX = 0;
let placeLastY = 0;
let jumpTouchId: number | null = null;
let jumpLastX = 0;
let jumpLastY = 0;
let crouchTouchId: number | null = null;

function syncMobileHudVisibility() {
  const pointerLocked = document.pointerLockElement === gameCanvas;
  const showMobile = isTouchDevice && !pointerLocked && uiMode === 'playing' && !cinematicHudHidden;
  document.body.classList.toggle('touch-active', showMobile || (isTouchDevice && uiMode === 'chat'));
  document.body.classList.toggle('chat-open', uiMode === 'chat');
  mobileControlsEl.classList.toggle('hidden', !showMobile);
  const canFs = !!(
    document.documentElement.requestFullscreen ||
    (document.documentElement as unknown as { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen
  );
  mobBtnFs.classList.toggle('hidden', !canFs);
  invDesktopHint.classList.toggle('hidden', isTouchDevice && !pointerLocked);
  invTouchBar.classList.toggle('hidden', !isTouchDevice || pointerLocked);
  mobBtnCrouch.classList.toggle('active', mobileSneakLocked);
  mobBtnMode.textContent = gameMode === 'creative' ? 'Yaratıcı' : 'Hayatta';
  mobBtnMode.classList.toggle('active', gameMode === 'creative');
}

function resetMobileTouchState() {
  joyTouchId = null;
  lookTouchId = null;
  breakTouchId = null;
  placeTouchId = null;
  jumpTouchId = null;
  crouchTouchId = null;
  pendingLookYaw = 0;
  pendingLookPitch = 0;
  spyglassZooming = false;
  bowDrawing = false;
  bowCharge = 0;
  tridentDrawing = false;
  tridentCharge = 0;
  crossbowCharging = false;
  crossbowCharge = 0;
  spearCouching = false;
  eatingActive = false;
  eatingTimer = 0;
  shieldRaiseTimer = 0;
  fpHand.bowPull = 0;
  fpHand.crossbowPull = 0;
  fpHand.tridentAim = 0;
  fpHand.spearCouch = 0;
  fpHand.eatingMainhand = 0;
  fpHand.eatingOffhand = 0;
  fpHand.blockingMainhand = false;
  fpHand.blockingOffhand = false;
  mobileSprintLocked = false;
  mobileJoystickBase.classList.remove('sprint-locked');
  mobileJoystickBase.style.transform = 'translate3d(0px, 0px, 0px)';
  mobileJoystickKnob.style.transform = 'translate3d(0px, 0px, 0px)';
  mobBtnBreak.classList.remove('pressed');
  mobBtnPlace.classList.remove('pressed');
  mobBtnJump.classList.remove('pressed');
  mobBtnCrouch.classList.remove('pressed');
}

function clearMovementKeys() {
  input.forward = false;
  input.backward = false;
  input.left = false;
  input.right = false;
  input.moveX = 0;
  input.moveZ = 0;
  input.jump = false;
  input.sneak = false;
  input.sprint = sprintToggleMode;
  input.usingItem = false;
  ctrlKeyHeld = false;
  cKeyHeld = false;
  sprintLatched = sprintToggleMode;
  doubleTapSprint = false;
  mobileSneakLocked = false;
  mobBtnCrouch.classList.remove('active');
  tabListEl.classList.add('hidden');
  resetMobileTouchState();
  leftMouseHeld = false;
  rightMouseHeld = false;
  miningProgress = 0;
  miningTargetKey = '';
  postBreakDelay = 0;
  eatingActive = false;
  eatingTimer = 0;
  shieldRaiseTimer = 0;
  bowDrawing = false;
  bowCharge = 0;
  tridentDrawing = false;
  tridentCharge = 0;
  crossbowCharging = false;
  crossbowCharge = 0;
  spearCouching = false;
  fpHand.bowPull = 0;
  fpHand.crossbowPull = 0;
  fpHand.tridentAim = 0;
  fpHand.spearCouch = 0;
  fpHand.eatingMainhand = 0;
  fpHand.eatingOffhand = 0;
  fpHand.blockingMainhand = false;
  fpHand.blockingOffhand = false;
  world.updateBreakCrack(0, 0, 0, 0);
  server.broadcastMine(0, 0, 0, -1, 0, 0, 1, 0, world.dimension);
}

window.addEventListener('blur', clearMovementKeys);
window.addEventListener('pagehide', clearMovementKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearMovementKeys();
  else if (uiMode === 'playing') sound.unlock();
});

gameCanvas.tabIndex = 0;

function lockAllBrowserKeys() {
  const navKb = (navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void } }).keyboard;
  if (!navKb?.lock) return;
  // Zero-argument lock() captures ALL OS/Browser shortcuts in Chromium & Opera GX (including Ctrl+Space "Arama sekmeleri", Ctrl+W, Ctrl+T, Ctrl+Tab)!
  navKb.lock().catch(() => {
    navKb.lock?.(LOCKED_GAMEPLAY_KEYS)?.catch?.(() => {});
  });
}

function refreshDesktopControlButtons() {
  const docAny = document as Document & { webkitFullscreenElement?: Element };
  const inFs = Boolean(document.fullscreenElement || docAny.webkitFullscreenElement);
  if (pauseFsBtn) {
    pauseFsBtn.textContent = inFs
      ? 'Tam Ekran & Tarayıcı Kısayol Kilidi: Aktif'
      : 'Tam Ekran & Kısayol Kilidini Aç (Ctrl+Space Koruma)';
  }
  if (optAutofsLock) {
    optAutofsLock.textContent = `Oto Tam Ekran Kilidi: ${autoFullscreenLock ? 'Açık' : 'Kapalı'}`;
    optAutofsLock.classList.toggle('active', autoFullscreenLock);
  }
  if (optSprintMode) {
    optSprintMode.textContent = sprintToggleMode ? 'Koşu: Sürekli Kilitli (CapsLock)' : 'Koşu: Yapışkan (Ctrl/C)';
    optSprintMode.classList.toggle('active', true);
  }
}

function requestCanvasPointerLockSafe() {
  // Never force PointerLock on touchscreens / mobile browsers where PointerLock is unsupported or disruptive
  if (isTouchDevice && (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || performance.now() - lastTouchTimestamp < 1500)) {
    return;
  }
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement && activeEl !== gameCanvas) {
    activeEl.blur();
  }
  try {
    gameCanvas.focus({ preventScroll: true });
  } catch {
    gameCanvas.focus();
  }
  try {
    const p = gameCanvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    p?.catch?.(() => {});
  } catch {
    // Ignore rapid Escape/PointerLock security rejection
  }
}

function engageImmersiveGameLock(fromDirectGesture: boolean) {
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement && activeEl !== gameCanvas) {
    activeEl.blur();
  }
  try {
    gameCanvas.focus({ preventScroll: true });
  } catch {
    gameCanvas.focus();
  }

  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  const docAny = document as Document & { webkitFullscreenElement?: Element };
  const inFs = Boolean(document.fullscreenElement || docAny.webkitFullscreenElement);

  if (
    fromDirectGesture &&
    !isTouchDevice &&
    autoFullscreenLock &&
    !userOptedOutFullscreen &&
    !inFs &&
    (docEl.requestFullscreen || docEl.webkitRequestFullscreen)
  ) {
    fullscreenTransitionUntil = performance.now() + 950;
    programmaticFsRequest = true;
    let fsPromise: Promise<void> | undefined;
    try {
      fsPromise = docEl.requestFullscreen
        ? docEl.requestFullscreen({ navigationUI: 'hide' })
        : docEl.webkitRequestFullscreen?.();
    } catch {
      fsPromise = docEl.requestFullscreen?.();
    }
    if (fsPromise && typeof fsPromise.then === 'function') {
      fsPromise
        .then(() => {
          lockAllBrowserKeys();
          refreshDesktopControlButtons();
          requestCanvasPointerLockSafe();
          window.setTimeout(() => {
            if (uiMode === 'playing' && document.pointerLockElement !== gameCanvas) {
              requestCanvasPointerLockSafe();
            }
          }, 110);
        })
        .catch(() => {
          fullscreenTransitionUntil = 0;
          programmaticFsRequest = false;
          requestCanvasPointerLockSafe();
        });
      requestCanvasPointerLockSafe();
      return;
    }
  }

  if (inFs) {
    lockAllBrowserKeys();
  }
  requestCanvasPointerLockSafe();
}

function enterPlayingMode(fromDirectGesture = false) {
  if (uiMode === 'dead') return;
  returnCursorToInventory();
  const clean = getCleanName();
  localStorage.setItem('horizon_player_name', clean);
  server.updateIdentity(clean, selectedColor);
  server.setJoinedWorld(true);

  uiMode = 'playing';
  hasUserPlayedSession = true;
  backdrop.setActive(false);
  launcherOverlay.classList.remove('visible');
  invModal.classList.add('hidden');
  pauseModal.classList.add('hidden');
  settingsModal.classList.add('hidden');
  tensuraModal?.classList.add('hidden');
  chatInputWrap.classList.add('hidden');
  hudEl.classList.toggle('hidden', cinematicHudHidden);
  syncMobileHudVisibility();
  sound.unlock();

  engageImmersiveGameLock(fromDirectGesture);
  scheduleNextFrame();
}

function openInventoryModal(station: 'none' | 'table' | 'furnace' | 'chest' | 'trade' = 'none', chestKey = '') {
  clearMovementKeys();
  uiMode = 'inventory';
  syncMobileHudVisibility();
  document.exitPointerLock?.();
  pauseModal.classList.add('hidden');
  settingsModal.classList.add('hidden');
  usingCraftingTable = station === 'table';
  activeChestKey = chestKey;

  tabBtnFurnace.classList.toggle('hidden', station !== 'furnace');
  tabBtnChest.classList.toggle('hidden', station !== 'chest');
  tabBtnTrade.classList.toggle('hidden', station !== 'trade');
  tabBtnCatalog.classList.toggle('hidden', gameMode !== 'creative');
  invSearch.classList.toggle('hidden', gameMode !== 'creative');

  invModal.classList.remove('hidden');
  invSearch.value = '';
  if (station === 'furnace') setInvTab('furnace');
  else if (station === 'chest') setInvTab('chest');
  else if (station === 'trade') setInvTab('trade');
  else if (gameMode === 'creative' && station === 'none') setInvTab('catalog');
  else setInvTab('craft');
}

function submitChatInput() {
  const txt = chatInput.value.trim();
  if (txt) {
    if (txt.startsWith('/')) handleCommand(txt);
    else server.broadcastChat(txt);
  }
  chatInput.blur();
  enterPlayingMode();
}

function openChat(prefill = '') {
  clearMovementKeys();
  uiMode = 'chat';
  syncMobileHudVisibility();
  document.exitPointerLock?.();
  hudEl.classList.remove('hidden');
  chatInputWrap.classList.remove('hidden');
  chatInput.value = prefill;
  // Synchronous focus inside user gesture so iOS/iPadOS Safari opens virtual keyboard immediately!
  try {
    chatInput.focus({ preventScroll: true });
  } catch {
    chatInput.focus();
  }
  window.setTimeout(() => {
    if (uiMode === 'chat' && document.activeElement !== chatInput) chatInput.focus();
  }, 15);
}

chatSendBtn.addEventListener('click', () => {
  sound.playClick();
  submitChatInput();
});
chatCloseBtn.addEventListener('click', () => {
  sound.playClick();
  chatInput.blur();
  enterPlayingMode();
});

function openPauseModal() {
  clearMovementKeys();
  returnCursorToInventory();
  uiMode = 'paused';
  syncMobileHudVisibility();
  document.exitPointerLock?.();
  updateGamemodeLabels();
  refreshDesktopControlButtons();
  settingsModal.classList.add('hidden');
  pauseModal.classList.remove('hidden');
}

function openSettingsModal(fromLauncher: boolean) {
  clearMovementKeys();
  settingsOpenedFromLauncher = fromLauncher;
  uiMode = 'settings';
  syncMobileHudVisibility();
  document.exitPointerLock?.();
  refreshDesktopControlButtons();
  pauseModal.classList.add('hidden');
  settingsModal.classList.remove('hidden');
}

playBtn.addEventListener('click', () => {
  sound.playClick();
  localAvatar.dispose(scene);
  localAvatar = new VoxelCharacter(getCleanName(), selectedColor, atlas.texture, false);
  localAvatar.setHeldBlock(activeItemId(), Boolean(hotbar[selectedSlot]?.loaded));
  localAvatar.setArmor(...getEquippedArmorTuple());
  localAvatar.setOffhandItem(offhandSlot?.id || 0, Boolean(offhandSlot?.loaded));
  localAvatar.root.visible = cameraPerson !== 0;
  scene.add(localAvatar.root);
  syncTensuraFormAndStats();
  enterPlayingMode(true);
});

openSettingsBtn.addEventListener('click', () => { sound.playClick(); openSettingsModal(true); });
lnavSettingsBtn.addEventListener('click', () => { sound.playClick(); openSettingsModal(true); });
pauseSettingsBtn.addEventListener('click', () => { sound.playClick(); openSettingsModal(false); });

settingsDoneBtn.addEventListener('click', () => {
  sound.playClick();
  settingsModal.classList.add('hidden');
  if (settingsOpenedFromLauncher) {
    uiMode = 'launcher';
  } else {
    openPauseModal();
  }
});

resumeBtn.addEventListener('click', () => {
  sound.playClick();
  enterPlayingMode(true);
});
pauseFsBtn?.addEventListener('click', () => {
  sound.playClick();
  toggleFullscreenSafe();
});
pauseInvBtn.addEventListener('click', () => {
  sound.playClick();
  openInventoryModal('none');
});
pauseGamemodeBtn.addEventListener('click', () => {
  sound.playClick();
  toggleGameMode();
});
spawnTpBtn.addEventListener('click', () => {
  sound.playClick();
  switchDimension('overworld', 0.5, 7.5);
  enterPlayingMode(true);
});
backTitleBtn.addEventListener('click', () => {
  sound.playClick();
  returnCursorToInventory();
  retractFishingBobber();
  elytraGliding = false;
  server.setJoinedWorld(false);
  uiMode = 'launcher';
  syncMobileHudVisibility();
  pauseModal.classList.add('hidden');
  settingsModal.classList.add('hidden');
  hudEl.classList.add('hidden');
  backdrop.setActive(true);
  launcherOverlay.classList.add('visible');
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === gameCanvas;
  syncMobileHudVisibility();
  if (locked) {
    wasPointerLocked = true;
    try {
      gameCanvas.focus({ preventScroll: true });
    } catch {
      gameCanvas.focus();
    }
    if (document.fullscreenElement) lockAllBrowserKeys();
  } else if (wasPointerLocked) {
    wasPointerLocked = false;
    // Guard against Chromium's ~50-250ms Fullscreen window resize dropping PointerLock momentarily!
    if (performance.now() < fullscreenTransitionUntil) {
      window.setTimeout(() => {
        if (uiMode === 'playing' && document.pointerLockElement !== gameCanvas) {
          requestCanvasPointerLockSafe();
        }
      }, 85);
      return;
    }
    if (uiMode === 'playing') openPauseModal();
  }
});

let cachedBaseFov = parseInt(optFov.value, 10) || 78;
optRenderDist.value = String(world.renderDistance);
valRenderDist.textContent = String(world.renderDistance);

optRenderDist.addEventListener('input', () => {
  const v = parseInt(optRenderDist.value, 10);
  world.renderDistance = v;
  valRenderDist.textContent = String(v);
});
optFov.addEventListener('input', () => {
  const v = parseInt(optFov.value, 10);
  cachedBaseFov = v;
  camera.fov = v;
  camera.updateProjectionMatrix();
  valFov.textContent = `${v}°`;
});
optSens.addEventListener('input', () => {
  const v = parseInt(optSens.value, 10);
  mouseSensitivity = v / 100;
  valSens.textContent = `${v}%`;
});
optVol.addEventListener('input', () => {
  const v = parseInt(optVol.value, 10);
  sound.volume = v / 100;
  valVol.textContent = `${v}%`;
});
document.querySelectorAll('.btn-chip[data-time]').forEach((btn) => {
  btn.addEventListener('click', () => {
    timeOfDay = parseFloat((btn as HTMLElement).dataset.time || '0.25');
    sound.playClick();
  });
});

function applyPerfModeRenderBudget() {
  const targetRd = perfMode === 'perf' ? 3 : perfMode === 'high' ? 6 : 4;
  world.renderDistance = targetRd;
  optRenderDist.value = String(targetRd);
  valRenderDist.textContent = String(targetRd);
}
applyPerfModeRenderBudget();

function refreshPerfModeChips() {
  document.querySelectorAll<HTMLButtonElement>('.btn-chip[data-perf]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.perf === perfMode);
  });
}
refreshPerfModeChips();
document.querySelectorAll<HTMLButtonElement>('.btn-chip[data-perf]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const m = (btn.dataset.perf as PerfMode) || 'turbo';
    perfMode = m;
    dynamicDprScale = 1.0;
    try { localStorage.setItem('horizon_perf_mode_v3', perfMode); } catch { /* ignore */ }
    applyPerfModeRenderBudget();
    refreshPerfModeChips();
    renderer.setPixelRatio(computeTargetPixelRatio());
    renderer.setSize(Math.max(1, lastRenderW || window.innerWidth), Math.max(1, lastRenderH || window.innerHeight));
    sound.playClick();
    scheduleNextFrame();
  });
});

optMobScale?.addEventListener('input', () => {
  const pct = parseInt(optMobScale.value, 10) || 100;
  mobBtnScale = Math.max(0.85, Math.min(1.3, pct / 100));
  applyMobilePrefsToDom();
  saveMobilePrefs();
});
optMobAutojump?.addEventListener('click', () => {
  mobAutoJump = !mobAutoJump;
  applyMobilePrefsToDom();
  saveMobilePrefs();
  sound.playClick();
});
optMobLefthand?.addEventListener('click', () => {
  mobLeftHanded = !mobLeftHanded;
  fpHand.setLeftHanded(mobLeftHanded);
  applyMobilePrefsToDom();
  saveMobilePrefs();
  sound.playClick();
});

// ============================================================================
// TENSURA: TOP 50 CHARACTERS, 16 REAL ULTIMATE SKILLS & LOYAL JURA TEMPEST ARMY
// ============================================================================
let activeTensuraTab: 'chars' | 'skills' | 'sage' = 'chars';
let activeCharFaction: TensuraFaction = 'all';
let charSearchQuery = '';

function refreshTensuraHudPill() {
  const ch = tensura.getActiveCharacter();
  const skName = tensura.getSkillDisplayName(tensura.activeSkill);
  const words = skName.split(' ');
  const shortSk = words[words.length - 1] || skName;
  if (hudRpgPill) {
    hudRpgPill.textContent = `#${ch.rank} ${ch.name} · [R] ${shortSk}`;
  }
  if (mobSkillTitle) {
    mobSkillTitle.textContent = shortSk.slice(0, 6).toUpperCase();
  }
}

function syncTensuraFormAndStats() {
  const ch = tensura.getActiveCharacter();
  const slimeNow = tensura.isSlimeBodyActive();
  player.slimeMode = slimeNow;
  player.rpgSpeedMult = tensura.getSpeedMultiplier();
  if (!tensura.canDemonLordFly() && gameMode !== 'creative') {
    player.flying = false;
  }
  localAvatar.applyCharacterVisual(ch.visual);
  localAvatar.setSlimeForm(slimeNow, 4);
  fpHand.setCharacterSleeve(ch.visual.shirt, ch.visual.skin);
  fpHand.setSlimeHand(slimeNow);
  recomputeArmorPoints();
  renderVitalsAndXp();
  refreshTensuraHudPill();
  if (uiMode === 'tensura') renderTensuraModal();
}

function findLookedOrNearestMobForNaming(): ReturnType<typeof mobs.raycastMob> {
  const eyeY = player.y + player.eyeHeight(player.isCrouching || input.sneak);
  const { dx, dy, dz } = lookDirection();
  const direct = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, 12.0, world.dimension);
  if (direct && direct !== 'dragon') return direct;

  // Generous front-cone helper: if a mob is right in front of you (<6m) moving quickly, lock onto it!
  let best = null;
  let bestScore = Infinity;
  for (const m of mobs.getMobsInDimension(world.dimension)) {
    if (m === mobs.mountedMob) continue;
    const vx = m.x - player.x;
    const vy = m.y + m.height * 0.5 - eyeY;
    const vz = m.z - player.z;
    const dist = Math.hypot(vx, vy, vz);
    if (dist > 6.2 || dist < 0.05) continue;
    const dot = (vx * dx + vy * dy + vz * dz) / dist;
    if (dot >= 0.42) {
      const score = dist - dot * 1.5 + (m.ally ? 4.0 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
  }
  return best;
}

function nameLookedAtMob(customName = '') {
  const target = findLookedOrNearestMobForNaming();
  if (!target || target === 'dragon') {
    pushChat({
      sender: tensura.getSageName(),
      color: '#fbbf24',
      text: 'İsim vermek için 12m mesafedeki herhangi bir canlıya bakın (veya [Sadık Muhafız Çağır] / /dost kullanın).',
      system: true
    });
    return;
  }
  const res = tensura.nameTargetMob(target, customName || undefined);
  if (!res.ok) {
    pushChat({ sender: tensura.getSageName(), color: '#fbbf24', text: res.msg, system: true });
    return;
  }
  mobs.recruitAsTempestAlly(target, res.assignedName || target.name, true);
  tensuraVfx.spawnNovaSphere(target.x, target.y + target.height * 0.5, target.z, 2.8, 0xfacc15, 0x38bdf8);
  sound.playTotemPop();
  pushSubtitle(`★ ${target.name} sadık dostunuz oldu!`);
  syncTensuraFormAndStats();
}

function summonLoyalCompanion(customOverride = '') {
  if (mobs.countAllies() >= 14) {
    mobs.healAlliesAround(player.x, player.z, 40, world.dimension);
    sound.playXp(true);
    pushChat({
      sender: tensura.getSageName(),
      color: '#38bdf8',
      text: 'Sadık Tempest ordunuz maksimum kapasitede (14 muhafız) — tüm dostlarınızın canı yenilendi!',
      system: true
    });
    return;
  }
  const preset = tensura.nextCompanionPreset();
  const { dx, dz } = lookDirection();
  const hLen = Math.hypot(dx, dz) || 1;
  const sx = player.x + (dx / hLen) * 2.6;
  const sz = player.z + (dz / hLen) * 2.6;
  world.ensureAreaSyncAround(sx, sz);
  const sy = world.getSafeSurfaceY(sx, sz);
  const allyName = customOverride.trim().slice(0, 18) || preset.name;
  const mob = mobs.summonTempestCompanion(preset.species, allyName, sx, sy, sz, world.dimension);
  tensura.namedCount++;
  tensura.saveNow();
  tensuraVfx.spawnNovaSphere(mob.x, mob.y + 0.8, mob.z, 2.8, 0x38bdf8, 0xfacc15);
  sound.playTotemPop();
  showVoiceOfWorldBanner(
    '« Jura Tempest Çağrısı »',
    `★ ${allyName} (${preset.role}) yanınızda belirdi! Asla size saldırmaz, düşmanlarınızı avlar.`
  );
  pushChat({
    sender: 'Tempest Ordusu',
    color: '#facc15',
    text: `★ ${allyName} (${preset.role}) sadık muhafız olarak çağrıldı!`,
    system: true
  });
  syncTensuraFormAndStats();
}

function askGreatSageInteractive(question: string) {
  const cleanQ = question.trim();
  if (!cleanQ) return;
  appendSageMessage('user', cleanQ);
  const eyeY = player.y + player.eyeHeight(player.isCrouching || input.sneak);
  const { dx, dy, dz } = lookDirection();
  const mobHit = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, 12, world.dimension);
  const answer = tensura.askGreatSage(cleanQ, {
    px: player.x,
    py: player.y,
    pz: player.z,
    biome: world.getBiomeAt(Math.floor(player.x), Math.floor(player.z)),
    dim: world.dimension,
    hp: health,
    allyCount: mobs.countAllies(),
    lookedMob: mobHit && mobHit !== 'dragon' ? mobHit : null
  });
  appendSageMessage('sage', `« ${tensura.getSageName()} » ${answer}`);
  if (uiMode !== 'tensura') {
    pushChat({ sender: tensura.getSageName(), color: '#38bdf8', text: answer, system: true });
  }
}

function switchTensuraTab(tab: 'chars' | 'skills' | 'sage') {
  activeTensuraTab = tab;
  document.querySelectorAll<HTMLButtonElement>('#tensura-modal .ts-tab-btn[data-ttab]').forEach((b) => {
    b.classList.toggle('active', b.dataset.ttab === tab);
  });
  document.getElementById('ttab-chars')?.classList.toggle('hidden', tab !== 'chars');
  document.getElementById('ttab-skills')?.classList.toggle('hidden', tab !== 'skills');
  document.getElementById('ttab-sage')?.classList.toggle('hidden', tab !== 'sage');
}

function renderTensuraModal() {
  if (!tensuraModal) return;
  const ch = tensura.getActiveCharacter();
  const maxMp = tensura.getMaxMagicules();
  const allies = mobs.countAllies();

  tensuraSageBadge.textContent = `« ${tensura.getSageName()} · Jura Tempest Federasyonu »`;
  if (sagePanelName) sagePanelName.textContent = tensura.getSageName();
  tensuraTitleText.textContent = `#${ch.rank} ${ch.name} — ${ch.title}`;
  tsEpVal.textContent = `Sv. ${tensura.getLevel()} · ${tensura.formatEp()} EP`;
  tsMpVal.textContent = `${Math.floor(tensura.magicules)} / ${maxMp} Öz`;
  tsMpFill.style.width = `${Math.min(100, Math.round((tensura.magicules / Math.max(1, maxMp)) * 100))}%`;
  tsBonusVal.textContent = `${allies} Sadık Dost · +${tensura.getNaturalArmorBonus()} Zırh · +${tensura.getMeleeDamageBonus()} Güç${tensura.canDemonLordFly() ? ' · Uçuş' : ''}`;

  if (tensuraMimicBtn) {
    tensuraMimicBtn.textContent = tensura.isSlimeBodyActive()
      ? '[V] Mavi Balçık Formu (Aktif)'
      : '[V] Balçık / İnsan Formu';
  }

  // Render Top 50 Characters Grid
  if (tensuraCharGrid) {
    tensuraCharGrid.innerHTML = '';
    const q = charSearchQuery.trim().toLocaleLowerCase('tr');
    for (const c of TOP_50_TENSURA_CHARACTERS) {
      if (activeCharFaction !== 'all' && c.faction !== activeCharFaction) continue;
      if (
        q &&
        !c.name.toLocaleLowerCase('tr').includes(q) &&
        !c.title.toLocaleLowerCase('tr').includes(q) &&
        !TENSURA_SKILLS[c.signatureSkill].name.toLocaleLowerCase('tr').includes(q) &&
        String(c.rank) !== q.replace('#', '')
      ) {
        continue;
      }
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ts-char-card' + (tensura.characterId === c.id ? ' active' : '');
      const sigName = TENSURA_SKILLS[c.signatureSkill].name;
      const secName = TENSURA_SKILLS[c.secondarySkill].name;
      card.innerHTML =
        `<div class="ts-char-top"><span class="ts-char-rank">#${c.rank}</span><span class="ts-char-ep">${c.epDisplay}</span></div>` +
        `<div class="ts-char-name"><span class="ts-char-dot" style="background:${c.visual.hair}"></span><span>${c.name}</span></div>` +
        `<div class="ts-char-sub">${c.title}</div>` +
        `<div class="ts-char-pow">[R] ${sigName} · [X] ${secName.split(' ').slice(-1)[0]}</div>`;
      card.addEventListener('click', () => {
        tensura.transformIntoCharacter(c.id);
        sound.playTotemPop();
        flashScreen('portal', 380);
        syncTensuraFormAndStats();
      });
      tensuraCharGrid.appendChild(card);
    }
  }

  // Render All 16 Canonical Ultimate Skills
  if (tensuraSkillList) {
    tensuraSkillList.innerHTML = '';
    for (const skId of ALL_SKILL_IDS) {
      const sk = TENSURA_SKILLS[skId];
      const isSelected = tensura.activeSkill === sk.id;
      const isSecondary = ch.secondarySkill === sk.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ts-skill-card' + (isSelected ? ' active' : '');
      btn.style.borderLeftColor = sk.accent;
      btn.innerHTML =
        `<strong>${isSelected ? '★ [R] ' : isSecondary ? '◆ [X] ' : ''}${sk.name} (${sk.cost} Öz)</strong>` +
        `<span class="ts-sk-meta">${sk.subName} · ${sk.damageLabel}</span>` +
        `<small>${sk.desc}</small>`;
      btn.addEventListener('click', () => {
        tensura.selectSkill(sk.id);
        sound.playClick();
        syncTensuraFormAndStats();
      });
      tensuraSkillList.appendChild(btn);
    }
  }

  if (sageLog && sageLog.children.length === 0) {
    appendSageMessage(
      'sage',
      `« ${tensura.getSageName()} » Bildirim: Zümrüt Çayır (Tempest #2026077) dünyasına hoş geldiniz! Top 50 sekmesinden Rimuru, Diablo, Milim, Veldora, Guy, Zegion, Benimaru, Shion dahil 50 karaktere anında dönüşebilir; [R] ve [X] ile 16 gerçek Nihai Gücü ateşleyebilir; [N] ile baktığınız her yaratığı %100 sadık dostunuz yapabilirsiniz!`
    );
  }
}

function openTensuraModal() {
  if (uiMode === 'dead' || uiMode === 'launcher') return;
  clearMovementKeys();
  returnCursorToInventory();
  uiMode = 'tensura';
  syncMobileHudVisibility();
  document.exitPointerLock?.();
  invModal.classList.add('hidden');
  pauseModal.classList.add('hidden');
  settingsModal.classList.add('hidden');
  tensuraModal.classList.remove('hidden');
  switchTensuraTab(activeTensuraTab);
  renderTensuraModal();
}

document.querySelectorAll<HTMLButtonElement>('#tensura-modal .ts-tab-btn[data-ttab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const t = (btn.dataset.ttab as 'chars' | 'skills' | 'sage') || 'chars';
    sound.playClick();
    switchTensuraTab(t);
  });
});

tensuraFactionChips?.querySelectorAll<HTMLButtonElement>('button[data-faction]').forEach((chip) => {
  chip.addEventListener('click', () => {
    activeCharFaction = (chip.dataset.faction as TensuraFaction) || 'all';
    tensuraFactionChips.querySelectorAll('button[data-faction]').forEach((b) => b.classList.toggle('active', b === chip));
    sound.playClick();
    renderTensuraModal();
  });
});

tensuraCharSearch?.addEventListener('input', () => {
  charSearchQuery = tensuraCharSearch.value;
  renderTensuraModal();
});
tensuraCharSearch?.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    ev.preventDefault();
    enterPlayingMode();
  }
});

hudRpgPill?.addEventListener('click', () => {
  sound.playClick();
  openTensuraModal();
});
tensuraCloseBtn?.addEventListener('click', () => {
  sound.playClick();
  enterPlayingMode();
});
tensuraMimicBtn?.addEventListener('click', () => {
  const canStand = !player.collidesAt(world, player.x, player.y, player.z, player.standHeight, player.y);
  const res = tensura.toggleHumanMimicry(canStand);
  sound.playPortal();
  syncTensuraFormAndStats();
  appendSageMessage('sage', `« ${tensura.getSageName()} » ${res.msg}`);
});
tensuraNameBtn?.addEventListener('click', () => {
  const custom = tensuraCustomName ? tensuraCustomName.value.trim() : '';
  if (tensuraCustomName) tensuraCustomName.value = '';
  sound.playClick();
  enterPlayingMode();
  nameLookedAtMob(custom);
});
tensuraCustomName?.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    tensuraNameBtn?.click();
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    enterPlayingMode();
  }
});
tensuraSummonAllyBtn?.addEventListener('click', () => {
  const custom = tensuraCustomName ? tensuraCustomName.value.trim() : '';
  if (tensuraCustomName) tensuraCustomName.value = '';
  sound.playClick();
  enterPlayingMode();
  summonLoyalCompanion(custom);
});
sageQuickChips?.querySelectorAll<HTMLButtonElement>('button[data-q]').forEach((b) => {
  b.addEventListener('click', () => {
    sound.playClick();
    askGreatSageInteractive(b.dataset.q || '');
  });
});
sageAskBtn?.addEventListener('click', () => {
  sound.playClick();
  askGreatSageInteractive(sageInput.value);
  sageInput.value = '';
});
sageInput?.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    askGreatSageInteractive(sageInput.value);
    sageInput.value = '';
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    enterPlayingMode();
  }
});

// Damage all enemy mobs along a 3D ray `[ox,oy,oz] + t*[dx,dy,dz]` for `t in [0, length]` within `beamRadius`
function damageEnemiesAlongBeam(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  length: number,
  beamRadius: number,
  damage: number
): number {
  let hitCount = 0;
  const hLen = Math.hypot(dx, dz) || 1;
  if (world.dimension === 'end' && mobs.dragon.active && !mobs.dragon.defeated) {
    const vx = mobs.dragon.x - ox;
    const vy = mobs.dragon.y - oy;
    const vz = mobs.dragon.z - oz;
    const t = Math.max(0, Math.min(length, vx * dx + vy * dy + vz * dz));
    const perp = Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t);
    if (perp <= beamRadius + 3.2) {
      mobs.damageEnemyMob('dragon', damage, 0, 0, world, sound);
      hitCount++;
    }
  }
  for (const m of mobs.getMobsInDimension(world.dimension)) {
    if (m.ally || m.tamed) continue;
    const vx = m.x - ox;
    const vy = m.y + m.height * 0.5 - oy;
    const vz = m.z - oz;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < -0.5 || t > length + 1.0) continue;
    const tc = Math.max(0, Math.min(length, t));
    const perp = Math.hypot(vx - dx * tc, vy - dy * tc, vz - dz * tc);
    if (perp <= beamRadius + m.width * 0.55) {
      if (mobs.damageEnemyMob(m, damage, (dx / hLen) * 1.4, (dz / hLen) * 1.4, world, sound)) {
        hitCount++;
      }
    }
  }
  return hitCount;
}

function resolveAimPoint(eyeY: number, dx: number, dy: number, dz: number, maxRange: number): [number, number, number] {
  const mobHit = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, maxRange, world.dimension);
  if (mobHit && mobHit !== 'dragon' && !mobHit.ally && !mobHit.tamed) {
    return [mobHit.x, mobHit.y + 0.5, mobHit.z];
  }
  if (mobHit === 'dragon') {
    return [mobs.dragon.x, mobs.dragon.y, mobs.dragon.z];
  }
  const blkHit = raycastVoxel(world, player.x, eyeY, player.z, dx, dy, dz, maxRange, false);
  if (blkHit) {
    return [blkHit.bx + 0.5, blkHit.by + 1.0, blkHit.bz + 0.5];
  }
  const tx = player.x + dx * (maxRange * 0.65);
  const tz = player.z + dz * (maxRange * 0.65);
  const ty = Math.max(world.getSafeSurfaceY(tx, tz), eyeY + dy * (maxRange * 0.65));
  return [tx, ty, tz];
}

function castTensuraSkill(skId: TensuraSkillId) {
  if (uiMode !== 'playing') return;
  const check = tensura.tryConsumeForSkill(skId);
  if (!check.ok) {
    pushSubtitle(check.reason || 'Büyü Özü yetersiz!');
    return;
  }

  const eyeY = player.y + player.eyeHeight(player.isCrouching || input.sneak);
  const { dx, dy, dz } = lookDirection();
  const hLen = Math.hypot(dx, dz) || 1;
  const bonus = Math.round(tensura.getMeleeDamageBonus() * 1.15);
  triggerLocalSwing();

  switch (skId) {
    case 'beelzebuth': {
      tensuraVfx.spawnDevourVortex(player.x + dx * 0.8, eyeY - 0.15, player.z + dz * 0.8, dx, dy, dz);
      const dmg = 36 + bonus;
      let devoured = 0;
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        const vx = m.x - player.x;
        const vy = m.y + m.height * 0.5 - eyeY;
        const vz = m.z - player.z;
        const dist = Math.hypot(vx, vy, vz);
        if (dist <= 11.5 && dist > 0.05) {
          const dot = (vx * dx + vy * dy + vz * dz) / dist;
          if (dot >= 0.35 || dist <= 3.2) {
            // Pull enemy inward into the vortex & deal heavy devour damage!
            m.vx -= (vx / dist) * 8.5;
            m.vz -= (vz / dist) * 8.5;
            if (mobs.damageEnemyMob(m, dmg, -(vx / dist) * 0.6, -(vz / dist) * 0.6, world, sound)) {
              devoured++;
            }
          }
        }
      }
      if (world.dimension === 'end' && mobs.dragon.active && !mobs.dragon.defeated) {
        if (Math.hypot(mobs.dragon.x - player.x, mobs.dragon.y - eyeY, mobs.dragon.z - player.z) <= 13) {
          mobs.damageEnemyMob('dragon', dmg, 0, 0, world, sound);
          devoured++;
        }
      }
      world.vacuumDropsToward(player.x, player.y, player.z, 13);
      health = Math.min(20, health + (devoured > 0 ? 5 : 2));
      hunger = Math.min(20, hunger + 4);
      saturation = Math.min(10, saturation + 3);
      if (devoured > 0) {
        tensura.absorbedCount += devoured;
        tensura.grantEpAndSoul(1500 * devoured, devoured);
      }
      sound.playPortal();
      pushSubtitle(`Oburluk Kralı Beelzebuth! (${dmg} Hasar)`);
      break;
    }

    case 'void_god_azathoth': {
      const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 16);
      tensuraVfx.spawnTurnNullSingularity(tx, ty + 0.6, tz, 9.2);
      const dmg = 120 + bonus;
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        const dist = Math.hypot(m.x - tx, m.y - ty, m.z - tz);
        if (dist <= 9.5) {
          m.vx = (tx - m.x) * 2.2;
          m.vz = (tz - m.z) * 2.2;
          mobs.damageEnemyMob(m, dmg, 0, 0, world, sound);
        }
      }
      if (world.dimension === 'end' && mobs.dragon.active && !mobs.dragon.defeated) {
        if (Math.hypot(mobs.dragon.x - tx, mobs.dragon.y - ty, mobs.dragon.z - tz) <= 13) {
          mobs.damageEnemyMob('dragon', dmg, 0, 0, world, sound);
        }
      }
      sound.playExplosion();
      flashScreen('portal', 420);
      pushSubtitle(`Hiçlik Tanrısı Azathoth · Turn Null! (${dmg} Hasar)`);
      break;
    }

    case 'storm_king_veldora': {
      const dmg = 68 + bonus;
      const strikes: Array<[number, number, number]> = [];
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - player.x, m.z - player.z) <= 18.5) {
          strikes.push([m.x, m.y, m.z]);
          mobs.damageEnemyMob(m, dmg, 0, 0, world, sound);
          if (strikes.length >= 6) break;
        }
      }
      if (strikes.length === 0) {
        const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 16);
        strikes.push([tx, ty - 0.5, tz]);
        mobs.explosionDamageAt(tx, ty, tz, 5.5, dmg, world.dimension, world, sound);
      }
      tensuraVfx.spawnTempestLightning(strikes);
      sound.playExplosion();
      pushSubtitle(`Fırtına Kralı Veldora Kara Yıldırımları! (${dmg} Hasar)`);
      break;
    }

    case 'hellflare_amaterasu': {
      const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 18);
      const dmg = 74 + bonus;
      tensuraVfx.spawnHellflareDome(tx, ty, tz, 7.2);
      mobs.explosionDamageAt(tx, ty, tz, 8.0, dmg, world.dimension, world, sound);
      sound.playExplosion();
      flashScreen('damage', 220);
      pushSubtitle(`Amaterasu · Cehennem Alevi Kubbesi! (${dmg} Hasar)`);
      break;
    }

    case 'mephisto_illusions': {
      const dmg = 66 + bonus;
      const mobHit = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, 18, world.dimension);
      let nx = player.x + (dx / hLen) * 8.0;
      let nz = player.z + (dz / hLen) * 8.0;
      if (mobHit && mobHit !== 'dragon' && !mobHit.ally && !mobHit.tamed) {
        nx = mobHit.x + (dx / hLen) * 1.4;
        nz = mobHit.z + (dz / hLen) * 1.4;
      }
      world.ensureAreaSyncAround(nx, nz);
      const safeY = world.getSafeSurfaceY(nx, nz);
      player.x = nx;
      player.z = nz;
      player.y = safeY;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.resetFallDistance();
      hurtImmunity = Math.max(hurtImmunity, 0.9);
      tensuraVfx.spawnCrescentSlash(player.x, player.y + 1.0, player.z, -dx, 0, -dz, 2.1, 0xe879f9, 0xef4444, true);
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - player.x, m.z - player.z) <= 5.0) {
          mobs.damageEnemyMob(m, dmg, (dx / hLen) * 1.1, (dz / hLen) * 1.1, world, sound);
        }
      }
      sound.playPortal();
      flashScreen('portal', 260);
      pushSubtitle(`Mephisto · Uzay Işınlanması & Kesiş! (${dmg} Hasar)`);
      break;
    }

    case 'sephirot_dimension_ray': {
      const dmg = 82 + bonus;
      const ox = player.x + dx * 0.7;
      const oy = eyeY - 0.12;
      const oz = player.z + dz * 0.7;
      tensuraVfx.spawnLaserBeam(ox, oy, oz, dx, dy, dz, 28, 0.55, 0x22d3ee, 0xa855f7);
      damageEnemiesAlongBeam(ox, oy, oz, dx, dy, dz, 28, 1.75, dmg);
      sound.playRiptide();
      pushSubtitle(`Boyut Fırtınası Sephirot Işını! (${dmg} Hasar)`);
      break;
    }

    case 'susanoo_chaotic_fate': {
      const dmg = 78 + bonus;
      tensuraVfx.spawnCrescentSlash(player.x + dx * 0.9, eyeY - 0.1, player.z + dz * 0.9, dx, dy, dz, 2.45, 0xf0abfc, 0x7e22ce, true);
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        const vx = m.x - player.x;
        const vz = m.z - player.z;
        const dist = Math.hypot(vx, vz);
        if (dist <= 8.8 && Math.abs(m.y - player.y) <= 3.5) {
          const dot = dist > 0.1 ? (vx * (dx / hLen) + vz * (dz / hLen)) / dist : 1;
          if (dot >= 0.15 || dist <= 2.8) {
            if (mobs.damageEnemyMob(m, dmg, (dx / hLen) * 1.8, (dz / hLen) * 1.8, world, sound)) {
              m.vy = Math.max(m.vy, 8.2);
            }
          }
        }
      }
      sound.playExplosion();
      pushSubtitle(`Tiran Kral Susanoo · Kader Kesisi! (${dmg} Hasar)`);
      break;
    }

    case 'satanael_drago_nova': {
      const dmg = 110 + bonus;
      const ox = player.x + dx * 0.8;
      const oy = eyeY - 0.1;
      const oz = player.z + dz * 0.8;
      tensuraVfx.spawnLaserBeam(ox, oy, oz, dx, dy, dz, 30, 0.85, 0xfef08a, 0xec4899);
      damageEnemiesAlongBeam(ox, oy, oz, dx, dy, dz, 30, 2.2, dmg);
      const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 26);
      tensuraVfx.spawnNovaSphere(tx, ty, tz, 7.5, 0xec4899, 0xfef08a);
      mobs.explosionDamageAt(tx, ty, tz, 7.5, dmg, world.dimension, world, sound);
      sound.playExplosion();
      flashScreen('totem', 350);
      pushSubtitle(`Milim Nava · Drago Nova! (${dmg} Hasar)`);
      break;
    }

    case 'lucifer_crimson_prominence': {
      const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 20);
      const dmg = 92 + bonus;
      tensuraVfx.spawnSkyPillar(tx, ty - 0.6, tz, 3.6, 18, 0xfef08a, 0xe11d48);
      mobs.explosionDamageAt(tx, ty, tz, 6.8, dmg, world.dimension, world, sound);
      sound.playExplosion();
      pushSubtitle(`Kibir Kralı Lucifer · Kızıl Prominence! (${dmg} Hasar)`);
      break;
    }

    case 'yog_sothoth_time_stop': {
      mobs.timeStopTimer = 6.0;
      projectiles.timeStopActive = true;
      tensuraVfx.spawnNovaSphere(player.x, player.y + 0.9, player.z, 14.0, 0x38bdf8, 0xfef08a);
      sound.playTotemPop();
      flashScreen('portal', 380);
      showVoiceOfWorldBanner(
        '« Zaman ve Uzay Kralı Yog-Sothoth »',
        'Askıya Alınmış Dünya (Time Stop) aktif! 6 saniye boyunca tüm düşmanlar ve mermiler zamanda dondu!'
      );
      pushSubtitle('Zaman Durduruldu! (6.0 sn)');
      break;
    }

    case 'abaddon_extinction': {
      const dmg = 98 + bonus;
      const ox = player.x + dx * 0.75;
      const oy = eyeY - 0.1;
      const oz = player.z + dz * 0.75;
      tensuraVfx.spawnLaserBeam(ox, oy, oz, dx, dy, dz, 32, 0.72, 0xfacc15, 0x312e81);
      damageEnemiesAlongBeam(ox, oy, oz, dx, dy, dz, 32, 2.0, dmg);
      const [tx, ty, tz] = resolveAimPoint(eyeY, dx, dy, dz, 28);
      mobs.explosionDamageAt(tx, ty, tz, 7.0, dmg, world.dimension, world, sound);
      sound.playExplosion();
      pushSubtitle(`Yıkım Kralı Abaddon · Yok Oluş Atışı! (${dmg} Hasar)`);
      break;
    }

    case 'belial_white_world': {
      const dmg = 64 + bonus;
      tensuraVfx.spawnNovaSphere(player.x, player.y + 0.9, player.z, 9.5, 0xf8fafc, 0xef4444);
      let drained = 0;
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - player.x, m.z - player.z) <= 9.5) {
          if (mobs.damageEnemyMob(m, dmg, 0, 0, world, sound)) drained++;
        }
      }
      health = Math.min(20, health + 10);
      hunger = Math.min(20, hunger + 6);
      tensura.magicules = Math.min(tensura.getMaxMagicules(), tensura.magicules + drained * 110);
      sound.playAmethystChime();
      pushSubtitle(`Ölüm Kralı Belial · Beyaz Dünya! (${dmg} Hasar + Can Çekme)`);
      break;
    }

    case 'samael_death_poison': {
      const dmg = 48 + bonus;
      tensuraVfx.spawnNovaSphere(player.x, player.y + 0.8, player.z, 9.0, 0xa855f7, 0x4ade80);
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - player.x, m.z - player.z) <= 9.2) {
          mobs.damageEnemyMob(m, dmg, 0, 0, world, sound);
          m.poisonTimer = 6.5;
          m.poisonTick = 0.25;
        }
      }
      sound.playPortal();
      pushSubtitle(`Zehir Kralı Samael! (${dmg} Hasar + 6.5sn Çürüme Zehri)`);
      break;
    }

    case 'cthulhu_absolute_zero': {
      const dmg = 60 + bonus;
      tensuraVfx.spawnFrostSpires(player.x, player.y, player.z, 8.5);
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - player.x, m.z - player.z) <= 9.2) {
          mobs.damageEnemyMob(m, dmg, 0, 0, world, sound);
          m.frozenTimer = 5.0;
        }
      }
      sound.playAmethystChime();
      pushSubtitle(`Buz İmparatoriçesi Cthulhu · Mutlak Sıfır! (${dmg} Hasar + 5sn Dondurma)`);
      break;
    }

    case 'tsukuyomi_shadow_kill': {
      const dmg = 58 + bonus;
      const ox = player.x;
      const oy = eyeY;
      const oz = player.z;
      const blkHit = raycastVoxel(world, ox, oy, oz, dx, dy, dz, 12, false, true);
      const dist = blkHit ? Math.max(1.4, blkHit.dist - 0.9) : 11.5;
      const nx = ox + dx * dist;
      const nz = oz + dz * dist;
      world.ensureAreaSyncAround(nx, nz);
      const ny = world.getSafeSurfaceY(nx, nz);
      damageEnemiesAlongBeam(ox, oy, oz, dx, dy, dz, dist + 1.5, 2.1, dmg);
      for (const m of mobs.getMobsInDimension(world.dimension)) {
        if (m.ally || m.tamed) continue;
        if (Math.hypot(m.x - nx, m.z - nz) <= 4.2) {
          mobs.damageEnemyMob(m, dmg, 0, 0, world, sound);
          m.frozenTimer = Math.max(m.frozenTimer || 0, 2.5);
        }
      }
      player.x = nx;
      player.z = nz;
      player.y = ny;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.resetFallDistance();
      hurtImmunity = Math.max(hurtImmunity, 0.85);
      tensuraVfx.spawnCrescentSlash(nx, ny + 1.0, nz, dx, 0, dz, 1.85, 0x818cf8, 0x1e1b4b, true);
      sound.playPortal();
      flashScreen('portal', 240);
      pushSubtitle(`Ay Kralı Tsukuyomi · Gölge İnfazı! (${dmg} Hasar)`);
      break;
    }

    case 'uriel_absolute_guard': {
      urielShieldTimer = 6.0;
      health = 20;
      hunger = 20;
      saturation = 10;
      player.freezeProgress = 0;
      const healedAllies = mobs.healAlliesAround(player.x, player.z, 30, world.dimension);
      tensuraVfx.spawnNovaSphere(player.x, player.y + 0.9, player.z, 6.5, 0xfacc15, 0xfef08a);
      sound.playTotemPop();
      flashScreen('totem', 320);
      pushSubtitle(
        `Antlaşma Kralı Uriel · Mutlak Bariyer (6sn Ölümsüzlük${healedAllies > 0 ? ` + ${healedAllies} Dost İyileşti` : ''})!`
      );
      break;
    }
  }

  syncTensuraFormAndStats();
}

function castActiveTensuraSkill() {
  castTensuraSkill(tensura.activeSkill);
}

function castSecondaryTensuraSkill() {
  castTensuraSkill(tensura.getActiveCharacter().secondarySkill);
}

syncTensuraFormAndStats();

// ============================================================================
// KEYBOARD, MOUSE, BROWSER SHORTCUT BLOCKER, DOUBLE-TAP W & FULLSCREEN LOCK
// ============================================================================
const LOCKED_GAMEPLAY_KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'KeyC', 'CapsLock',
  'KeyE', 'KeyF', 'KeyQ', 'KeyR', 'KeyX', 'KeyZ', 'KeyV', 'KeyN', 'KeyK', 'KeyB', 'KeyT',
  'Tab', 'Escape'
];

function toggleFullscreenSafe() {
  const docEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const docAny = document as Document & { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element };
  const navKb = (navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void } }).keyboard;
  if (!document.fullscreenElement && !docAny.webkitFullscreenElement) {
    userOptedOutFullscreen = false;
    fullscreenTransitionUntil = performance.now() + 950;
    programmaticFsRequest = true;
    let req: Promise<void> | undefined;
    try {
      req = docEl.requestFullscreen ? docEl.requestFullscreen({ navigationUI: 'hide' }) : docEl.webkitRequestFullscreen?.();
    } catch {
      req = docEl.requestFullscreen?.();
    }
    req
      ?.then?.(() => {
        lockAllBrowserKeys();
        refreshDesktopControlButtons();
      })
      ?.catch?.(() => {
        fullscreenTransitionUntil = 0;
        programmaticFsRequest = false;
      });
    if (isTouchDevice) {
      const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> } | undefined;
      orient?.lock?.('landscape')?.catch?.(() => {});
    }
  } else {
    userOptedOutFullscreen = true;
    programmaticFsRequest = false;
    navKb?.unlock?.();
    (document.exitFullscreen?.() ?? docAny.webkitExitFullscreen?.())?.catch?.(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  const navKb = (navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void } }).keyboard;
  if (document.fullscreenElement) {
    lockAllBrowserKeys();
  } else {
    if (programmaticFsRequest) {
      // User manually exited Fullscreen (held Escape or pressed F11) — respect their choice until toggled back!
      userOptedOutFullscreen = true;
      programmaticFsRequest = false;
    }
    navKb?.unlock?.();
  }
  refreshDesktopControlButtons();
  syncViewportSize();
});

optSprintMode?.addEventListener('click', () => {
  sprintToggleMode = !sprintToggleMode;
  try { localStorage.setItem('horizon_sprint_toggle', sprintToggleMode ? '1' : '0'); } catch { /* ignore */ }
  sprintLatched = sprintToggleMode;
  input.sprint = sprintToggleMode || ctrlKeyHeld || cKeyHeld || doubleTapSprint;
  refreshDesktopControlButtons();
  sound.playClick();
});

optAutofsLock?.addEventListener('click', () => {
  autoFullscreenLock = !autoFullscreenLock;
  if (autoFullscreenLock) userOptedOutFullscreen = false;
  try { localStorage.setItem('horizon_autofs_lock', autoFullscreenLock ? '1' : '0'); } catch { /* ignore */ }
  refreshDesktopControlButtons();
  sound.playClick();
});
refreshDesktopControlButtons();

hudFsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  sound.playClick();
  toggleFullscreenSafe();
});
invFsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  sound.playClick();
  toggleFullscreenSafe();
});

// Protect active gameplay session from accidental browser tab close/reload (e.g. Ctrl+W / Ctrl+R)
window.addEventListener('beforeunload', (e) => {
  returnCursorToInventory();
  if (uiMode === 'playing' && hasUserPlayedSession) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function shouldShieldBrowserShortcut(e: KeyboardEvent): boolean {
  if (uiMode !== 'playing') return false;
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) return false;
  if (e.code === 'F11' || e.code === 'F12') return false;
  return (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.code === 'ControlLeft' ||
    e.code === 'ControlRight' ||
    e.code === 'AltLeft' ||
    e.code === 'AltRight' ||
    e.code === 'MetaLeft' ||
    e.code === 'MetaRight' ||
    e.code === 'Space' ||
    e.code === 'Tab' ||
    e.code === 'CapsLock' ||
    (e.code.startsWith('F') && e.code.length <= 3)
  );
}

// Capture-phase Browser Shortcut Shield (BOTH keydown & keyup): blocks Ctrl+Space, Ctrl+R, Ctrl+D, Ctrl+B, Ctrl+S, Ctrl+F, Alt, Tab, F1-F10!
window.addEventListener(
  'keydown',
  (e) => {
    if (shouldShieldBrowserShortcut(e)) {
      e.preventDefault();
    }
  },
  { capture: true }
);
window.addEventListener(
  'keyup',
  (e) => {
    if (shouldShieldBrowserShortcut(e)) {
      e.preventDefault();
    }
  },
  { capture: true }
);

window.addEventListener('keydown', (e) => {
  if (uiMode === 'launcher') {
    if (e.key === 'Enter' && document.activeElement !== nameInput) playBtn.click();
    return;
  }
  if (uiMode === 'dead') return;

  if (uiMode === 'chat') {
    if (e.key === 'Enter') {
      submitChatInput();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      chatInput.blur();
      enterPlayingMode();
      e.preventDefault();
    }
    return;
  }

  if (uiMode === 'inventory') {
    if (e.key === 'Escape' || (e.code === 'KeyE' && document.activeElement !== invSearch)) {
      enterPlayingMode();
      e.preventDefault();
    }
    return;
  }

  if (uiMode === 'tensura') {
    const activeEl = document.activeElement;
    if (activeEl === sageInput || activeEl === tensuraCharSearch || activeEl === tensuraCustomName) {
      if (e.key === 'Escape') {
        enterPlayingMode();
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape' || e.code === 'KeyK' || e.code === 'KeyB') {
      enterPlayingMode();
      e.preventDefault();
    }
    return;
  }

  if (uiMode === 'settings') {
    if (e.key === 'Escape') {
      settingsDoneBtn.click();
      e.preventDefault();
    }
    return;
  }

  if (uiMode === 'paused') {
    if (e.key === 'Escape') {
      enterPlayingMode();
      e.preventDefault();
    }
    return;
  }

  switch (e.code) {
    case 'Escape':
      e.preventDefault();
      openPauseModal();
      break;
    case 'KeyW': {
      if (!e.repeat) {
        const nowW = performance.now();
        if (nowW - lastWPressMs < 280) {
          doubleTapSprint = true;
          sprintLatched = true;
          input.sprint = true;
        }
        lastWPressMs = nowW;
      }
      input.forward = true;
      if (ctrlKeyHeld || cKeyHeld || sprintToggleMode || sprintLatched) {
        input.sprint = true;
      }
      break;
    }
    case 'KeyS': input.backward = true; break;
    case 'KeyA': input.left = true; break;
    case 'KeyD': input.right = true; break;
    case 'Space': {
      if (!e.repeat && (gameMode === 'creative' || tensura.canDemonLordFly())) {
        const now = performance.now();
        if (now - lastSpacePress < 280) {
          player.flying = !player.flying;
          player.vy = 0;
          if (player.flying) elytraGliding = false;
          if (gameMode === 'survival' && player.flying) {
            pushSubtitle('İblis Lordu Kanatları açıldı! (Uçuş Aktif)');
          }
        }
        lastSpacePress = now;
      }
      // Authentic Vanilla Elytra Mid-Air Deploy: Press Space while falling with Elytra equipped!
      if (
        !e.repeat &&
        !elytraGliding &&
        !player.onGround &&
        !player.inWater &&
        !player.inLava &&
        !player.flying &&
        !mobs.mountedMob &&
        !boats.mountedBoat &&
        player.vy < 0.2 &&
        armorSlots[1]?.id === ITEM.ELYTRA
      ) {
        elytraGliding = true;
        player.resetFallDistance();
        sound.playRiptide();
        pushSubtitle('Elitra kanatları açıldı! (Havai Fişek ile hızlanın)');
      }
      input.jump = true;
      e.preventDefault();
      break;
    }
    case 'ShiftLeft':
    case 'ShiftRight':
      if (mobs.mountedMob || boats.mountedBoat) {
        if (mobs.mountedMob?.species === 'happy_ghast') player.setWindBurstGrace(1.0);
        mobs.mountedMob = null;
        boats.mountedBoat = null;
        player.vy = 3.4;
        sound.playStep('wood');
      }
      input.sneak = true;
      break;
    case 'ControlLeft':
    case 'ControlRight':
      ctrlKeyHeld = true;
      sprintLatched = true;
      input.sprint = true;
      break;
    case 'KeyC':
      cKeyHeld = true;
      sprintLatched = true;
      input.sprint = true;
      break;
    case 'CapsLock':
      e.preventDefault();
      if (!e.repeat) {
        sprintToggleMode = !sprintToggleMode;
        try { localStorage.setItem('horizon_sprint_toggle', sprintToggleMode ? '1' : '0'); } catch { /* ignore */ }
        sprintLatched = sprintToggleMode;
        input.sprint = sprintToggleMode || ctrlKeyHeld || cKeyHeld || doubleTapSprint;
        refreshDesktopControlButtons();
        sound.playClick();
        pushSubtitle(sprintToggleMode ? 'Koşu Kilidi: Sürekli Açık (CapsLock)' : 'Koşu Modu: Yapışkan Koşu (Ctrl / C)');
      }
      break;
    case 'KeyF':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      // Authentic Horizon / Vanilla 26.3: Swap Mainhand <-> Offhand!
      if (!e.repeat) swapMainhandAndOffhand();
      break;
    case 'F4':
      e.preventDefault();
      if (!e.repeat) {
        toggleGameMode();
        pushChat({
          sender: 'Horizon',
          color: '#a9a9ff',
          text: `Oyun modu: ${gameMode === 'creative' ? 'Yaratıcı (Uçuş)' : 'Hayatta Kalma'}`,
          system: true
        });
      }
      break;
    case 'F1':
      e.preventDefault();
      if (!e.repeat) {
        cinematicHudHidden = !cinematicHudHidden;
        hudEl.classList.toggle('hidden', cinematicHudHidden);
        syncMobileHudVisibility();
      }
      break;
    case 'KeyK':
    case 'KeyB':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      e.preventDefault();
      if (!e.repeat) openTensuraModal();
      break;
    case 'KeyR':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      if (!e.repeat) castActiveTensuraSkill();
      break;
    case 'KeyX':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      if (!e.repeat) castSecondaryTensuraSkill();
      break;
    case 'KeyN':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      if (!e.repeat) nameLookedAtMob('');
      break;
    case 'KeyZ':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      if (!e.repeat) {
        const nextSk = tensura.cycleActiveSkill();
        sound.playClick();
        syncTensuraFormAndStats();
        pushSubtitle(`Aktif Nihai Güç: ${tensura.getSkillDisplayName(nextSk)}`);
      }
      break;
    case 'KeyV':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      if (!e.repeat) {
        const canStand = !player.collidesAt(world, player.x, player.y, player.z, player.standHeight, player.y);
        const res = tensura.toggleHumanMimicry(canStand);
        sound.playPortal();
        syncTensuraFormAndStats();
        pushSubtitle(res.msg);
      }
      break;
    case 'KeyE':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      e.preventDefault();
      openInventoryModal('none');
      break;
    case 'KeyQ':
      if (e.metaKey || e.altKey) break;
      if (!e.repeat) dropSelectedItem(e.ctrlKey);
      break;
    case 'KeyT':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      e.preventDefault();
      openChat('');
      break;
    case 'Slash':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      e.preventDefault();
      openChat('/');
      break;
    case 'Tab':
      if (e.ctrlKey || e.metaKey || e.altKey) break;
      e.preventDefault();
      refreshTabScoreboard();
      tabListEl.classList.remove('hidden');
      break;
    case 'F3':
      e.preventDefault();
      showF3 = !showF3;
      f3Panel.classList.toggle('hidden', !showF3);
      break;
    case 'F5':
      e.preventDefault();
      cameraPerson = ((cameraPerson + 1) % 3) as 0 | 1 | 2;
      localAvatar.root.visible = cameraPerson !== 0;
      break;
    default:
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.slice(5), 10);
        if (num >= 1 && num <= 9) selectHotbarSlot(num - 1);
      }
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
      input.forward = false;
      doubleTapSprint = false;
      if (!ctrlKeyHeld && !cKeyHeld && !sprintToggleMode) {
        sprintLatched = false;
        input.sprint = false;
      }
      break;
    case 'KeyS': input.backward = false; break;
    case 'KeyA': input.left = false; break;
    case 'KeyD': input.right = false; break;
    case 'Space': input.jump = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': input.sneak = false; break;
    case 'ControlLeft':
    case 'ControlRight':
      ctrlKeyHeld = false;
      // Vanilla Sticky Sprint: releasing Ctrl NEVER cancels sprint while W is still held!
      if (!input.forward && !cKeyHeld && !doubleTapSprint && !sprintToggleMode) {
        sprintLatched = false;
        input.sprint = false;
      }
      break;
    case 'KeyC':
      cKeyHeld = false;
      if (!input.forward && !ctrlKeyHeld && !doubleTapSprint && !sprintToggleMode) {
        sprintLatched = false;
        input.sprint = false;
      }
      break;
    case 'Tab': tabListEl.classList.add('hidden'); break;
  }
});

window.addEventListener('mousemove', (e) => {
  if (uiMode !== 'playing' || document.pointerLockElement !== gameCanvas) return;
  const sens = 0.0022 * mouseSensitivity * (spyglassZooming ? 0.28 : 1.0);
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  const maxPitch = Math.PI / 2 - 0.02;
  player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch));
});

window.addEventListener('wheel', (e) => {
  if (uiMode !== 'playing') return;
  selectHotbarSlot(selectedSlot + (e.deltaY > 0 ? 1 : -1));
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

function lookDirection() {
  const cosP = Math.cos(player.pitch);
  return {
    dx: -Math.sin(player.yaw) * cosP,
    dy: Math.sin(player.pitch),
    dz: -Math.cos(player.yaw) * cosP
  };
}

function currentRaycastHit(includeLiquids = false) {
  const eyeY = player.y + player.eyeHeight(player.isCrouching || input.sneak);
  const { dx, dy, dz } = lookDirection();
  return raycastVoxel(world, player.x, eyeY, player.z, dx, dy, dz, 4.8, includeLiquids);
}

function triggerLocalSwing() {
  fpHand.triggerSwing();
  localAvatar.triggerSwing();
  server.broadcastSwing();
  attackCooldown = 1.0;
  shieldRaiseTimer = 0;
}

function noteBlockInstrumentBelow(wx: number, y: number, wz: number): 'harp' | 'bd' | 'snare' | 'hat' | 'bass' | 'bell' | 'chime' {
  const below = world.getBlock(wx, y - 1, wz);
  if (
    below === BLOCK.STONE ||
    below === BLOCK.COBBLESTONE ||
    below === BLOCK.STONE_BRICKS ||
    below === BLOCK.DEEPSLATE ||
    below === BLOCK.DRIPSTONE_BLOCK ||
    below === BLOCK.OBSIDIAN ||
    below === BLOCK.CRYING_OBSIDIAN ||
    below === BLOCK.NETHERRACK
  ) {
    return 'bd';
  }
  if (below === BLOCK.SAND || below === BLOCK.RED_SAND || below === BLOCK.GRAVEL || below === BLOCK.SOUL_SAND) {
    return 'snare';
  }
  if (below === BLOCK.GLASS || below === BLOCK.GLASS_PANE || below === BLOCK.SEA_LANTERN || below === BLOCK.GLOWSTONE) {
    return 'hat';
  }
  if (
    below === BLOCK.OAK_LOG ||
    below === BLOCK.BIRCH_LOG ||
    below === BLOCK.SPRUCE_LOG ||
    below === BLOCK.CHERRY_LOG ||
    below === BLOCK.ACACIA_LOG ||
    below === BLOCK.OAK_PLANKS ||
    below === BLOCK.BIRCH_PLANKS ||
    below === BLOCK.SPRUCE_PLANKS ||
    below === BLOCK.CHERRY_PLANKS ||
    below === BLOCK.ACACIA_PLANKS ||
    below === BLOCK.CRAFTING_TABLE ||
    below === BLOCK.BARREL ||
    below === BLOCK.CHEST ||
    below === BLOCK.BOOKSHELF
  ) {
    return 'bass';
  }
  if (below === BLOCK.GOLD_BLOCK) return 'bell';
  if (below === BLOCK.ICE || below === BLOCK.AMETHYST_BLOCK) return 'chime';
  return 'harp';
}

// P2 #19 Fix: 30-Block Seed Radius + 16-Block Apply Radius so turning a Lever OFF >15 blocks away properly depowers distant lines!
function propagateRedstoneAround(cx: number, cy: number, cz: number) {
  const SEED_R = 30;
  const APPLY_R = 16;
  const powered = new Map<string, number>();
  const queue: Array<[number, number, number, number]> = [];
  const k = (x: number, y: number, z: number) => `${x},${y},${z}`;

  for (let dy = -5; dy <= 5; dy++) {
    for (let dz = -SEED_R; dz <= SEED_R; dz++) {
      for (let dx = -SEED_R; dx <= SEED_R; dx++) {
        const x = cx + dx, y = cy + dy, z = cz + dz;
        const bid = world.getBlock(x, y, z);
        if (bid === BLOCK.LEVER_ON) {
          powered.set(k(x, y, z), 15);
          queue.push([x, y, z, 15]);
        } else if (bid === BLOCK.TARGET_BLOCK) {
          const tb = activeTargetBlocks.get(`${world.dimension}:${x},${y},${z}`);
          if (tb && tb.dim === world.dimension && tb.power > 0) {
            powered.set(k(x, y, z), tb.power);
            queue.push([x, y, z, tb.power]);
          }
        }
      }
    }
  }

  const dirs: Array<[number, number, number]> = [
    [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]
  ];

  let head = 0;
  while (head < queue.length) {
    const [x, y, z, sig] = queue[head++];
    if (sig <= 1) continue;
    const nextSig = sig - 1;

    for (const [ox, oy, oz] of dirs) {
      const candidates: Array<[number, number, number]> = [[x + ox, y + oy, z + oz]];
      if (oy === 0) {
        candidates.push([x + ox, y + 1, z + oz], [x + ox, y - 1, z + oz]);
      }
      for (const [nx, ny, nz] of candidates) {
        const nid = world.getBlock(nx, ny, nz);
        if (nid === BLOCK.REDSTONE_DUST_OFF || nid === BLOCK.REDSTONE_DUST_ON) {
          const nk = k(nx, ny, nz);
          if ((powered.get(nk) || 0) < nextSig) {
            powered.set(nk, nextSig);
            queue.push([nx, ny, nz, nextSig]);
          }
        }
      }
    }
  }

  const hasNeighborPower = (bx: number, by: number, bz: number): boolean => {
    if ((powered.get(k(bx, by, bz)) || 0) > 0) return true;
    for (const [ox, oy, oz] of dirs) {
      if ((powered.get(k(bx + ox, by + oy, bz + oz)) || 0) > 0) return true;
    }
    return false;
  };

  for (let dy = -4; dy <= 4; dy++) {
    for (let dz = -APPLY_R; dz <= APPLY_R; dz++) {
      for (let dx = -APPLY_R; dx <= APPLY_R; dx++) {
        const bx = cx + dx, by = cy + dy, bz = cz + dz;
        const id = world.getBlock(bx, by, bz);
        if (id === BLOCK.REDSTONE_DUST_OFF || id === BLOCK.REDSTONE_DUST_ON) {
          const on = (powered.get(k(bx, by, bz)) || 0) > 0;
          const want = on ? BLOCK.REDSTONE_DUST_ON : BLOCK.REDSTONE_DUST_OFF;
          if (id !== want) {
            world.setBlock(bx, by, bz, want, false);
            server.broadcastBlockEdit(bx, by, bz, want, world.dimension);
          }
        } else if (id === BLOCK.REDSTONE_LAMP_OFF || id === BLOCK.REDSTONE_LAMP_ON) {
          const on = hasNeighborPower(bx, by, bz);
          const want = on ? BLOCK.REDSTONE_LAMP_ON : BLOCK.REDSTONE_LAMP_OFF;
          if (id !== want) {
            world.setBlock(bx, by, bz, want, false);
            server.broadcastBlockEdit(bx, by, bz, want, world.dimension);
          }
        } else if (id === BLOCK.OAK_TRAPDOOR_CLOSED || id === BLOCK.OAK_TRAPDOOR_OPEN) {
          const on = hasNeighborPower(bx, by, bz);
          const want = on ? BLOCK.OAK_TRAPDOOR_OPEN : BLOCK.OAK_TRAPDOOR_CLOSED;
          if (id !== want) {
            world.setBlock(bx, by, bz, want, false);
            server.broadcastBlockEdit(bx, by, bz, want, world.dimension);
          }
        } else if (id === BLOCK.COPPER_BULB_OFF || id === BLOCK.COPPER_BULB_ON) {
          // Wave 10: Rising-edge T-Flip-Flop Copper Bulb (toggles light 15 ON/OFF once per pulse!)
          const on = hasNeighborPower(bx, by, bz);
          const cbKey = `${world.dimension}:${bx},${by},${bz}`;
          if (on && !poweredCopperBulbs.has(cbKey)) {
            poweredCopperBulbs.add(cbKey);
            const nextBulb = id === BLOCK.COPPER_BULB_OFF ? BLOCK.COPPER_BULB_ON : BLOCK.COPPER_BULB_OFF;
            world.setBlock(bx, by, bz, nextBulb, false);
            server.broadcastBlockEdit(bx, by, bz, nextBulb, world.dimension);
            if (sound.distanceGain(bx + 0.5, by + 0.5, bz + 0.5, player.x, player.y, player.z) > 0.03) {
              sound.playClick();
            }
          } else if (!on && poweredCopperBulbs.has(cbKey)) {
            poweredCopperBulbs.delete(cbKey);
          }
        } else if (id === BLOCK.NOTE_BLOCK) {
          const on = hasNeighborPower(bx, by, bz);
          const nbKey = `${world.dimension}:${bx},${by},${bz}`;
          if (on && !poweredNoteBlocks.has(nbKey)) {
            poweredNoteBlocks.add(nbKey);
            if (!getBlock(world.getBlock(bx, by + 1, bz)).solid) {
              const pitch = noteBlockPitches.get(nbKey) || 0;
              if (sound.distanceGain(bx + 0.5, by + 0.5, bz + 0.5, player.x, player.y, player.z) > 0.03) {
                sound.playNoteBlock(pitch, noteBlockInstrumentBelow(bx, by, bz));
                pushSubtitle('Nota Bloğu çaldı', bx + 0.5, bz + 0.5);
              }
            }
          } else if (!on && poweredNoteBlocks.has(nbKey)) {
            poweredNoteBlocks.delete(nbKey);
          }
        } else if (id === BLOCK.TNT && hasNeighborPower(bx, by, bz)) {
          world.igniteTnt(bx, by, bz, true);
          server.broadcastTnt(bx, by, bz, world.dimension);
        } else if (id === BLOCK.PISTON && hasNeighborPower(bx, by, bz)) {
          const pushDirs: Array<[number, number, number]> = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
          for (const [px, py, pz] of pushDirs) {
            const adjId = world.getBlock(bx + px, by + py, bz + pz);
            const adjDef = getBlock(adjId);
            if (
              adjId !== BLOCK.AIR &&
              !isPistonImmovable(adjId) &&
              adjDef.solid &&
              Number.isFinite(adjDef.hardness)
            ) {
              const destX = bx + px * 2;
              const destY = by + py * 2;
              const destZ = bz + pz * 2;
              if (destY >= 1 && destY < WORLD_HEIGHT - 1) {
                const destId = world.getBlock(destX, destY, destZ);
                if (getBlock(destId).replaceable) {
                  world.setBlock(bx + px, by + py, bz + pz, BLOCK.AIR, false);
                  world.setBlock(destX, destY, destZ, adjId, false);
                  if (player.overlapsPlayer(destX, destY, destZ, player.isCrouching || input.sneak, world, adjId)) {
                    player.x += px;
                    player.y += py > 0 ? py * 1.02 : py;
                    player.z += pz;
                  }
                  server.broadcastBlockEdit(bx + px, by + py, bz + pz, BLOCK.AIR, world.dimension);
                  server.broadcastBlockEdit(destX, destY, destZ, adjId, world.dimension);
                  sound.playPlace('stone');
                  break;
                }
              }
            }
          }
        }
      }
    }
  }
}

function isPistonImmovable(id: number): boolean {
  return (
    id === BLOCK.PISTON ||
    id === BLOCK.LEVER_ON ||
    id === BLOCK.LEVER_OFF ||
    id === BLOCK.REDSTONE_DUST_ON ||
    id === BLOCK.REDSTONE_DUST_OFF ||
    id === BLOCK.OBSIDIAN ||
    id === BLOCK.CRYING_OBSIDIAN ||
    (id >= BLOCK.RESPAWN_ANCHOR_0 && id <= BLOCK.RESPAWN_ANCHOR_4) ||
    id === BLOCK.ANCIENT_DEBRIS ||
    id === BLOCK.NETHERITE_BLOCK ||
    id === BLOCK.CHEST ||
    id === BLOCK.BARREL ||
    id === BLOCK.FURNACE ||
    id === BLOCK.FURNACE_LIT ||
    id === BLOCK.ENCHANTING_TABLE ||
    id === BLOCK.ANVIL ||
    id === BLOCK.JUKEBOX ||
    id === BLOCK.NOTE_BLOCK ||
    id === BLOCK.CAKE ||
    (id >= BLOCK.FLOWER_POT && id <= BLOCK.POTTED_CHERRY) ||
    id === BLOCK.DRAGON_EGG ||
    id === BLOCK.CAMPFIRE ||
    id === BLOCK.CAMPFIRE_UNLIT ||
    id === BLOCK.CAULDRON_EMPTY ||
    id === BLOCK.CAULDRON_WATER ||
    id === BLOCK.CAULDRON_LAVA ||
    id === BLOCK.OAK_DOOR_CLOSED ||
    id === BLOCK.OAK_DOOR_OPEN ||
    id === BLOCK.BED_BLOCK ||
    id === BLOCK.NETHER_PORTAL ||
    id === BLOCK.END_PORTAL ||
    id === BLOCK.END_CRYSTAL_BLOCK ||
    id === BLOCK.BEDROCK
  );
}

const composterLevels = new Map<string, number>();

function isCompostableItem(id: number): boolean {
  return (
    id === ITEM.WHEAT_ITEM ||
    id === ITEM.APPLE ||
    id === ITEM.CARROT ||
    id === ITEM.SWEET_BERRIES ||
    id === ITEM.BREAD ||
    id === BLOCK.TALL_GRASS ||
    id === BLOCK.POPPY ||
    id === BLOCK.DANDELION ||
    id === BLOCK.CORNFLOWER ||
    id === BLOCK.OXEYE_DAISY ||
    id === BLOCK.CHERRY_PETALS ||
    id === BLOCK.OAK_LEAVES ||
    id === BLOCK.BIRCH_LEAVES ||
    id === BLOCK.SPRUCE_LEAVES ||
    id === BLOCK.CHERRY_LEAVES ||
    id === BLOCK.ACACIA_LEAVES ||
    id === BLOCK.CACTUS ||
    id === BLOCK.WHEAT_CROP ||
    id === BLOCK.SWEET_BERRY_BUSH ||
    id === BLOCK.HAY_BALE
  );
}

function tryPlaceOrEatFromHand(stack: ItemStack | null, isOffhand: boolean, hit: ReturnType<typeof currentRaycastHit>): boolean {
  if (!stack || stack.id <= 0) return false;
  const heldId = stack.id;
  const heldDef = getItemDef(heldId);

  const consumeOne = () => {
    if (gameMode === 'survival') {
      stack.count -= 1;
      if (stack.count <= 0) {
        if (isOffhand) offhandSlot = null;
        else hotbar[selectedSlot] = null;
      }
      renderHotbar();
    }
  };

  // Spyglass Hold-to-Zoom (`fov.rs` 18-degree scope!)
  if (heldId === ITEM.SPYGLASS) {
    if (!spyglassZooming) {
      spyglassZooming = true;
      sound.playAmethystChime();
      pushSubtitle('Dürbün yakınlaştırıldı');
    }
    return true;
  }

  // Sweet Berries Planting on Soil (`#15831`: plants bush on Grass/Dirt/Snow Grass/Farmland before eating!)
  if (
    heldId === ITEM.SWEET_BERRIES &&
    hit &&
    hit.ny === 1 &&
    (hit.blockId === BLOCK.GRASS ||
      hit.blockId === BLOCK.DIRT ||
      hit.blockId === BLOCK.SNOW_GRASS ||
      hit.blockId === BLOCK.FARMLAND) &&
    world.getBlock(hit.bx, hit.by + 1, hit.bz) === BLOCK.AIR
  ) {
    if (world.setBlock(hit.bx, hit.by + 1, hit.bz, BLOCK.SWEET_BERRY_BUSH, false)) {
      server.broadcastBlockEdit(hit.bx, hit.by + 1, hit.bz, BLOCK.SWEET_BERRY_BUSH, world.dimension);
      sound.playPlace('grass');
      pushSubtitle('Orman meyvesi çalısı dikildi', hit.bx + 0.5, hit.bz + 0.5);
      consumeOne();
      triggerLocalSwing();
      return true;
    }
  }

  // Right-Click Armor Quick-Equip / Swap (Horizon & Vanilla parity, + Carved Pumpkin helmet when aiming at air #15628!)
  const quickEquipSlot = heldDef.armorSlot || (!hit && heldId === BLOCK.CARVED_PUMPKIN ? 'head' : undefined);
  if (quickEquipSlot) {
    const slotMap: Record<'head' | 'chest' | 'legs' | 'feet', number> = { head: 0, chest: 1, legs: 2, feet: 3 };
    const aIdx = slotMap[quickEquipSlot];
    const prevEquipped = armorSlots[aIdx];
    armorSlots[aIdx] = { id: stack.id, count: 1, damage: stack.damage, ench: stack.ench };
    if (stack.count > 1) {
      stack.count -= 1;
      if (prevEquipped) giveOrDropItem(prevEquipped);
    } else {
      if (isOffhand) offhandSlot = prevEquipped;
      else hotbar[selectedSlot] = prevEquipped;
    }
    recomputeArmorPoints();
    renderVitalsAndXp();
    renderHotbar();
    sound.playPlace('metal');
    pushSubtitle(`${heldDef.name} kuşanıldı`);
    triggerLocalSwing();
    return true;
  }

  // Authentic Hold-to-Eat Food (`0.95s` chewing animation + 0.28x walk slowdown; Golden Apple always edible!)
  if (heldDef.foodRestore) {
    const canEatNow =
      gameMode === 'creative' ||
      hunger < 20 ||
      heldId === ITEM.GOLDEN_APPLE;
    if (canEatNow) {
      if (!eatingActive) {
        eatingActive = true;
        eatingIsOffhand = isOffhand;
        eatingItemId = heldId;
        eatingTimer = 0.01;
        eatingCrunchClock = 0.16;
        sound.playEat();
      }
      return true;
    }
  }

  // Axe Copper Scraping (#15835): Scrape patina 1 stage back!
  if (heldDef.toolClass === 'axe' && hit) {
    let scrapedCopper = 0;
    if (hit.blockId === BLOCK.OXIDIZED_COPPER) scrapedCopper = BLOCK.WEATHERED_COPPER;
    else if (hit.blockId === BLOCK.WEATHERED_COPPER) scrapedCopper = BLOCK.EXPOSED_COPPER;
    else if (hit.blockId === BLOCK.EXPOSED_COPPER) scrapedCopper = BLOCK.COPPER_BLOCK;
    if (scrapedCopper > 0 && world.setBlock(hit.bx, hit.by, hit.bz, scrapedCopper, false)) {
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, scrapedCopper, world.dimension);
      sound.playPlace('metal');
      pushSubtitle('Bakır oksiti kazındı', hit.bx + 0.5, hit.bz + 0.5);
      damageHeldTool(1, isOffhand);
      triggerLocalSwing();
      return true;
    }
  }

  // Firework Rocket: Boost Elytra glide in mid-air OR launch a celebratory firework into the sky!
  if (heldId === ITEM.FIREWORK_ROCKET) {
    if (
      !elytraGliding &&
      !player.onGround &&
      !player.inWater &&
      !player.inLava &&
      !player.flying &&
      !mobs.mountedMob &&
      !boats.mountedBoat &&
      armorSlots[1]?.id === ITEM.ELYTRA
    ) {
      elytraGliding = true;
    }
    if (elytraGliding) {
      fireworkBoostTimer = 1.65;
      player.resetFallDistance();
      tensuraVfx.spawnNovaSphere(player.x, player.y + 0.6, player.z, 2.2, 0xfef08a, 0xf43f5e);
      sound.playFuse();
      pushSubtitle('Havai Fişek İtişi! (Elitra Hızlandı)');
      consumeOne();
      triggerLocalSwing();
      return true;
    }
    if (hit) {
      const palette: Array<[number, number]> = [
        [0xf43f5e, 0xfef08a],
        [0x38bdf8, 0xa855f7],
        [0x4ade80, 0xfacc15]
      ];
      const [colA, colB] = palette[Math.floor(Math.random() * palette.length)];
      const fx = hit.bx + hit.nx + 0.5;
      const fy = hit.by + hit.ny + 0.2;
      const fz = hit.bz + hit.nz + 0.5;
      pendingSkyFireworks.push({ x: fx, y: fy + 10.5, z: fz, timer: 0.55, colA, colB });
      world.spawnMiningChips(hit.bx + hit.nx, hit.by + hit.ny, hit.bz + hit.nz, 0, 1, 0, BLOCK.GOLD_BLOCK, 6);
      sound.playFuse();
      pushSubtitle('Havai Fişek ateşlendi!', fx, fz);
      consumeOne();
      triggerLocalSwing();
      return true;
    }
  }

  // Bone Meal Farming (#15831): Grow Wheat on Farmland or sprout wildflowers/grass on Grass!
  if ((heldId === ITEM.BONE_MEAL || heldId === ITEM.BONE) && hit) {
    if (hit.blockId === BLOCK.FARMLAND && world.getBlock(hit.bx, hit.by + 1, hit.bz) === BLOCK.AIR) {
      if (world.setBlock(hit.bx, hit.by + 1, hit.bz, BLOCK.WHEAT_CROP, false)) {
        server.broadcastBlockEdit(hit.bx, hit.by + 1, hit.bz, BLOCK.WHEAT_CROP, world.dimension);
        world.spawnMiningChips(hit.bx, hit.by + 1, hit.bz, 0, 1, 0, BLOCK.SLIME_BLOCK, 7);
        sound.playPlace('grass');
        pushSubtitle('Ekin kemik tozuyla gübrelendi', hit.bx + 0.5, hit.bz + 0.5);
        consumeOne();
        triggerLocalSwing();
        return true;
      }
    } else if (hit.blockId === BLOCK.GRASS && world.getBlock(hit.bx, hit.by + 1, hit.bz) === BLOCK.AIR) {
      let grewAny = false;
      const flora = [BLOCK.TALL_GRASS, BLOCK.TALL_GRASS, BLOCK.TALL_GRASS, BLOCK.DANDELION, BLOCK.POPPY, BLOCK.CORNFLOWER, BLOCK.OXEYE_DAISY];
      for (let i = 0; i < 6; i++) {
        const gx = hit.bx + Math.floor(Math.random() * 5) - 2;
        const gz = hit.bz + Math.floor(Math.random() * 5) - 2;
        if (world.getBlock(gx, hit.by, gz) === BLOCK.GRASS && world.getBlock(gx, hit.by + 1, gz) === BLOCK.AIR) {
          const pick = flora[Math.floor(Math.random() * flora.length)];
          if (world.setBlock(gx, hit.by + 1, gz, pick, false)) {
            server.broadcastBlockEdit(gx, hit.by + 1, gz, pick, world.dimension);
            grewAny = true;
          }
        }
      }
      if (grewAny) {
        world.spawnMiningChips(hit.bx, hit.by + 1, hit.bz, 0, 1, 0, BLOCK.SLIME_BLOCK, 8);
        sound.playPlace('grass');
        pushSubtitle('Kemik tozu serpildi', hit.bx + 0.5, hit.bz + 0.5);
        consumeOne();
        triggerLocalSwing();
        return true;
      }
    }
  }

  // Hoe tilling: Grass / Dirt / Dirt Path -> Farmland!
  if (heldDef.toolClass === 'hoe' && hit) {
    if (
      (hit.blockId === BLOCK.GRASS || hit.blockId === BLOCK.DIRT || hit.blockId === BLOCK.DIRT_PATH) &&
      world.getBlock(hit.bx, hit.by + 1, hit.bz) === BLOCK.AIR
    ) {
      if (world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.FARMLAND, false)) {
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.FARMLAND, world.dimension);
        sound.playStep('grass');
        pushSubtitle('Toprak çapalandı', hit.bx + 0.5, hit.bz + 0.5);
        damageHeldTool(1, isOffhand);
        triggerLocalSwing();
        return true;
      }
    }
  }

  // Shovel pathing: Grass -> Dirt Path!
  if (heldDef.toolClass === 'shovel' && hit) {
    if (hit.blockId === BLOCK.GRASS && world.getBlock(hit.bx, hit.by + 1, hit.bz) === BLOCK.AIR) {
      if (world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.DIRT_PATH, false)) {
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.DIRT_PATH, world.dimension);
        sound.playStep('grass');
        damageHeldTool(1, isOffhand);
        triggerLocalSwing();
        return true;
      }
    }
  }

  // Spawn Egg
  if (heldDef.spawnSpecies && hit) {
    const sx = hit.bx + hit.nx + 0.5;
    const sy = hit.by + hit.ny + 0.05;
    const sz = hit.bz + hit.nz + 0.5;
    mobs.spawnMob(heldDef.spawnSpecies as MobSpecies, sx, sy, sz, world.dimension);
    sound.playPlace('grass');
    triggerLocalSwing();
    consumeOne();
    return true;
  }

  // Shears Carving: Pumpkin -> Carved Pumpkin (`golems.rs` Golem Head!)
  if (heldId === ITEM.SHEARS && hit && hit.blockId === BLOCK.PUMPKIN) {
    if (world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.CARVED_PUMPKIN, false)) {
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.CARVED_PUMPKIN, world.dimension);
      world.spawnItemDrop(hit.bx + 0.5, hit.by + 1.05, hit.bz + 0.5, { id: ITEM.WHEAT_ITEM, count: 2 }, 0.3);
      sound.playPlace('wood');
      pushSubtitle('Bal kabağı oyuldu!', hit.bx + 0.5, hit.bz + 0.5);
      damageHeldTool(1, isOffhand);
      triggerLocalSwing();
      return true;
    }
  }

  // Snowball Throwable Projectile
  if (heldId === ITEM.SNOWBALL) {
    const { dx, dy, dz } = lookDirection();
    const eyeY = player.y + player.eyeHeight(input.sneak);
    const sx = player.x + dx * 0.4;
    const sy = eyeY - 0.05;
    const sz = player.z + dz * 0.4;
    projectiles.shootSnowball(sx, sy, sz, dx, dy, dz, true, true, 1);
    server.broadcastProjectile('snowball', sx, sy, sz, dx, dy, dz, 22, world.dimension);
    sound.playStep('snow');
    pushSubtitle('Kartopu fırlatıldı');
    triggerLocalSwing();
    consumeOne();
    return true;
  }

  // Horizon 26.3 `wind.rs`: Wind Charge Projectile (Rocket-jump + Mace Smash combo!)
  if (heldId === ITEM.WIND_CHARGE) {
    const { dx, dy, dz } = lookDirection();
    const eyeY = player.y + player.eyeHeight(input.sneak);
    const sx = player.x + dx * 0.45;
    const sy = eyeY - 0.06;
    const sz = player.z + dz * 0.45;
    projectiles.shootWindCharge(sx, sy, sz, dx, dy, dz, 26, true);
    server.broadcastProjectile('wind_charge', sx, sy, sz, dx, dy, dz, 26, world.dimension);
    sound.playRiptide();
    pushSubtitle('Rüzgar Yükü fırlatıldı');
    triggerLocalSwing();
    consumeOne();
    return true;
  }

  // Ender Pearl
  if (heldId === ITEM.ENDER_PEARL) {
    const { dx, dy, dz } = lookDirection();
    const eyeY = player.y + player.eyeHeight(input.sneak);
    const sx = player.x + dx * 0.4;
    const sy = eyeY - 0.05;
    const sz = player.z + dz * 0.4;
    projectiles.throwEnderPearl(sx, sy, sz, dx, dy, dz, true);
    server.broadcastProjectile('pearl', sx, sy, sz, dx, dy, dz, 21, world.dimension);
    sound.playBow();
    triggerLocalSwing();
    consumeOne();
    return true;
  }

  // Flint & Steel
  if (heldId === ITEM.FLINT_AND_STEEL && hit) {
    if (hit.blockId === BLOCK.CAMPFIRE_UNLIT) {
      if (world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE, false)) {
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE, world.dimension);
        sound.playFuse();
        pushSubtitle('Kamp ateşi yeniden yakıldı!', hit.bx + 0.5, hit.bz + 0.5);
        damageHeldTool(1, isOffhand);
        triggerLocalSwing();
        return true;
      }
    }
    if (hit.blockId === BLOCK.TNT) {
      world.igniteTnt(hit.bx, hit.by, hit.bz, true);
      server.broadcastTnt(hit.bx, hit.by, hit.bz, world.dimension);
      sound.playFuse();
      pushSubtitle('TNT ateşlendi', hit.bx + 0.5, hit.bz + 0.5);
      damageHeldTool(1, isOffhand);
      triggerLocalSwing();
      return true;
    }
    const tx = hit.bx + hit.nx, ty = hit.by + hit.ny, tz = hit.bz + hit.nz;
    if (world.tryIgnitePortalAt(tx, ty, tz)) {
      sound.playPortal();
      damageHeldTool(1, isOffhand);
      triggerLocalSwing();
      pushChat({ sender: 'Horizon', color: '#d8b4fe', text: 'Nether Geçidi ateşlendi!', system: true });
      return true;
    }
  }

  // Empty Bucket (with stack-split preservation + Powder Snow scooping!)
  if (heldId === ITEM.BUCKET_EMPTY) {
    if (hit && hit.blockId === BLOCK.POWDER_SNOW) {
      world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.AIR, false);
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.AIR, world.dimension);
      if (gameMode === 'survival') {
        if (stack.count > 1) {
          stack.count -= 1;
          giveOrDropItem({ id: ITEM.BUCKET_POWDER_SNOW, count: 1 });
        } else {
          stack.id = ITEM.BUCKET_POWDER_SNOW;
        }
      }
      sound.playStep('snow');
      pushSubtitle('Toz Kar kovaya alındı');
      renderHotbar();
      triggerLocalSwing();
      return true;
    }
    const liqHit = currentRaycastHit(true);
    if (liqHit && (liqHit.blockId === BLOCK.WATER || liqHit.blockId === BLOCK.LAVA)) {
      const filledId = liqHit.blockId === BLOCK.WATER ? ITEM.BUCKET_WATER : ITEM.BUCKET_LAVA;
      world.setBlock(liqHit.bx, liqHit.by, liqHit.bz, BLOCK.AIR, false);
      server.broadcastBlockEdit(liqHit.bx, liqHit.by, liqHit.bz, BLOCK.AIR, world.dimension);
      if (gameMode === 'survival') {
        if (stack.count > 1) {
          stack.count -= 1;
          giveOrDropItem({ id: filledId, count: 1 });
        } else {
          stack.id = filledId;
        }
      }
      sound.playStep('water');
      pushSubtitle('Kova dolduruldu');
      renderHotbar();
      triggerLocalSwing();
      return true;
    }
  }

  // Powder Snow Bucket (`powder_snow_collision.rs`)
  if (heldId === ITEM.BUCKET_POWDER_SNOW && hit) {
    const hitDef = getBlock(hit.blockId);
    const replaceInPlace = hitDef.replaceable && hit.blockId !== BLOCK.AIR;
    const px = replaceInPlace ? hit.bx : hit.bx + hit.nx;
    const py = replaceInPlace ? hit.by : hit.by + hit.ny;
    const pz = replaceInPlace ? hit.bz : hit.bz + hit.nz;
    if (getBlock(world.getBlock(px, py, pz)).replaceable) {
      if (world.setBlock(px, py, pz, BLOCK.POWDER_SNOW, false)) {
        server.broadcastBlockEdit(px, py, pz, BLOCK.POWDER_SNOW, world.dimension);
        if (gameMode === 'survival') {
          if (stack.count > 1) {
            stack.count -= 1;
            giveOrDropItem({ id: ITEM.BUCKET_EMPTY, count: 1 });
          } else {
            stack.id = ITEM.BUCKET_EMPTY;
          }
        }
        sound.playPlace('snow');
        pushSubtitle('Toz Kar yerleştirildi');
        renderHotbar();
        triggerLocalSwing();
        return true;
      }
    }
  }

  // Water / Lava Bucket (with replaceable destination guard + Nether water evaporation!)
  if ((heldId === ITEM.BUCKET_WATER || heldId === ITEM.BUCKET_LAVA) && hit) {
    const hitDef = getBlock(hit.blockId);
    const replaceInPlace = hitDef.replaceable && hit.blockId !== BLOCK.AIR && !isWaterBlock(hit.blockId) && !isLavaBlock(hit.blockId);
    const px = replaceInPlace ? hit.bx : hit.bx + hit.nx;
    const py = replaceInPlace ? hit.by : hit.by + hit.ny;
    const pz = replaceInPlace ? hit.bz : hit.bz + hit.nz;
    if (getBlock(world.getBlock(px, py, pz)).replaceable) {
      if (heldId === ITEM.BUCKET_WATER && world.dimension === 'nether') {
        if (gameMode === 'survival') {
          if (stack.count > 1) {
            stack.count -= 1;
            giveOrDropItem({ id: ITEM.BUCKET_EMPTY, count: 1 });
          } else {
            stack.id = ITEM.BUCKET_EMPTY;
          }
        }
        sound.playFuse();
        pushSubtitle('Nether sıcağında su buharlaştı!', px + 0.5, pz + 0.5);
        renderHotbar();
        triggerLocalSwing();
        return true;
      }
      const placeLiquid = heldId === ITEM.BUCKET_WATER ? BLOCK.WATER : BLOCK.LAVA;
      if (world.setBlock(px, py, pz, placeLiquid, false)) {
        server.broadcastBlockEdit(px, py, pz, placeLiquid, world.dimension);
        if (gameMode === 'survival') {
          if (stack.count > 1) {
            stack.count -= 1;
            giveOrDropItem({ id: ITEM.BUCKET_EMPTY, count: 1 });
          } else {
            stack.id = ITEM.BUCKET_EMPTY;
          }
        }
        sound.playStep('water');
        pushSubtitle('Kova boşaltıldı');
        renderHotbar();
        triggerLocalSwing();
        return true;
      }
    }
  }

  // Boat placement
  if (heldId === ITEM.BOAT_ITEM) {
    const boatTarget = currentRaycastHit(true);
    if (boatTarget) {
      const bx = boatTarget.bx + 0.5;
      const by = isWaterBlock(boatTarget.blockId) ? boatTarget.by + 0.86 : boatTarget.by + boatTarget.ny + 0.05;
      const bz = boatTarget.bz + 0.5;
      boats.spawnBoat(bx, by, bz, world.dimension, player.yaw);
      sound.playPlace('wood');
      triggerLocalSwing();
      consumeOne();
      return true;
    }
  }

  // Armor Stand placement (`armor_stands.rs`: snaps cleanly to 45° orientation!)
  if (heldId === ITEM.ARMOR_STAND && hit) {
    const hitDef = getBlock(hit.blockId);
    const replaceInPlace = hitDef.replaceable && hit.blockId !== BLOCK.AIR;
    const px = replaceInPlace ? hit.bx : hit.bx + hit.nx;
    const py = replaceInPlace ? hit.by : hit.by + hit.ny;
    const pz = replaceInPlace ? hit.bz : hit.bz + hit.nz;
    if (
      getBlock(world.getBlock(px, py, pz)).replaceable &&
      getBlock(world.getBlock(px, py + 1, pz)).replaceable &&
      getBlock(world.getBlock(px, py - 1, pz)).solid
    ) {
      const snapYaw = Math.round((player.yaw + Math.PI) / (Math.PI / 4)) * (Math.PI / 4);
      armorStands.placeStand(world.dimension, px + 0.5, py, pz + 0.5, snapYaw);
      sound.playPlace('wood');
      pushSubtitle('Zırh Askısı yerleştirildi', px + 0.5, pz + 0.5);
      triggerLocalSwing();
      consumeOne();
      return true;
    }
  }

  // Block placement (with Double-Slab merge & Directional 3D Stair orientation!)
  if (heldDef.isBlock && hit) {
    const crouchedNow = player.isCrouching || input.sneak;

    // Double-Slab Merge: placing matching slab onto top face merges into full cube!
    if (hit.ny === 1 && hit.blockId === heldId) {
      let mergedFull = 0;
      if (heldId === BLOCK.OAK_SLAB) mergedFull = BLOCK.OAK_PLANKS;
      else if (heldId === BLOCK.COBBLESTONE_SLAB) mergedFull = BLOCK.COBBLESTONE;
      else if (heldId === BLOCK.STONE_BRICK_SLAB) mergedFull = BLOCK.STONE_BRICKS;
      else if (heldId === BLOCK.SPRUCE_SLAB) mergedFull = BLOCK.SPRUCE_PLANKS;
      if (mergedFull > 0 && !player.overlapsPlayer(hit.bx, hit.by, hit.bz, crouchedNow, world, mergedFull)) {
        if (world.setBlock(hit.bx, hit.by, hit.bz, mergedFull, false)) {
          const mDef = getBlock(mergedFull);
          sound.playPlace(mDef.material);
          pushSubtitle('Çift basamak birleşti', hit.bx + 0.5, hit.bz + 0.5);
          triggerLocalSwing();
          server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, mergedFull, world.dimension);
          consumeOne();
          return true;
        }
      }
    }

    const hitDef = getBlock(hit.blockId);
    const replaceInPlace = hitDef.replaceable && hit.blockId !== BLOCK.AIR;
    const px = replaceInPlace ? hit.bx : hit.bx + hit.nx;
    const py = replaceInPlace ? hit.by : hit.by + hit.ny;
    const pz = replaceInPlace ? hit.bz : hit.bz + hit.nz;

    const existingAtDest = getBlock(world.getBlock(px, py, pz));
    if (!existingAtDest.replaceable) return false;

    // Orient 3D Stairs to ascend away from player along horizontal look direction!
    let placeBlockId = heldId;
    if (heldId === BLOCK.OAK_STAIRS_N || heldId === BLOCK.COBBLESTONE_STAIRS_N) {
      const look = lookDirection();
      const isOak = heldId === BLOCK.OAK_STAIRS_N;
      if (Math.abs(look.dx) > Math.abs(look.dz)) {
        placeBlockId = look.dx > 0
          ? (isOak ? BLOCK.OAK_STAIRS_E : BLOCK.COBBLESTONE_STAIRS_E)
          : (isOak ? BLOCK.OAK_STAIRS_W : BLOCK.COBBLESTONE_STAIRS_W);
      } else {
        placeBlockId = look.dz > 0
          ? (isOak ? BLOCK.OAK_STAIRS_S : BLOCK.COBBLESTONE_STAIRS_S)
          : (isOak ? BLOCK.OAK_STAIRS_N : BLOCK.COBBLESTONE_STAIRS_N);
      }
    }

    const chosenDef = getBlock(placeBlockId);
    if (chosenDef.solid && player.overlapsPlayer(px, py, pz, crouchedNow, world, placeBlockId)) return false;

    const isDoorPlace = placeBlockId === BLOCK.OAK_DOOR_CLOSED || placeBlockId === BLOCK.OAK_DOOR_OPEN;
    if (isDoorPlace) {
      if (!getBlock(world.getBlock(px, py + 1, pz)).replaceable) return false;
      if (chosenDef.solid && player.overlapsPlayer(px, py + 1, pz, crouchedNow, world, placeBlockId)) return false;
      if (!getBlock(world.getBlock(px, py - 1, pz)).solid) return false;
    }

    // Support checks (`speleothem.rs` & floor-mounted blocks): prevent mid-air floating placement!
    if (placeBlockId === BLOCK.POINTED_DRIPSTONE) {
      const belowId = world.getBlock(px, py - 1, pz);
      const aboveId = world.getBlock(px, py + 1, pz);
      const okSupport =
        getBlock(belowId).solid ||
        belowId === BLOCK.POINTED_DRIPSTONE ||
        getBlock(aboveId).solid ||
        aboveId === BLOCK.POINTED_DRIPSTONE;
      if (!okSupport) return false;
    } else if (
      placeBlockId === BLOCK.FLOWER_POT ||
      placeBlockId === BLOCK.CAKE ||
      placeBlockId === BLOCK.REDSTONE_DUST_OFF ||
      placeBlockId === BLOCK.TORCH
    ) {
      if (!getBlock(world.getBlock(px, py - 1, pz)).solid) return false;
    }

    if (world.setBlock(px, py, pz, placeBlockId, false)) {
      if (isDoorPlace) {
        world.setBlock(px, py + 1, pz, placeBlockId, false);
        server.broadcastBlockEdit(px, py + 1, pz, placeBlockId, world.dimension);
      }
      if (placeBlockId === BLOCK.AMETHYST_BLOCK || placeBlockId === BLOCK.AMETHYST_CLUSTER) {
        sound.playAmethystChime();
      } else {
        sound.playPlace(chosenDef.material);
      }
      pushSubtitle('Blok yerleştirildi', px + 0.5, pz + 0.5);
      triggerLocalSwing();
      server.broadcastBlockEdit(px, py, pz, placeBlockId, world.dimension);
      if (
        placeBlockId === BLOCK.REDSTONE_DUST_OFF ||
        placeBlockId === BLOCK.REDSTONE_LAMP_OFF ||
        placeBlockId === BLOCK.COPPER_BULB_OFF ||
        placeBlockId === BLOCK.OAK_TRAPDOOR_CLOSED ||
        placeBlockId === BLOCK.NOTE_BLOCK ||
        placeBlockId === BLOCK.PISTON ||
        placeBlockId === BLOCK.TNT
      ) {
        propagateRedstoneAround(px, py, pz);
      }
      if (placeBlockId === BLOCK.CARVED_PUMPKIN || placeBlockId === BLOCK.JACK_O_LANTERN) {
        trySpawnGolemFromHead(px, py, pz);
      }
      consumeOne();
      return true;
    }
  }

  return false;
}

// Horizon 26.3 `golems.rs` + `copper_golems.rs` In-World Golem Construction!
function trySpawnGolemFromHead(hx: number, hy: number, hz: number): boolean {
  const clearAndBroadcast = (coords: Array<[number, number, number]>) => {
    const edits = coords.map(([wx, y, wz]) => ({ wx, y, wz, blockId: BLOCK.AIR, dim: world.dimension }));
    for (const e of edits) world.setBlock(e.wx, e.y, e.wz, BLOCK.AIR, true);
    server.broadcastBlockEditsBatch(edits, true);
  };

  const b1 = world.getBlock(hx, hy - 1, hz);
  const b2 = world.getBlock(hx, hy - 2, hz);

  // 1. Snow Golem: Head on 2 vertical SNOW_BLOCKs (`y-1`, `y-2`)
  if (b1 === BLOCK.SNOW_BLOCK && b2 === BLOCK.SNOW_BLOCK) {
    clearAndBroadcast([[hx, hy, hz], [hx, hy - 1, hz], [hx, hy - 2, hz]]);
    mobs.spawnMob('snow_golem', hx + 0.5, hy - 1.95, hz + 0.5, world.dimension);
    sound.playXp(true);
    pushChat({ sender: 'Horizon', color: '#7dd3fc', text: 'Kar Golemi inşa edildi ve canlandı!', system: true });
    return true;
  }

  // 2. Iron Golem: Head on T-pattern of 4 IRON_BLOCKs (`y-1`, `y-2`, plus X-arms or Z-arms at `y-1`)
  if (b1 === BLOCK.IRON_BLOCK && b2 === BLOCK.IRON_BLOCK) {
    const xArms =
      world.getBlock(hx - 1, hy - 1, hz) === BLOCK.IRON_BLOCK &&
      world.getBlock(hx + 1, hy - 1, hz) === BLOCK.IRON_BLOCK &&
      getBlock(world.getBlock(hx - 1, hy - 2, hz)).replaceable &&
      getBlock(world.getBlock(hx + 1, hy - 2, hz)).replaceable;
    const zArms =
      world.getBlock(hx, hy - 1, hz - 1) === BLOCK.IRON_BLOCK &&
      world.getBlock(hx, hy - 1, hz + 1) === BLOCK.IRON_BLOCK &&
      getBlock(world.getBlock(hx, hy - 2, hz - 1)).replaceable &&
      getBlock(world.getBlock(hx, hy - 2, hz + 1)).replaceable;
    if (xArms || zArms) {
      const blocks: Array<[number, number, number]> = xArms
        ? [[hx, hy, hz], [hx, hy - 1, hz], [hx, hy - 2, hz], [hx - 1, hy - 1, hz], [hx + 1, hy - 1, hz]]
        : [[hx, hy, hz], [hx, hy - 1, hz], [hx, hy - 2, hz], [hx, hy - 1, hz - 1], [hx, hy - 1, hz + 1]];
      clearAndBroadcast(blocks);
      mobs.spawnMob('iron_golem', hx + 0.5, hy - 1.95, hz + 0.5, world.dimension);
      sound.playXp(true);
      pushChat({ sender: 'Horizon', color: '#4ade80', text: 'Demir Golem inşa edildi ve köyü korumaya başladı!', system: true });
      return true;
    }
  }

  // 3. Copper Golem (`copper_golems.rs` 26.3): Head on any Copper Block stage at `y-1`
  if (
    b1 === BLOCK.COPPER_BLOCK ||
    b1 === BLOCK.EXPOSED_COPPER ||
    b1 === BLOCK.WEATHERED_COPPER ||
    b1 === BLOCK.OXIDIZED_COPPER
  ) {
    clearAndBroadcast([[hx, hy, hz], [hx, hy - 1, hz]]);
    mobs.spawnMob('copper_golem', hx + 0.5, hy - 0.95, hz + 0.5, world.dimension);
    sound.playXp(true);
    pushChat({ sender: 'Horizon', color: '#fb923c', text: 'Bakır Golem (26.3) inşa edildi ve canlandı!', system: true });
    return true;
  }

  // 4. Wither Boss: Head on T-pattern of 4 SOUL_SAND blocks (`y-1`, `y-2`, plus X-arms or Z-arms at `y-1`)
  if (b1 === BLOCK.SOUL_SAND && b2 === BLOCK.SOUL_SAND) {
    const xArms =
      world.getBlock(hx - 1, hy - 1, hz) === BLOCK.SOUL_SAND &&
      world.getBlock(hx + 1, hy - 1, hz) === BLOCK.SOUL_SAND;
    const zArms =
      world.getBlock(hx, hy - 1, hz - 1) === BLOCK.SOUL_SAND &&
      world.getBlock(hx, hy - 1, hz + 1) === BLOCK.SOUL_SAND;
    if (xArms || zArms) {
      const blocks: Array<[number, number, number]> = xArms
        ? [[hx, hy, hz], [hx, hy - 1, hz], [hx, hy - 2, hz], [hx - 1, hy - 1, hz], [hx + 1, hy - 1, hz]]
        : [[hx, hy, hz], [hx, hy - 1, hz], [hx, hy - 2, hz], [hx, hy - 1, hz - 1], [hx, hy - 1, hz + 1]];
      clearAndBroadcast(blocks);
      mobs.spawnMob('wither', hx + 0.5, hy - 1.2, hz + 0.5, world.dimension);
      sound.playExplosion();
      sound.playPortal();
      pushChat({ sender: 'Boss', color: '#e879f9', text: 'WITHER BOSS uyandırıldı! Gökyüzü karardı!', system: true });
      return true;
    }
  }

  return false;
}

function handleRightClickUseOrPlace(isInitialPress = false): boolean {
  const stack = hotbar[selectedSlot];
  const heldId = stack?.id || 0;
  const eyeY = player.y + player.eyeHeight(input.sneak);
  const { dx, dy, dz } = lookDirection();
  const hit = currentRaycastHit(false);
  const maxEntityDist = hit ? Math.min(4.2, hit.dist + 0.1) : 4.2;

  // 0a. Right-Click Boat or Armor Stand or Living Mob (clamped to solid wall distance)
  if (isInitialPress) {
    const standHit = armorStands.raycastStand(player.x, eyeY, player.z, dx, dy, dz, maxEntityDist, world.dimension);
    if (standHit && heldId !== ITEM.ARMOR_STAND) {
      const res = armorStands.interactStand(standHit, stack, gameMode === 'creative', sound);
      if (res.changed) {
        hotbar[selectedSlot] = res.nextHand;
        if (res.giveExtra) giveOrDropItem(res.giveExtra);
        renderHotbar();
        triggerLocalSwing();
        return true;
      }
    }

    const boatHit = boats.raycastBoat(player.x, eyeY, player.z, dx, dy, dz, maxEntityDist, world.dimension);
    if (boatHit) {
      boats.mountOrDismount(boatHit, sound);
      triggerLocalSwing();
      return true;
    }

    // 0b. Right-Click Living Mob Interaction
    const mobHit = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, maxEntityDist, world.dimension);
    if (mobHit && mobHit !== 'dragon') {
      const consumedCallback = () => {
        if (gameMode === 'survival' && stack) {
          stack.count -= 1;
          if (stack.count <= 0) hotbar[selectedSlot] = null;
          renderHotbar();
        }
      };
      if (mobs.interactWithMob(mobHit, stack, consumedCallback, world, sound, () => damageHeldTool(1, false))) {
        triggerLocalSwing();
        return true;
      }
    }
  }

  // 1. Interactive World Blocks (Vanilla sneak-bypass: sneaking skips interaction ONLY when holding an item/block!)
  const sneakingNow = input.sneak || player.isCrouching || mobileSneakLocked;
  const bothHandsEmpty = heldId <= 0 && (offhandSlot?.id || 0) <= 0;
  if (isInitialPress && hit && (!sneakingNow || bothHandsEmpty)) {
    const targetBlock = getBlock(hit.blockId);
    if (targetBlock.interactive === 'crafting') {
      openInventoryModal('table');
      return true;
    }
    if (targetBlock.interactive === 'furnace') {
      openInventoryModal('furnace');
      return true;
    }
    if (targetBlock.interactive === 'chest' || targetBlock.interactive === 'barrel') {
      openInventoryModal('chest', `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`);
      sound.playPlace('wood');
      return true;
    }
    if (targetBlock.interactive === 'campfire') {
      const cfKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      const heldDefNow = getItemDef(heldId);
      if (hit.blockId === BLOCK.CAMPFIRE_UNLIT) {
        if (heldId === ITEM.FLINT_AND_STEEL) {
          world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE, false);
          server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE, world.dimension);
          sound.playFuse();
          pushSubtitle('Kamp ateşi yakıldı!', hit.bx + 0.5, hit.bz + 0.5);
          damageHeldTool(1, false);
          triggerLocalSwing();
        } else {
          pushSubtitle('Sönmüş kamp ateşi — Çakmaktaşlı Çelik ile yakın', hit.bx + 0.5, hit.bz + 0.5);
        }
        return true;
      }
      // Lit Campfire (`campfire.rs` + `campfire_douse.rs`)
      if (heldDefNow.toolClass === 'shovel') {
        world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE_UNLIT, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.CAMPFIRE_UNLIT, world.dimension);
        const cf = campfireCookSlots.get(cfKey);
        if (cf && cf.timers.length > 0) {
          world.spawnItemDrop(hit.bx + 0.5, hit.by + 0.55, hit.bz + 0.5, { id: ITEM.RAW_BEEF, count: cf.timers.length }, 0.3);
          campfireCookSlots.delete(cfKey);
        }
        sound.playFuse();
        pushSubtitle('Kamp ateşi kürekle söndürüldü', hit.bx + 0.5, hit.bz + 0.5);
        damageHeldTool(1, false);
        triggerLocalSwing();
        return true;
      }
      const rawBeefHand = stack?.id === ITEM.RAW_BEEF ? { st: stack, off: false } : (offhandSlot?.id === ITEM.RAW_BEEF ? { st: offhandSlot, off: true } : null);
      if (rawBeefHand) {
        let cf = campfireCookSlots.get(cfKey);
        if (!cf) {
          cf = { dim: world.dimension, bx: hit.bx, by: hit.by, bz: hit.bz, timers: [] };
          campfireCookSlots.set(cfKey, cf);
        }
        if (cf.timers.length >= 4) {
          pushSubtitle('Kamp ateşi dolu (4/4 et pişiyor)', hit.bx + 0.5, hit.bz + 0.5);
          return true;
        }
        cf.timers.push(6.0);
        if (gameMode === 'survival') {
          rawBeefHand.st.count -= 1;
          if (rawBeefHand.st.count <= 0) {
            if (rawBeefHand.off) offhandSlot = null;
            else hotbar[selectedSlot] = null;
          }
          renderHotbar();
        }
        sound.playPlace('wood');
        pushSubtitle(`Çiğ biftek kamp ateşine konuldu (${cf.timers.length}/4)`, hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      const activeCount = campfireCookSlots.get(cfKey)?.timers.length || 0;
      pushSubtitle(
        activeCount > 0 ? `Kamp ateşinde ${activeCount}/4 et pişiyor...` : 'Kamp Ateşi — Çiğ Biftek ile sağ tıklayın (Yakıt gerekmez!)',
        hit.bx + 0.5,
        hit.bz + 0.5
      );
      return true;
    }
    if (targetBlock.interactive === 'anvil') {
      const repairTarget = stack && getItemDef(stack.id).maxDurability && (stack.damage || 0) > 0
        ? stack
        : armorSlots.find((a) => a && getItemDef(a.id).maxDurability && (a.damage || 0) > 0) || null;
      if (!repairTarget) {
        sound.playPlace('metal');
        pushSubtitle('Örs — Hasarlı bir alet, silah veya zırh tutarak sağ tıklayın', hit.bx + 0.5, hit.bz + 0.5);
        return true;
      }
      const rDef = getItemDef(repairTarget.id);
      const canPay =
        gameMode === 'creative' ||
        xpTotal >= 5 ||
        consumeItemFromInventory(ITEM.IRON_INGOT, 1) ||
        consumeItemFromInventory(ITEM.DIAMOND, 1) ||
        consumeItemFromInventory(ITEM.GOLD_INGOT, 1);
      if (!canPay) {
        pushSubtitle('Onarım için 1 Külçe/Elmas veya 5 XP gerekli!', hit.bx + 0.5, hit.bz + 0.5);
        return true;
      }
      if (gameMode !== 'creative' && xpTotal >= 5) {
        xpTotal = Math.max(0, xpTotal - 5);
        xpLevel = Math.floor(Math.sqrt(xpTotal / 7));
      }
      repairTarget.damage = 0;
      renderHotbar();
      renderVitalsAndXp();
      sound.playPlace('metal');
      sound.playBell();
      pushSubtitle(`${rDef.name} örste tamamen onarıldı!`, hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'enchanting') {
      let books = 0;
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
              if (world.getBlock(hit.bx + dx, hit.by + dy, hit.bz + dz) === BLOCK.BOOKSHELF) books++;
            }
          }
        }
      }
      const power = Math.min(15, books);
      const targetTier = power >= 6 ? 3 : power >= 3 ? 2 : 1;
      sound.playAmethystChime();
      const heldDefNow = stack ? getItemDef(stack.id) : null;
      if (stack && heldDefNow && (heldDefNow.maxDurability || heldDefNow.attackDamage)) {
        if ((stack.ench || 0) >= targetTier && !(stack.damage && stack.damage > 0)) {
          pushSubtitle(`Büyü Masası (Kitaplık: ${power}/15) — Ekipman zaten ★${targetTier} seviyesinde!`, hit.bx + 0.5, hit.bz + 0.5);
          return true;
        }
        const paid =
          gameMode === 'creative' ||
          xpLevel >= 1 ||
          consumeItemFromInventory(ITEM.AMETHYST_SHARD, 1) ||
          consumeItemFromInventory(ITEM.EMERALD, 1);
        if (!paid) {
          pushSubtitle(`Büyülemek için 1 XP Seviyesi veya 1 Ametist Parçası gerekli (Kitaplık: ${power}/15)`, hit.bx + 0.5, hit.bz + 0.5);
          return true;
        }
        if (gameMode !== 'creative' && xpLevel >= 1) {
          xpLevel = Math.max(0, xpLevel - 1);
          xpTotal = xpLevel * xpLevel * 7;
        }
        stack.ench = Math.max(stack.ench || 0, targetTier);
        stack.damage = 0;
        renderHotbar();
        renderVitalsAndXp();
        sound.playXp(true);
        const roman = stack.ench === 3 ? 'III' : stack.ench === 2 ? 'II' : 'I';
        pushChat({
          sender: 'Büyü Masası',
          color: '#c084fc',
          text: `${heldDefNow.name} büyülenerek Güç/Verimlilik ${roman} kazandı! (Kitaplık Gücü: ${power}/15)`,
          system: true
        });
        triggerLocalSwing();
        return true;
      }
      pushSubtitle(`Büyü Masası (Kitaplık Gücü: ${power}/15) — Kılıç, Kazma, Gürz veya Yay tutarak sağ tıklayın`, hit.bx + 0.5, hit.bz + 0.5);
      return true;
    }
    if (targetBlock.interactive === 'berry_bush') {
      const bKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      if ((berryCooldowns.get(bKey) || 0) > 0) {
        pushSubtitle('Çalıdaki meyveler henüz olgunlaşmadı...', hit.bx + 0.5, hit.bz + 0.5);
        return true;
      }
      berryCooldowns.set(bKey, 18.0);
      world.spawnItemDrop(hit.bx + 0.5, hit.by + 0.55, hit.bz + 0.5, { id: ITEM.SWEET_BERRIES, count: 2 }, 0.25);
      sound.playPlace('grass');
      pushSubtitle('Tatlı orman meyvesi toplandı!', hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'cauldron') {
      // Horizon 26.3 `cauldrons.rs`: Fill/empty Cauldron with Water or Lava Buckets!
      if (hit.blockId === BLOCK.CAULDRON_EMPTY && (heldId === ITEM.BUCKET_WATER || heldId === ITEM.BUCKET_LAVA)) {
        const nextBlock = heldId === ITEM.BUCKET_WATER ? BLOCK.CAULDRON_WATER : BLOCK.CAULDRON_LAVA;
        world.setBlock(hit.bx, hit.by, hit.bz, nextBlock, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, nextBlock, world.dimension);
        if (gameMode === 'survival' && stack) {
          if (stack.count > 1) {
            stack.count -= 1;
            giveOrDropItem({ id: ITEM.BUCKET_EMPTY, count: 1 });
          } else {
            stack.id = ITEM.BUCKET_EMPTY;
          }
          renderHotbar();
        }
        if (nextBlock === BLOCK.CAULDRON_WATER) sound.playStep('water');
        else sound.playFuse();
        pushSubtitle(nextBlock === BLOCK.CAULDRON_WATER ? 'Kazan suyla dolduruldu!' : 'Kazan lavla dolduruldu!', hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      if ((hit.blockId === BLOCK.CAULDRON_WATER || hit.blockId === BLOCK.CAULDRON_LAVA) && heldId === ITEM.BUCKET_EMPTY) {
        const filledBucket = hit.blockId === BLOCK.CAULDRON_WATER ? ITEM.BUCKET_WATER : ITEM.BUCKET_LAVA;
        world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.CAULDRON_EMPTY, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.CAULDRON_EMPTY, world.dimension);
        if (gameMode === 'survival' && stack) {
          if (stack.count > 1) {
            stack.count -= 1;
            giveOrDropItem({ id: filledBucket, count: 1 });
          } else {
            stack.id = filledBucket;
          }
          renderHotbar();
        }
        sound.playStep('water');
        pushSubtitle('Kazandan sıvı kovaya alındı!', hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      pushSubtitle(
        hit.blockId === BLOCK.CAULDRON_EMPTY
          ? 'Boş Kazan — Su/Lav Kovası ile doldurun (Yağmurda otomatik dolar)'
          : 'Dolu Kazan — Boş Kova ile sıvıyı alın',
        hit.bx + 0.5,
        hit.bz + 0.5
      );
      return true;
    }
    if (targetBlock.interactive === 'jukebox') {
      // Horizon 26.3 `jukebox.rs`: Insert/eject Music Disc & play procedural soundtrack!
      const jKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      if (jukeboxPlayingAt === jKey) {
        sound.stopMusicDisc();
        jukeboxPlayingAt = null;
        server.broadcastWorldEvent({ t: 'jukebox', k: jKey, on: false });
        world.spawnItemDrop(hit.bx + 0.5, hit.by + 1.08, hit.bz + 0.5, { id: ITEM.MUSIC_DISC, count: 1 }, 0.35);
        sound.playClick();
        pushSubtitle('Müzik diski çıkarıldı', hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      if (heldId === ITEM.MUSIC_DISC && stack) {
        if (jukeboxPlayingAt) {
          sound.stopMusicDisc();
          const [prevDim, prevCoords] = jukeboxPlayingAt.split(':');
          if (prevDim === world.dimension && prevCoords) {
            const [jx, jy, jz] = prevCoords.split(',').map(Number);
            if (Number.isFinite(jx) && Number.isFinite(jy) && Number.isFinite(jz)) {
              world.spawnItemDrop(jx + 0.5, jy + 1.08, jz + 0.5, { id: ITEM.MUSIC_DISC, count: 1 }, 0.35);
            }
          }
        }
        if (gameMode === 'survival') {
          stack.count -= 1;
          if (stack.count <= 0) hotbar[selectedSlot] = null;
          renderHotbar();
        }
        jukeboxPlayingAt = jKey;
        server.broadcastWorldEvent({ t: 'jukebox', k: jKey, on: true });
        sound.playMusicDisc();
        pushSubtitle('Müzik Kutusu çalıyor: Horizon 26.3 Melodisi!', hit.bx + 0.5, hit.bz + 0.5);
        pushChat({ sender: 'Müzik Kutusu', color: '#38bdf8', text: 'Şimdi Çalıyor: Horizon 26.3 — C418 Voxel Melodisi', system: true });
        triggerLocalSwing();
        return true;
      }
      pushSubtitle('Müzik Kutusu — Müzik Diski tutarak sağ tıklayın', hit.bx + 0.5, hit.bz + 0.5);
      return true;
    }
    if (targetBlock.interactive === 'door') {
      const nextDoor = hit.blockId === BLOCK.OAK_DOOR_CLOSED ? BLOCK.OAK_DOOR_OPEN : BLOCK.OAK_DOOR_CLOSED;
      world.setBlock(hit.bx, hit.by, hit.bz, nextDoor, false);
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, nextDoor, world.dimension);
      for (const dyOff of [-1, 1]) {
        const adjId = world.getBlock(hit.bx, hit.by + dyOff, hit.bz);
        if (adjId === BLOCK.OAK_DOOR_CLOSED || adjId === BLOCK.OAK_DOOR_OPEN) {
          world.setBlock(hit.bx, hit.by + dyOff, hit.bz, nextDoor, false);
          server.broadcastBlockEdit(hit.bx, hit.by + dyOff, hit.bz, nextDoor, world.dimension);
          break;
        }
      }
      sound.playPlace('wood');
      pushSubtitle(nextDoor === BLOCK.OAK_DOOR_OPEN ? 'Kapı açıldı' : 'Kapı kapandı', hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'trapdoor') {
      const nextTrap = hit.blockId === BLOCK.OAK_TRAPDOOR_CLOSED ? BLOCK.OAK_TRAPDOOR_OPEN : BLOCK.OAK_TRAPDOOR_CLOSED;
      world.setBlock(hit.bx, hit.by, hit.bz, nextTrap, false);
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, nextTrap, world.dimension);
      sound.playPlace('wood');
      pushSubtitle(nextTrap === BLOCK.OAK_TRAPDOOR_OPEN ? 'Tuzak kapısı açıldı' : 'Tuzak kapısı kapandı', hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'bell') {
      if (world.dimension === 'overworld' && Math.abs(hit.bx - (-18)) <= 4 && Math.abs(hit.bz - (-11)) <= 4) {
        startTempestArena();
        triggerLocalSwing();
        return true;
      }
      sound.playBell();
      pushSubtitle('Köy çanı çaldı', hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'bed') {
      // Horizon 26.3 `beds.rs`: Beds explode violently when used in Nether or The End!
      if (world.dimension !== 'overworld') {
        world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.AIR, true);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.AIR, world.dimension);
        world.onExplosion?.(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
        pushChat({ sender: 'Yatak', color: '#ff8a8a', text: 'Nether/End boyutunda uyumaya çalıştınız — Yatak patladı!', system: true });
        return true;
      }
      spawnPoint = {
        x: hit.bx + 0.5,
        y: hit.by + 1.05,
        z: hit.bz + 0.5,
        dim: world.dimension,
        bedPos: [hit.bx, hit.by, hit.bz]
      };
      if (timeOfDay > 0.54) {
        timeOfDay = 0.24;
        pushChat({ sender: 'Yatak', color: '#4ade80', text: 'Uyudunuz, sabah oldu ve yeniden doğma noktanız kaydedildi!', system: true });
      } else {
        pushChat({ sender: 'Yatak', color: '#a9a9ff', text: 'Yeniden doğma noktanız bu yatağa kaydedildi.', system: true });
      }
      sound.playPlace('wood');
      return true;
    }
    if (targetBlock.interactive === 'lever') {
      const turningOn = hit.blockId === BLOCK.LEVER_OFF;
      const nextLever = turningOn ? BLOCK.LEVER_ON : BLOCK.LEVER_OFF;
      world.setBlock(hit.bx, hit.by, hit.bz, nextLever, false);
      server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, nextLever, world.dimension);
      propagateRedstoneAround(hit.bx, hit.by, hit.bz);
      sound.playClick();
      pushSubtitle('Şalter çevrildi', hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'composter') {
      const cKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      const curLv = composterLevels.get(cKey) || 0;
      const feedStack = stack && isCompostableItem(stack.id)
        ? { st: stack, off: false }
        : (offhandSlot && isCompostableItem(offhandSlot.id) ? { st: offhandSlot, off: true } : null);
      if (feedStack) {
        if (gameMode === 'survival') {
          feedStack.st.count -= 1;
          if (feedStack.st.count <= 0) {
            if (feedStack.off) offhandSlot = null;
            else hotbar[selectedSlot] = null;
          }
          renderHotbar();
        }
        const nextLv = curLv + 1; // #15843: Strictly +1 layer per organic item!
        if (nextLv >= 7) {
          composterLevels.set(cKey, 0);
          world.spawnItemDrop(hit.bx + 0.5, hit.by + 1.08, hit.bz + 0.5, { id: ITEM.BONE_MEAL, count: 2 }, 0.35);
          world.spawnXpOrbs(hit.bx + 0.5, hit.by + 1.1, hit.bz + 0.5, 2);
          sound.playXp(false);
          pushSubtitle('Kompost tamamlandı: 2x Kemik Tozu!', hit.bx + 0.5, hit.bz + 0.5);
        } else {
          composterLevels.set(cKey, nextLv);
          sound.playPlace('grass');
          pushSubtitle(`Kompost dolduruldu (${nextLv}/7)`, hit.bx + 0.5, hit.bz + 0.5);
        }
        triggerLocalSwing();
        return true;
      } else {
        pushSubtitle(`Kompost seviyesi: ${curLv}/7`, hit.bx + 0.5, hit.bz + 0.5);
        return true;
      }
    }
    if (targetBlock.interactive === 'respawn_anchor') {
      // Horizon 26.3 `interact.rs:387`: Charge Respawn Anchor with Glowstone (0..4) & set Nether spawn (explodes outside Nether!)
      if (heldId === BLOCK.GLOWSTONE && hit.blockId < BLOCK.RESPAWN_ANCHOR_4) {
        const nextAnchor = hit.blockId + 1;
        const charges = nextAnchor - BLOCK.RESPAWN_ANCHOR_0;
        world.setBlock(hit.bx, hit.by, hit.bz, nextAnchor, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, nextAnchor, world.dimension);
        if (gameMode === 'survival' && stack) {
          stack.count -= 1;
          if (stack.count <= 0) hotbar[selectedSlot] = null;
          renderHotbar();
        }
        sound.playPortal();
        pushSubtitle(`Yeniden Doğma Çapası şarj edildi (${charges}/4)`, hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      if (hit.blockId >= BLOCK.RESPAWN_ANCHOR_1) {
        if (world.dimension !== 'nether') {
          world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.AIR, true);
          server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.AIR, world.dimension);
          world.onExplosion?.(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
          pushChat({
            sender: 'Yeniden Doğma Çapası',
            color: '#ff8a8a',
            text: 'Nether dışında Yeniden Doğma Çapası kullandınız — Çapa patladı!',
            system: true
          });
          return true;
        }
        spawnPoint = {
          x: hit.bx + 0.5,
          y: hit.by + 1.05,
          z: hit.bz + 0.5,
          dim: 'nether',
          anchorPos: [hit.bx, hit.by, hit.bz]
        };
        sound.playPortal();
        pushChat({
          sender: 'Yeniden Doğma Çapası',
          color: '#c084fc',
          text: `Nether yeniden doğma noktanız bu Çapaya kaydedildi! (Kalan şarj: ${hit.blockId - BLOCK.RESPAWN_ANCHOR_0}/4)`,
          system: true
        });
        triggerLocalSwing();
        return true;
      }
      pushSubtitle('Şarjsız Yeniden Doğma Çapası — Işıktaşı ile şarj edin (0/4)', hit.bx + 0.5, hit.bz + 0.5);
      return true;
    }
    if (targetBlock.interactive === 'note_block') {
      // Horizon 26.3 `interact.rs:236`: Cycle 25 chromatic pitches & play instrument based on block below (muffled if solid above)!
      if (getBlock(world.getBlock(hit.bx, hit.by + 1, hit.bz)).solid) {
        pushSubtitle('Nota Bloğunun üstü kapalı (Ses boğuldu)', hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
      const nbKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      const nextPitch = ((noteBlockPitches.get(nbKey) ?? -1) + 1) % 25;
      noteBlockPitches.set(nbKey, nextPitch);
      server.broadcastWorldEvent({ t: 'note', x: hit.bx, y: hit.by, z: hit.bz, p: nextPitch, dm: world.dimension });
      const inst = noteBlockInstrumentBelow(hit.bx, hit.by, hit.bz);
      sound.playNoteBlock(nextPitch, inst);
      pushSubtitle(`Nota Bloğu çaldı (${nextPitch + 1}/25 · ${inst})`, hit.bx + 0.5, hit.bz + 0.5);
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'cake') {
      // Horizon 26.3 `interact.rs:274`: Eat up to 7 slices restoring +2 hunger each!
      if (gameMode === 'survival' && hunger >= 20 && health >= 20) {
        pushSubtitle('Toksunuz — Pasta yenmedi', hit.bx + 0.5, hit.bz + 0.5);
        return true;
      }
      const ckKey = `${world.dimension}:${hit.bx},${hit.by},${hit.bz}`;
      const bites = (cakeBites.get(ckKey) || 0) + 1;
      hunger = Math.min(20, hunger + 2);
      saturation = Math.min(20, saturation + 1.2);
      if (health < 20) health = Math.min(20, health + 1);
      renderVitalsAndXp();
      sound.playEat();
      if (bites >= 7) {
        cakeBites.delete(ckKey);
        server.broadcastWorldEvent({ t: 'cake', k: ckKey, b: 7 });
        world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.AIR, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.AIR, world.dimension);
        pushSubtitle('Pastanın son dilimi yendi!', hit.bx + 0.5, hit.bz + 0.5);
      } else {
        cakeBites.set(ckKey, bites);
        server.broadcastWorldEvent({ t: 'cake', k: ckKey, b: bites });
        pushSubtitle(`Pasta dilimi yendi (${7 - bites}/7 dilim kaldı)`, hit.bx + 0.5, hit.bz + 0.5);
      }
      triggerLocalSwing();
      return true;
    }
    if (targetBlock.interactive === 'flower_pot') {
      if (hit.blockId === BLOCK.FLOWER_POT) {
        const pottedTarget =
          heldId === BLOCK.POPPY
            ? BLOCK.POTTED_POPPY
            : heldId === BLOCK.DANDELION
              ? BLOCK.POTTED_DANDELION
              : heldId === BLOCK.CACTUS
                ? BLOCK.POTTED_CACTUS
                : heldId === BLOCK.CHERRY_PETALS
                  ? BLOCK.POTTED_CHERRY
                  : 0;
        if (pottedTarget > 0 && stack) {
          world.setBlock(hit.bx, hit.by, hit.bz, pottedTarget, false);
          server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, pottedTarget, world.dimension);
          if (gameMode === 'survival') {
            stack.count -= 1;
            if (stack.count <= 0) hotbar[selectedSlot] = null;
            renderHotbar();
          }
          sound.playPlace('grass');
          pushSubtitle('Saksıya bitki dikildi!', hit.bx + 0.5, hit.bz + 0.5);
          triggerLocalSwing();
          return true;
        }
        pushSubtitle('Çiçek Saksısı — Gelincik, Karahindiba, Kaktüs veya Kiraz Fidanı dikin', hit.bx + 0.5, hit.bz + 0.5);
        return true;
      } else {
        const plantId =
          hit.blockId === BLOCK.POTTED_POPPY
            ? BLOCK.POPPY
            : hit.blockId === BLOCK.POTTED_DANDELION
              ? BLOCK.DANDELION
              : hit.blockId === BLOCK.POTTED_CACTUS
                ? BLOCK.CACTUS
                : BLOCK.CHERRY_PETALS;
        world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.FLOWER_POT, false);
        server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.FLOWER_POT, world.dimension);
        if (gameMode === 'survival') {
          giveOrDropItem({ id: plantId, count: 1 });
        }
        sound.playPlace('grass');
        pushSubtitle('Bitki saksıdan alındı', hit.bx + 0.5, hit.bz + 0.5);
        triggerLocalSwing();
        return true;
      }
    }
    if (targetBlock.interactive === 'dragon_egg') {
      // Horizon 26.3 `interact.rs:361`: Dragon Egg teleports to a nearby open voxel!
      for (let tries = 0; tries < 28; tries++) {
        const tx = hit.bx + Math.floor(Math.random() * 15) - 7;
        const ty = Math.max(2, Math.min(WORLD_HEIGHT - 3, hit.by + Math.floor(Math.random() * 7) - 3));
        const tz = hit.bz + Math.floor(Math.random() * 15) - 7;
        if (
          (tx !== hit.bx || ty !== hit.by || tz !== hit.bz) &&
          world.getBlock(tx, ty, tz) === BLOCK.AIR &&
          getBlock(world.getBlock(tx, ty - 1, tz)).solid
        ) {
          world.setBlock(hit.bx, hit.by, hit.bz, BLOCK.AIR, true);
          world.setBlock(tx, ty, tz, BLOCK.DRAGON_EGG, false);
          server.broadcastBlockEdit(hit.bx, hit.by, hit.bz, BLOCK.AIR, world.dimension);
          server.broadcastBlockEdit(tx, ty, tz, BLOCK.DRAGON_EGG, world.dimension);
          sound.playPortal();
          pushSubtitle('Ejderha Yumurtası ışınlandı!', tx + 0.5, tz + 0.5);
          triggerLocalSwing();
          return true;
        }
      }
      return true;
    }
  }

  // 2a. Hold-to-Draw Bow (Start drawing on RMB press, release arrow on mouseup!)
  if (heldId === ITEM.BOW) {
    if (isInitialPress) {
      if (gameMode === 'creative' || countItemInInventory(ITEM.ARROW) > 0) {
        bowDrawing = true;
        bowCharge = 0.05;
      } else {
        pushChat({ sender: 'Yay', color: '#f2c46b', text: 'Ok kalmadı! (Çakmaktaşı + Çubuk ile üretebilirsiniz)', system: true });
      }
    }
    return true;
  }

  const fireLoadedCrossbow = (xbowStack: ItemStack, isOffhand: boolean) => {
    xbowStack.loaded = false;
    const eyeYNow = player.y + player.eyeHeight(input.sneak);
    const cosP = Math.cos(player.pitch);
    const dyNow = Math.sin(player.pitch);
    const speed = 33;
    const baseBoltDmg = Math.round(10 + (xbowStack.ench || 0) * 1.5);
    const yawSpreads = (xbowStack.ench || 0) >= 2 ? [-0.12, 0, 0.12] : [0];
    for (const yOff of yawSpreads) {
      const yAng = player.yaw + yOff;
      const bdx = -Math.sin(yAng) * cosP;
      const bdz = -Math.cos(yAng) * cosP;
      const sx = player.x + bdx * 0.5;
      const sy = eyeYNow - 0.08;
      const sz = player.z + bdz * 0.5;
      projectiles.shootArrow(sx, sy, sz, bdx, dyNow + 0.015, bdz, speed, true, baseBoltDmg);
      server.broadcastProjectile('arrow', sx, sy, sz, bdx, dyNow + 0.015, bdz, speed, world.dimension);
    }
    sound.playCrossbowShoot();
    pushSubtitle(yawSpreads.length > 1 ? 'Arbalet üçlü yaylım ateşi!' : 'Arbalet oku ateşlendi!');
    if (gameMode === 'survival') {
      const maxDur = getItemDef(ITEM.CROSSBOW).maxDurability || 326;
      xbowStack.damage = (xbowStack.damage || 0) + 1;
      if (xbowStack.damage >= maxDur) {
        if (isOffhand) offhandSlot = null;
        else hotbar[selectedSlot] = null;
        sound.playBreak('wood');
      }
    }
    renderHotbar();
    triggerLocalSwing();
  };

  // 2a-2. Horizon 26.3 `crossbow.rs`: Charge-and-Latch Crossbow (Instant fire when `loaded`, Multishot 3-bolt fan at ★II+!)
  if (heldId === ITEM.CROSSBOW && stack) {
    if (isInitialPress) {
      if (stack.loaded) {
        fireLoadedCrossbow(stack, false);
      } else if (gameMode === 'creative' || countItemInInventory(ITEM.ARROW) > 0) {
        crossbowCharging = true;
        crossbowCharge = 0.04;
      } else {
        pushChat({ sender: 'Arbalet', color: '#f2c46b', text: 'Arbaleti kurmak için Ok gerekli!', system: true });
      }
    }
    return true;
  }

  // 2b. Horizon 26.3 `trident.rs`: Hold-to-Throw Trident (Loyalty return, or Sneak + Wet = Riptide Dash!)
  if (heldId === ITEM.TRIDENT) {
    if (isInitialPress) {
      tridentDrawing = true;
      tridentCharge = 0.08;
    }
    return true;
  }

  // 2c. Horizon 26.3 `spear.rs`: Hold-to-Couch Spear (Kinetic charge impalement at sprint/mount speed!)
  if (heldId === ITEM.IRON_SPEAR || heldId === ITEM.DIAMOND_SPEAR) {
    spearCouching = true;
    return true;
  }

  // 2d. Original Minecraft Fishing Rod: Cast 3D Bobber + Curved Line into water & reel in fish/treasure!
  if (heldId === ITEM.FISHING_ROD) {
    if (isInitialPress) {
      if (!fishingState.active) {
        const { dx, dy, dz } = lookDirection();
        const eyeYNow = player.y + player.eyeHeight(input.sneak);
        fishingState.active = true;
        fishingState.x = player.x + dx * 0.55;
        fishingState.y = eyeYNow - 0.08;
        fishingState.z = player.z + dz * 0.55;
        fishingState.vx = dx * 14.5 + player.vx * 0.35;
        fishingState.vy = dy * 14.5 + 3.2;
        fishingState.vz = dz * 14.5 + player.vz * 0.35;
        fishingState.inWater = false;
        fishingState.biteWait = 2.2 + Math.random() * 1.8;
        fishingState.biteWindow = 0;
        fishingState.dim = world.dimension;
        fishingBobberGroup.position.set(fishingState.x, fishingState.y, fishingState.z);
        fishingBobberGroup.visible = true;
        fishingLine.visible = true;
        sound.playBow();
        pushSubtitle('Olta suya savruldu');
        triggerLocalSwing();
      } else {
        if (fishingState.inWater && fishingState.biteWindow > 0) {
          const r = Math.random();
          const caught: ItemStack =
            r < 0.66
              ? { id: ITEM.RAW_COD, count: 1 }
              : r < 0.78
                ? { id: ITEM.GOLDEN_CARROT, count: 2 }
                : r < 0.87
                  ? { id: ITEM.EMERALD, count: 2 }
                  : r < 0.93
                    ? { id: ITEM.DIAMOND, count: 1 }
                    : r < 0.975
                      ? { id: ITEM.GOLDEN_APPLE, count: 1 }
                      : { id: ITEM.TOTEM_OF_UNDYING, count: 1 };
          tensuraVfx.spawnWaterSplash(fishingState.x, fishingState.y + 0.12, fishingState.z);
          giveOrDropItem(caught);
          world.spawnXpOrbs(player.x, player.y + 0.85, player.z, 3);
          sound.playXp(true);
          pushSubtitle(`Balık tutuldu: ${getItemDef(caught.id).name}!`);
          damageHeldTool(1, false);
        } else {
          sound.playClick();
          pushSubtitle('Olta geri çekildi');
        }
        retractFishingBobber();
        triggerLocalSwing();
      }
    }
    return true;
  }

  // 3. Try Mainhand Use/Place first; if Mainhand does nothing, fallback to Offhand (loaded Crossbow, Torch, Food, Blocks!)
  if (tryPlaceOrEatFromHand(stack, false, hit)) return true;
  if (offhandSlot && offhandSlot.id !== ITEM.SHIELD) {
    if (isInitialPress && offhandSlot.id === ITEM.CROSSBOW && offhandSlot.loaded) {
      fireLoadedCrossbow(offhandSlot, true);
      return true;
    }
    if (tryPlaceOrEatFromHand(offhandSlot, true, hit)) return true;
  }
  return false;
}

function releaseDrawnBow() {
  if (!bowDrawing) return;
  const charge = Math.min(1, bowCharge);
  bowDrawing = false;
  bowCharge = 0;
  fpHand.bowPull = 0;
  if (charge < 0.14) return;
  if (activeItemId() !== ITEM.BOW) return;

  if (gameMode === 'creative' || consumeItemFromInventory(ITEM.ARROW, 1)) {
    const { dx, dy, dz } = lookDirection();
    const eyeY = player.y + player.eyeHeight(input.sneak);
    const sx = player.x + dx * 0.5;
    const sy = eyeY - 0.1;
    const sz = player.z + dz * 0.5;
    const speed = 10 + charge * 20;
    const dmg = Math.max(2, Math.round(2 + charge * 8));
    projectiles.shootArrow(sx, sy, sz, dx, dy + 0.03, dz, speed, true, dmg);
    server.broadcastProjectile('arrow', sx, sy, sz, dx, dy + 0.03, dz, speed, world.dimension);
    sound.playBow();
    pushSubtitle('Ok atıldı');
    damageHeldTool(1, false);
    triggerLocalSwing();
  }
}

function releaseDrawnTrident() {
  if (!tridentDrawing) return;
  const charge = Math.min(1, tridentCharge);
  tridentDrawing = false;
  tridentCharge = 0;
  fpHand.tridentAim = 0;
  if (charge < 0.16) return;
  if (activeItemId() !== ITEM.TRIDENT) return;

  const { dx, dy, dz } = lookDirection();
  const isRainingHere =
    world.dimension === 'overworld' && (weatherSys.weather === 'rain' || weatherSys.weather === 'thunder');

  // Horizon 26.3 `trident.rs`: Riptide Dash when sneaking in water or rain!
  if ((player.inWater || isRainingHere) && (input.sneak || player.isCrouching)) {
    const dashSpeed = 16 + charge * 8;
    player.vx = dx * dashSpeed;
    player.vy = Math.max(4.5, dy * dashSpeed + 3.5);
    player.vz = dz * dashSpeed;
    player.onGround = false;
    player.resetFallDistance();
    hurtImmunity = Math.max(hurtImmunity, 0.55);
    sound.playRiptide();
    pushSubtitle('Girdap Atılımı! (Riptide)');
    damageHeldTool(1, false);
    triggerLocalSwing();
    return;
  }

  // Loyalty Trident Throw (`onTridentReturn` returns exact stack in Survival; Creative keeps hotbar item without duping!)
  const eyeY = player.y + player.eyeHeight(input.sneak);
  const sx = player.x + dx * 0.5;
  const sy = eyeY - 0.08;
  const sz = player.z + dz * 0.5;
  const speed = 15 + charge * 15;
  const curTrident = hotbar[selectedSlot];
  const enchBonus = (curTrident?.ench || 0) * 1.5;
  const dmg = Math.round(9 + enchBonus);
  let returnStack: ItemStack | null = null;

  if (gameMode === 'survival' && curTrident) {
    const maxDur = getItemDef(ITEM.TRIDENT).maxDurability || 250;
    const nextDmg = (curTrident.damage || 0) + 1;
    if (nextDmg >= maxDur) {
      sound.playBreak('metal');
    } else {
      returnStack = { id: ITEM.TRIDENT, count: 1, damage: nextDmg, ench: curTrident.ench };
    }
    curTrident.count -= 1;
    if (curTrident.count <= 0) hotbar[selectedSlot] = null;
    renderHotbar();
  }

  projectiles.throwTrident(sx, sy, sz, dx, dy + 0.02, dz, speed, true, returnStack !== null, dmg, returnStack);
  server.broadcastProjectile('trident', sx, sy, sz, dx, dy + 0.02, dz, speed, world.dimension);
  sound.playTridentThrow();
  pushSubtitle('Üçlü Mızrak fırlatıldı!');
  triggerLocalSwing();
}

function canonicalPickBlockId(blockId: number): number {
  if (blockId === BLOCK.OAK_DOOR_OPEN) return BLOCK.OAK_DOOR_CLOSED;
  if (blockId === BLOCK.OAK_TRAPDOOR_OPEN) return BLOCK.OAK_TRAPDOOR_CLOSED;
  if (blockId === BLOCK.CAMPFIRE_UNLIT) return BLOCK.CAMPFIRE;
  if (blockId === BLOCK.CAULDRON_WATER || blockId === BLOCK.CAULDRON_LAVA) return BLOCK.CAULDRON_EMPTY;
  if (blockId >= BLOCK.RESPAWN_ANCHOR_1 && blockId <= BLOCK.RESPAWN_ANCHOR_4) return BLOCK.RESPAWN_ANCHOR_0;
  if (blockId === BLOCK.POWDER_SNOW) return ITEM.BUCKET_POWDER_SNOW;
  if (blockId === BLOCK.SWEET_BERRY_BUSH) return ITEM.SWEET_BERRIES;
  if (blockId === BLOCK.OAK_STAIRS_S || blockId === BLOCK.OAK_STAIRS_E || blockId === BLOCK.OAK_STAIRS_W) return BLOCK.OAK_STAIRS_N;
  if (blockId === BLOCK.COBBLESTONE_STAIRS_S || blockId === BLOCK.COBBLESTONE_STAIRS_E || blockId === BLOCK.COBBLESTONE_STAIRS_W) return BLOCK.COBBLESTONE_STAIRS_N;
  if (blockId === BLOCK.LEVER_ON) return BLOCK.LEVER_OFF;
  if (blockId === BLOCK.REDSTONE_DUST_ON) return BLOCK.REDSTONE_DUST_OFF;
  if (blockId === BLOCK.REDSTONE_LAMP_ON) return BLOCK.REDSTONE_LAMP_OFF;
  if (blockId === BLOCK.COPPER_BULB_ON) return BLOCK.COPPER_BULB_OFF;
  if (blockId === BLOCK.POTTED_POPPY) return BLOCK.POPPY;
  if (blockId === BLOCK.POTTED_DANDELION) return BLOCK.DANDELION;
  if (blockId === BLOCK.POTTED_CACTUS) return BLOCK.CACTUS;
  if (blockId === BLOCK.POTTED_CHERRY) return BLOCK.CHERRY_PETALS;
  if (blockId === BLOCK.FARMLAND || blockId === BLOCK.DIRT_PATH) return BLOCK.DIRT;
  return blockId;
}

function triggerPrimaryAttackOrStartMining() {
  const hit = currentRaycastHit(false);
  const readyRatio = Math.max(0.25, 1 - attackCooldown);
  const eyeY = player.y + player.eyeHeight(player.isCrouching || input.sneak);
  const { dx, dy, dz } = lookDirection();
  const heldIdForReach = activeItemId();
  const isHoldingSpear = heldIdForReach === ITEM.IRON_SPEAR || heldIdForReach === ITEM.DIAMOND_SPEAR;
  // Clamp melee reach (#15412: 3.2m survival melee, 4.35m with 26.3 Spear `spear.rs`, never through solid walls!)
  const meleeReach = gameMode === 'creative' ? 4.4 : isHoldingSpear ? 4.35 : 3.2;
  const wallClampedReach = hit ? Math.min(meleeReach, hit.dist + 0.08) : meleeReach;

  // #15763: Hit incoming Ghast/Blaze Fireballs back at the attacker!
  if (projectiles.tryDeflectFireball(player.x, eyeY, player.z, dx, dy, dz)) {
    triggerLocalSwing();
    attackCooldown = 1.0;
    sound.playPlace('metal');
    pushSubtitle('Ateş topu geri gönderildi!');
    if (breakTouchId === null) leftMouseHeld = false;
    return;
  }

  // Check Armor Stand Hit First (`armor_stands.rs`: 1st hit wobbles, 2nd hit or Creative breaks & drops items!)
  const standTarget = armorStands.raycastStand(player.x, eyeY, player.z, dx, dy, dz, wallClampedReach, world.dimension);
  if (standTarget) {
    triggerLocalSwing();
    attackCooldown = 1.0;
    armorStands.hitStand(standTarget, gameMode === 'creative', world, sound);
    if (breakTouchId === null) leftMouseHeld = false;
    return;
  }

  // Check Boat Hit First
  const boatTarget = boats.raycastBoat(player.x, eyeY, player.z, dx, dy, dz, wallClampedReach, world.dimension);
  if (boatTarget) {
    triggerLocalSwing();
    attackCooldown = 1.0;
    boats.hitBoat(boatTarget, world, sound, gameMode === 'creative');
    if (breakTouchId === null) leftMouseHeld = false;
    return;
  }

  // Check Melee Combat Hit on Mob or Ender Dragon
  const mobTarget = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, wallClampedReach, world.dimension);
  if (mobTarget) {
    triggerLocalSwing();
    attackCooldown = 1.0;
    const heldStack = hotbar[selectedSlot];
    const heldIdNow = activeItemId();
    const heldDef = getItemDef(heldIdNow);
    const enchBonus = (heldStack?.ench || 0) * 1.5;
    const baseDmg = (heldDef.attackDamage ?? 1.5) + enchBonus + tensura.getMeleeDamageBonus();
    const fallDist = player.currentFallDistance();
    const isMaceSmash =
      heldIdNow === ITEM.MACE &&
      fallDist > 1.5 &&
      !player.onGround &&
      !player.inWater &&
      !player.flying &&
      !mobs.mountedMob;
    let smashBonus = 0;
    if (isMaceSmash) {
      // Exact Horizon 26.3 `mace.rs` tiered smash bonus: 4/block (0..3), 2/block (3..8), 1/block (8+)
      smashBonus =
        Math.min(3, fallDist) * 4 +
        Math.min(5, Math.max(0, fallDist - 3)) * 2 +
        Math.max(0, fallDist - 8);
      player.resetFallDistance();
      player.vy = Math.max(player.vy, 2.6);
    }
    const horizSpdNow = Math.hypot(player.vx, player.vz);
    const spearKineticBonus =
      isHoldingSpear && horizSpdNow > 3.5 ? Math.min(10, (horizSpdNow - 2.5) * 1.15) : 0;
    const mountedCavalryBonus =
      !isHoldingSpear && mobs.mountedMob && horizSpdNow > 4.2 ? 1.5 : 0;
    const isCrit =
      isMaceSmash ||
      spearKineticBonus > 2.0 ||
      (!player.onGround && player.vy < -0.4 && !player.inWater && !mobs.mountedMob);
    const dmg = Math.max(
      1,
      Math.round(
        isMaceSmash
          ? baseDmg + smashBonus
          : (baseDmg + spearKineticBonus + mountedCavalryBonus) * (0.3 + 0.7 * readyRatio) * (isCrit ? 1.5 : 1.0)
      )
    );
    const hLen = Math.hypot(dx, dz) || 1;
    const impactX = mobTarget === 'dragon' ? mobs.dragon.x : mobTarget.x;
    const impactY = mobTarget === 'dragon' ? mobs.dragon.y : mobTarget.y;
    const impactZ = mobTarget === 'dragon' ? mobs.dragon.z : mobTarget.z;
    mobs.strikeTarget(mobTarget, dmg, dx / hLen, dz / hLen, isCrit, world, sound);
    if (isCrit) {
      tensuraVfx.spawnCritSparks(impactX, impactY + 0.9, impactZ);
    }
    if (isMaceSmash) {
      mobs.maceSmashWave(impactX, impactY, impactZ, world.dimension, mobTarget, world, sound);
      pushSubtitle(`Gürz Ezici Darbe! (+${Math.round(smashBonus)} Hasar)`);
    } else if (spearKineticBonus > 2.0) {
      pushSubtitle(`Mızrak Hücumu! (+${Math.round(spearKineticBonus)} Hız Hasarı)`);
    } else if (heldDef.toolClass === 'sword' && readyRatio > 0.84) {
      tensuraVfx.spawnSwordSweep(player.x, player.y + 1.0, player.z, player.yaw);
      mobs.sweepStrike(mobTarget, dmg, dx / hLen, dz / hLen, world, sound);
    }
    if (heldDef.toolClass === 'sword' || heldIdNow === ITEM.TRIDENT || heldIdNow === ITEM.MACE || isHoldingSpear) {
      damageHeldTool(1, false);
    } else if (heldDef.toolClass) {
      // Vanilla parity: Pickaxe, Axe, Shovel & Hoe take 2 durability when used as melee weapons!
      damageHeldTool(2, false);
    }
    if (breakTouchId === null) leftMouseHeld = false;
    else leftMouseHeld = true;
    return;
  }

  leftMouseHeld = true;
  triggerLocalSwing();

  if (hit && hit.blockId === BLOCK.END_CRYSTAL_BLOCK) {
    triggerCrystalExplosion(hit.bx, hit.by, hit.bz);
    leftMouseHeld = false;
  } else if (hit && gameMode === 'creative') {
    // Vanilla parity: Creative mode Swords NEVER accidentally break blocks!
    if (getItemDef(activeItemId()).toolClass !== 'sword') {
      breakBlockAt(hit.bx, hit.by, hit.bz, hit.blockId);
      postBreakDelay = 0.22;
    }
  } else if (hit && gameMode === 'survival') {
    // Frame-0 Survival Mining & Instant-Break (0ms lag, zero fake air-hit delay!)
    const breakSec = computeBreakDuration(
      hit.blockId,
      activeItemId(),
      player.onGround,
      player.headUnderwater,
      hotbar[selectedSlot]?.ench || 0
    );
    if (breakSec <= 0.02) {
      world.spawnMiningChips(hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz, hit.blockId, 4);
      breakBlockAt(hit.bx, hit.by, hit.bz, hit.blockId);
      miningProgress = 0;
      miningTargetKey = '';
      postBreakDelay = 0;
    } else if (Number.isFinite(breakSec)) {
      miningTargetKey = `${hit.bx},${hit.by},${hit.bz}:${selectedSlot}:${activeItemId()}`;
      miningProgress = 0.006;
      postBreakDelay = 0;
      swingLoopClock = 0;
      world.updateBreakCrack(hit.bx, hit.by, hit.bz, miningProgress);
      world.spawnMiningChips(hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz, hit.blockId, 3);
      sound.playHitBlock(getBlock(hit.blockId).material);
      mineBroadcastActive = true;
      server.broadcastMine(hit.bx, hit.by, hit.bz, 0, hit.blockId, hit.nx, hit.ny, hit.nz, world.dimension);
    }
  }
}

function stopPrimaryMining() {
  leftMouseHeld = false;
  miningProgress = 0;
  world.updateBreakCrack(0, 0, 0, 0);
  server.broadcastMine(0, 0, 0, -1, 0, 0, 1, 0, world.dimension);
}

window.addEventListener('mousedown', (e) => {
  if (uiMode !== 'playing') return;
  if (performance.now() - lastTouchTimestamp < 650) return;
  if (e.target instanceof Element && e.target.closest('button, input, textarea, select, .modal-card')) return;
  if (document.pointerLockElement !== gameCanvas) {
    engageImmersiveGameLock(true);
    return;
  }

  if (e.button === 0) {
    triggerPrimaryAttackOrStartMining();
  }

  // Middle-Click: Pick Block
  if (e.button === 1) {
    const hit = currentRaycastHit(false);
    if (hit) {
      e.preventDefault();
      const pickId = canonicalPickBlockId(hit.blockId);
      const existingIdx = hotbar.findIndex((s) => s && s.id === pickId);
      if (existingIdx !== -1) {
        selectHotbarSlot(existingIdx);
      } else if (gameMode === 'creative') {
        hotbar[selectedSlot] = { id: pickId, count: 64 };
        renderHotbar();
      }
    }
  }

  if (e.button === 2) {
    const nowRmb = performance.now();
    if (nowRmb - lastRightMouseDownMs < 45) return;
    lastRightMouseDownMs = nowRmb;
    rightMouseHeld = true;
    rightPlaceCooldown = 0.20;
    handleRightClickUseOrPlace(true);
  }
});

window.addEventListener('mouseup', (e) => {
  if (performance.now() - lastTouchTimestamp < 650) return;
  if (e.button === 0) stopPrimaryMining();
  if (e.button === 2) {
    rightMouseHeld = false;
    spyglassZooming = false;
    spearCouching = false;
    crossbowCharging = false;
    crossbowCharge = 0;
    eatingActive = false;
    eatingTimer = 0;
    if (bowDrawing) releaseDrawnBow();
    if (tridentDrawing) releaseDrawnTrident();
  }
});

// ============================================================================
// MOBILE & TABLET MULTI-TOUCH SUBSYSTEM (Joystick, Smooth Look, Action Cluster)
// ============================================================================
// 1. Prevent iOS Safari pinch-zoom & gameplay page bounce/pull-to-refresh
['gesturestart', 'gesturechange', 'gestureend'].forEach((evtName) => {
  window.addEventListener(evtName, (e) => e.preventDefault(), { passive: false });
});

document.addEventListener(
  'touchstart',
  (e) => {
    lastTouchTimestamp = performance.now();
    sound.unlock();
    if (!isTouchDevice) {
      isTouchDevice = true;
      syncMobileHudVisibility();
      syncViewportSize();
    }
    // Hybrid touchscreen laptop: touching screen while PointerLock is active seamlessly switches to Touch HUD without opening Pause!
    if (document.pointerLockElement === gameCanvas) {
      wasPointerLocked = false;
      document.exitPointerLock?.();
      syncMobileHudVisibility();
    }
  },
  { passive: true }
);

document.addEventListener(
  'touchmove',
  (e) => {
    const targetEl = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement ?? null;
    const allowNativeTouch = !!targetEl?.closest?.(
      '.glass-shell, .inventory-window, .settings-window, .tensura-window, .pause-menu-box, #tab-list, .death-window, input'
    );
    if (uiMode === 'playing' || e.touches.length > 1 || !allowNativeTouch) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// 2. Virtual Analog Joystick (Floating Thumb Origin + Outer-Ring Auto-Sprint Lock!)
function updateJoystickFromPoint(clientX: number, clientY: number) {
  const maxR = Math.max(36, mobileJoystickBase.clientWidth * 0.38);
  const dx = clientX - joyCenterX;
  const dy = clientY - joyCenterY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, maxR);
  const angle = Math.atan2(dy, dx);
  const kx = dist > 0.001 ? Math.cos(angle) * clamped : 0;
  const ky = dist > 0.001 ? Math.sin(angle) * clamped : 0;

  mobileJoystickKnob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;

  let nx = kx / maxR;
  let ny = ky / maxR;
  const mag = Math.hypot(nx, ny);
  if (mag < 0.11) {
    nx = 0;
    ny = 0;
  }

  // Outer-Ring Auto-Sprint Lock: pushing past 94% forward locks Sprint ON until pulled back!
  if (!mobileSneakLocked && dist > maxR * 0.94 && ny < -0.52) {
    if (!mobileSprintLocked) {
      mobileSprintLocked = true;
      mobileJoystickBase.classList.add('sprint-locked');
      pulseHaptic(10);
    }
  } else if (ny > -0.18 || mobileSneakLocked) {
    if (mobileSprintLocked) {
      mobileSprintLocked = false;
      mobileJoystickBase.classList.remove('sprint-locked');
    }
  }

  input.moveX = nx;
  input.moveZ = ny;
  input.forward = ny < -0.22;
  input.backward = ny > 0.22;
  input.left = nx < -0.22;
  input.right = nx > 0.22;
  input.sprint = (mobileSprintLocked || (mag > 0.82 && ny < -0.35)) && !mobileSneakLocked;
}

mobileJoystickZone.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    joyTouchId = t.identifier;
    // Floating Joystick Origin: shift joystick base slightly toward thumb landing point!
    const zRect = mobileJoystickZone.getBoundingClientRect();
    const zoneCx = zRect.left + zRect.width * 0.5;
    const zoneCy = zRect.top + zRect.height * 0.5;
    const shiftX = Math.max(-20, Math.min(20, t.clientX - zoneCx));
    const shiftY = Math.max(-20, Math.min(20, t.clientY - zoneCy));
    mobileJoystickBase.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0px)`;
    joyCenterX = zoneCx + shiftX;
    joyCenterY = zoneCy + shiftY;
    updateJoystickFromPoint(t.clientX, t.clientY);
  },
  { passive: false }
);

window.addEventListener(
  'touchmove',
  (e) => {
    if (joyTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        e.preventDefault();
        updateJoystickFromPoint(t.clientX, t.clientY);
        break;
      }
    }
  },
  { passive: false }
);

function handleJoystickRelease(e: TouchEvent) {
  if (joyTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joyTouchId) {
      joyTouchId = null;
      mobileSprintLocked = false;
      mobileJoystickBase.classList.remove('sprint-locked');
      mobileJoystickBase.style.transform = 'translate3d(0px, 0px, 0px)';
      mobileJoystickKnob.style.transform = 'translate3d(0px, 0px, 0px)';
      input.moveX = 0;
      input.moveZ = 0;
      input.forward = false;
      input.backward = false;
      input.left = false;
      input.right = false;
      input.sprint = false;
      break;
    }
  }
}
window.addEventListener('touchend', handleJoystickRelease, { passive: true });
window.addEventListener('touchcancel', handleJoystickRelease, { passive: true });

// 3. Right-Half Smooth Touch Camera Look (PointerLockControls Alternative, supports Left-Handed mode!)
function queueTouchLookDelta(dx: number, dy: number) {
  const sens = 0.0062 * mouseSensitivity * (spyglassZooming ? 0.28 : 1.0);
  pendingLookYaw -= dx * sens;
  pendingLookPitch -= dy * sens;
}

function startTouchLook(t: Touch) {
  if (lookTouchId !== null) return;
  lookTouchId = t.identifier;
  lookLastX = t.clientX;
  lookLastY = t.clientY;
}

mobileLookZone.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    const t = e.changedTouches[0];
    if (t) startTouchLook(t);
  },
  { passive: false }
);

gameCanvas.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    lastTouchTimestamp = performance.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const inLookHalf = mobLeftHanded ? t.clientX <= window.innerWidth * 0.58 : t.clientX >= window.innerWidth * 0.42;
      if (inLookHalf) {
        startTouchLook(t);
        break;
      }
    }
  },
  { passive: false }
);

window.addEventListener(
  'touchmove',
  (e) => {
    if (uiMode !== 'playing') return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId) {
        e.preventDefault();
        queueTouchLookDelta(t.clientX - lookLastX, t.clientY - lookLastY);
        lookLastX = t.clientX;
        lookLastY = t.clientY;
      } else if (t.identifier === breakTouchId) {
        // Aim while holding KIR (Break/Mine)!
        e.preventDefault();
        if (lookTouchId === null) queueTouchLookDelta(t.clientX - breakLastX, t.clientY - breakLastY);
        breakLastX = t.clientX;
        breakLastY = t.clientY;
      } else if (t.identifier === placeTouchId) {
        // Aim while holding KOY (Bow draw / continuous block placement)!
        e.preventDefault();
        if (lookTouchId === null) queueTouchLookDelta(t.clientX - placeLastX, t.clientY - placeLastY);
        placeLastX = t.clientX;
        placeLastY = t.clientY;
      } else if (t.identifier === jumpTouchId) {
        // Aim while holding ZIPLA (Mobile sprint-jump & parkour camera tracking)!
        e.preventDefault();
        if (lookTouchId === null) queueTouchLookDelta(t.clientX - jumpLastX, t.clientY - jumpLastY);
        jumpLastX = t.clientX;
        jumpLastY = t.clientY;
      }
    }
  },
  { passive: false }
);

function releaseLookTouch(e: TouchEvent) {
  if (lookTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === lookTouchId) {
      lookTouchId = null;
      break;
    }
  }
}
window.addEventListener('touchend', releaseLookTouch, { passive: true });
window.addEventListener('touchcancel', releaseLookTouch, { passive: true });

// 4. Action Buttons (Bottom-Right: KIR, KOY, ZIPLA, EĞİL)
mobBtnBreak.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    if (breakTouchId !== null) return;
    const t = e.changedTouches[0];
    if (t) {
      breakTouchId = t.identifier;
      breakLastX = t.clientX;
      breakLastY = t.clientY;
    }
    mobBtnBreak.classList.add('pressed');
    triggerPrimaryAttackOrStartMining();
  },
  { passive: false }
);

function releaseBreakTouch(e: TouchEvent) {
  if (breakTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === breakTouchId) {
      breakTouchId = null;
      mobBtnBreak.classList.remove('pressed');
      stopPrimaryMining();
      break;
    }
  }
}
window.addEventListener('touchend', releaseBreakTouch, { passive: true });
window.addEventListener('touchcancel', releaseBreakTouch, { passive: true });

mobBtnPlace.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    if (placeTouchId !== null) return;
    const t = e.changedTouches[0];
    if (t) {
      placeTouchId = t.identifier;
      placeLastX = t.clientX;
      placeLastY = t.clientY;
    }
    mobBtnPlace.classList.add('pressed');
    rightMouseHeld = true;
    rightPlaceCooldown = 0.20;
    handleRightClickUseOrPlace(true);
  },
  { passive: false }
);

function releasePlaceTouch(e: TouchEvent) {
  if (placeTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === placeTouchId) {
      placeTouchId = null;
      mobBtnPlace.classList.remove('pressed');
      rightMouseHeld = false;
      spyglassZooming = false;
      spearCouching = false;
      crossbowCharging = false;
      crossbowCharge = 0;
      eatingActive = false;
      eatingTimer = 0;
      if (bowDrawing) releaseDrawnBow();
      if (tridentDrawing) releaseDrawnTrident();
      break;
    }
  }
}
window.addEventListener('touchend', releasePlaceTouch, { passive: true });
window.addEventListener('touchcancel', releasePlaceTouch, { passive: true });

mobBtnJump.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    if (jumpTouchId !== null) return;
    const t = e.changedTouches[0];
    if (t) {
      jumpTouchId = t.identifier;
      jumpLastX = t.clientX;
      jumpLastY = t.clientY;
    }
    if (gameMode === 'creative' || tensura.canDemonLordFly()) {
      const now = performance.now();
      if (now - lastSpacePress < 300) {
        player.flying = !player.flying;
        player.vy = 0;
        if (player.flying) {
          mobileSneakLocked = false;
          input.sneak = false;
          mobBtnCrouch.classList.remove('active', 'pressed');
          if (gameMode === 'survival') pushSubtitle('İblis Lordu Kanatları açıldı!');
        }
      }
      lastSpacePress = now;
    }
    input.jump = true;
    mobBtnJump.classList.add('pressed');
  },
  { passive: false }
);

function releaseJumpTouch(e: TouchEvent) {
  if (jumpTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === jumpTouchId) {
      jumpTouchId = null;
      input.jump = false;
      mobBtnJump.classList.remove('pressed');
      break;
    }
  }
}
window.addEventListener('touchend', releaseJumpTouch, { passive: true });
window.addEventListener('touchcancel', releaseJumpTouch, { passive: true });

mobBtnCrouch.addEventListener(
  'touchstart',
  (e) => {
    if (uiMode !== 'playing') return;
    e.preventDefault();
    e.stopPropagation();
    lastTouchTimestamp = performance.now();
    if (crouchTouchId !== null) return;
    const t = e.changedTouches[0];
    if (mobs.mountedMob || boats.mountedBoat) {
      const wasFlyingMount = mobs.mountedMob?.species === 'happy_ghast';
      mobs.mountedMob = null;
      boats.mountedBoat = null;
      player.vy = 3.4;
      if (wasFlyingMount) player.setWindBurstGrace(1.0);
      mobileSneakLocked = false;
      input.sneak = false;
      sound.playStep('wood');
      pulseHaptic(8);
    } else if (player.flying) {
      // Momentary hold-to-descend while Creative Flying on mobile/tablet!
      if (t) crouchTouchId = t.identifier;
      mobileSneakLocked = false;
      input.sneak = true;
      mobBtnCrouch.classList.add('pressed');
    } else {
      mobileSneakLocked = !mobileSneakLocked;
      input.sneak = mobileSneakLocked;
      if (mobileSneakLocked) input.sprint = false;
      sound.playClick();
    }
    mobBtnCrouch.classList.toggle('active', mobileSneakLocked);
  },
  { passive: false }
);

function releaseCrouchTouch(e: TouchEvent) {
  if (crouchTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === crouchTouchId) {
      crouchTouchId = null;
      if (!mobileSneakLocked) input.sneak = false;
      mobBtnCrouch.classList.remove('pressed');
      break;
    }
  }
}
window.addEventListener('touchend', releaseCrouchTouch, { passive: true });
window.addEventListener('touchcancel', releaseCrouchTouch, { passive: true });

// 5. Top-Right Mobile Utility Bar (Çanta, At, Sohbet, Mod, Kamera, Tam Ekran, Menü)
function bindMobileUtilButton(btn: HTMLButtonElement, fn: () => void) {
  btn.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      lastTouchTimestamp = performance.now();
      sound.playClick();
      fn();
    },
    { passive: false }
  );
  btn.addEventListener('click', (e) => {
    if (performance.now() - lastTouchTimestamp < 650) return;
    e.stopPropagation();
    sound.playClick();
    fn();
  });
}

bindMobileUtilButton(mobBtnRpg, () => openTensuraModal());
bindMobileUtilButton(mobBtnSkill, () => {
  castActiveTensuraSkill();
  pulseHaptic(10);
});
bindMobileUtilButton(mobBtnInv, () => openInventoryModal('none'));
bindMobileUtilButton(mobBtnSwap, () => {
  swapMainhandAndOffhand();
  pulseHaptic(8);
});
bindMobileUtilButton(mobBtnDrop, () => dropSelectedItem(false));
bindMobileUtilButton(mobBtnChat, () => openChat(''));
bindMobileUtilButton(mobBtnMode, () => {
  toggleGameMode();
  pushChat({
    sender: 'Horizon',
    color: '#a9a9ff',
    text: `Oyun modu: ${gameMode === 'creative' ? 'Yaratıcı (Uçuş)' : 'Hayatta Kalma'}`,
    system: true
  });
});
bindMobileUtilButton(mobBtnCam, () => {
  cameraPerson = ((cameraPerson + 1) % 3) as 0 | 1 | 2;
  localAvatar.root.visible = cameraPerson !== 0;
});
bindMobileUtilButton(mobBtnFs, () => toggleFullscreenSafe());
bindMobileUtilButton(mobBtnPause, () => openPauseModal());

// P0 #9 Fix: Cascade-shatter connected Nether Portal cells when an Obsidian frame or Portal block is broken!
function cascadeBreakConnectedPortal(sx: number, sy: number, sz: number) {
  const queue: Array<[number, number, number]> = [];
  const dirs: Array<[number, number, number]> = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
  ];
  for (const [ox, oy, oz] of dirs) {
    if (world.getBlock(sx + ox, sy + oy, sz + oz) === BLOCK.NETHER_PORTAL) {
      queue.push([sx + ox, sy + oy, sz + oz]);
    }
  }
  let count = 0;
  while (queue.length > 0 && count < 36) {
    const [px, py, pz] = queue.shift()!;
    if (world.getBlock(px, py, pz) !== BLOCK.NETHER_PORTAL) continue;
    world.setBlock(px, py, pz, BLOCK.AIR, false);
    server.broadcastBlockEdit(px, py, pz, BLOCK.AIR, world.dimension);
    count++;
    for (const [ox, oy, oz] of dirs) {
      if (world.getBlock(px + ox, py + oy, pz + oz) === BLOCK.NETHER_PORTAL) {
        queue.push([px + ox, py + oy, pz + oz]);
      }
    }
  }
  if (count > 0) sound.playBreak('glass');
}

function breakBlockAt(bx: number, by: number, bz: number, blockId: number) {
  const def = getBlock(blockId);
  const canBreakInCreative = gameMode === 'creative' && blockId !== BLOCK.BEDROCK && blockId !== BLOCK.END_PORTAL;
  if (!Number.isFinite(def.hardness) && !canBreakInCreative) return;

  if (world.setBlock(bx, by, bz, BLOCK.AIR, true)) {
    if (blockId === BLOCK.AMETHYST_BLOCK || blockId === BLOCK.AMETHYST_CLUSTER) {
      sound.playAmethystChime();
    } else {
      sound.playBreak(def.material);
    }
    pushSubtitle('Blok kırıldı', bx + 0.5, bz + 0.5);
    server.broadcastBlockEdit(bx, by, bz, BLOCK.AIR, world.dimension);
    server.broadcastMine(0, 0, 0, -1, 0, 0, 1, 0, world.dimension);

    // 2-high Door partner cleanup (at most 1 partner half, without duplicating survival drop)
    if (blockId === BLOCK.OAK_DOOR_CLOSED || blockId === BLOCK.OAK_DOOR_OPEN) {
      for (const dyOff of [-1, 1]) {
        const adjId = world.getBlock(bx, by + dyOff, bz);
        if (adjId === BLOCK.OAK_DOOR_CLOSED || adjId === BLOCK.OAK_DOOR_OPEN) {
          world.setBlock(bx, by + dyOff, bz, BLOCK.AIR, false);
          server.broadcastBlockEdit(bx, by + dyOff, bz, BLOCK.AIR, world.dimension);
          break;
        }
      }
    }

    if (blockId === BLOCK.OBSIDIAN || blockId === BLOCK.NETHER_PORTAL) {
      cascadeBreakConnectedPortal(bx, by, bz);
    }

    if (
      blockId === BLOCK.LEVER_ON ||
      blockId === BLOCK.TARGET_BLOCK ||
      blockId === BLOCK.REDSTONE_DUST_ON ||
      blockId === BLOCK.REDSTONE_DUST_OFF
    ) {
      propagateRedstoneAround(bx, by, bz);
    }

    if (gameMode === 'survival') {
      const heldNow = activeItemId();
      if (def.hardness > 0) {
        damageHeldTool(1, false);
      }
      const drop = resolveBlockDrop(blockId, heldNow);
      if (drop) {
        world.spawnItemDrop(bx + 0.5, by + 0.35, bz + 0.5, drop);
      }
      let oreEp = 0;
      if (blockId === BLOCK.COAL_ORE) oreEp = 25;
      else if (blockId === BLOCK.REDSTONE_ORE || blockId === BLOCK.QUARTZ_ORE) oreEp = 45;
      else if (blockId === BLOCK.AMETHYST_CLUSTER) oreEp = 60;
      else if (blockId === BLOCK.DIAMOND_ORE || blockId === BLOCK.DEEPSLATE_DIAMOND_ORE) oreEp = 140;
      else if (blockId === BLOCK.EMERALD_ORE) oreEp = 180;
      if (oreEp > 0) {
        tensura.grantEpAndSoul(oreEp, 0);
        syncTensuraFormAndStats();
      }
      if (
        blockId === BLOCK.COAL_ORE ||
        blockId === BLOCK.DIAMOND_ORE ||
        blockId === BLOCK.DEEPSLATE_DIAMOND_ORE ||
        blockId === BLOCK.EMERALD_ORE ||
        blockId === BLOCK.REDSTONE_ORE ||
        blockId === BLOCK.QUARTZ_ORE
      ) {
        world.spawnXpOrbs(bx + 0.5, by + 0.4, bz + 0.5, 4);
      }
    }
  }
}

function defaultAmbientTint(): string {
  if (player.inLava) return 'lava';
  if (player.headUnderwater) return 'underwater';
  if (player.freezeProgress > 0.2) return 'freeze';
  if (spyglassZooming) return 'spyglass';
  return '';
}

let tintTimeout = 0;
function flashScreen(cls: string, durationMs = 260) {
  screenTint.className = cls;
  clearTimeout(tintTimeout);
  tintTimeout = window.setTimeout(() => {
    screenTint.className = defaultAmbientTint();
  }, durationMs);
}

let lastRenderW = 0;
let lastRenderH = 0;

function syncViewportSize() {
  const vv = window.visualViewport;
  const vvW = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
  const vvH = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  const topOff = Math.max(0, Math.round(vv?.offsetTop || 0));
  document.documentElement.style.setProperty('--vv-top', `${topOff}px`);
  document.documentElement.style.setProperty('--vv-h', `${vvH}px`);

  // P1 #6: Avoid WebGL backbuffer reallocations when soft keyboard opens during Chat/Input focus!
  const activeTag = document.activeElement?.tagName;
  const softKeyboardLikely =
    isTouchDevice &&
    (uiMode === 'chat' || activeTag === 'INPUT') &&
    window.innerHeight - vvH > 110;
  const renderW = softKeyboardLikely ? Math.max(1, Math.round(window.innerWidth)) : vvW;
  const renderH = softKeyboardLikely ? Math.max(1, Math.round(window.innerHeight)) : vvH;
  if (renderW !== lastRenderW || renderH !== lastRenderH) {
    lastRenderW = renderW;
    lastRenderH = renderH;
    camera.aspect = renderW / renderH;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(computeTargetPixelRatio());
    renderer.setSize(renderW, renderH);
  }
}

window.addEventListener('resize', syncViewportSize);
window.addEventListener('orientationchange', () => {
  syncViewportSize();
  window.setTimeout(syncViewportSize, 180);
});
window.visualViewport?.addEventListener('resize', syncViewportSize);
window.visualViewport?.addEventListener('scroll', syncViewportSize);
syncMobileHudVisibility();
syncViewportSize();

// ============================================================================
// SKY, CELESTIALS, DYNAMIC SHADER DAYLIGHT & DIMENSION ATMOSPHERE
// ============================================================================
const cDay = new THREE.Color(0x78a7ff);
const cSunset = new THREE.Color(0xe07068);
const cNight = new THREE.Color(0x0c1026);
const cNether = new THREE.Color(0x360b0b);
const cEnd = new THREE.Color(0x0c0714);
const cStorm = new THREE.Color(0x3b485e);
const cFlash = new THREE.Color(0xeef6ff);
const cWork = new THREE.Color();

function updateAtmosphere(dt: number) {
  const rdBlocks = world.renderDistance * 16;

  if (world.dimension === 'nether') {
    skyColor.copy(cNether);
    fog.color.copy(cNether);
    fog.near = 18;
    fog.far = Math.min(76, rdBlocks * 0.85);
    celestialGroup.visible = false;
    sunLight.intensity = 0.65;
    hemiLight.intensity = 0.72;
    world.setDaylight(0.46, 1.06, 0.76, 0.70);
    return;
  }

  if (world.dimension === 'end') {
    skyColor.copy(cEnd);
    fog.color.copy(cEnd);
    fog.near = 36;
    fog.far = rdBlocks * 1.1;
    celestialGroup.visible = false;
    sunLight.intensity = 0.78;
    hemiLight.intensity = 0.65;
    world.setDaylight(0.60, 0.90, 0.84, 1.06);
    return;
  }

  celestialGroup.visible = true;
  timeOfDay = (timeOfDay + dt / 900) % 1;
  const angle = timeOfDay * Math.PI * 2;
  const sunElev = Math.sin(angle);

  let tintR = 1.0, tintG = 1.0, tintB = 1.0;
  if (sunElev > 0.16) {
    cWork.copy(cDay);
  } else if (sunElev > -0.18) {
    const t = (sunElev + 0.18) / 0.34;
    const sunsetBell = Math.sin(t * Math.PI);
    cWork.copy(cNight).lerp(cSunset, sunsetBell).lerp(cDay, Math.max(0, (t - 0.45) * 1.8));
    tintR = 0.68 + 0.32 * t + sunsetBell * 0.14;
    tintG = 0.76 + 0.24 * t - sunsetBell * 0.04;
    tintB = 0.96 + 0.04 * t - sunsetBell * 0.16;
  } else {
    cWork.copy(cNight);
    tintR = 0.66;
    tintG = 0.74;
    tintB = 0.96;
  }

  const stormFactor = weatherSys.weather === 'thunder' ? 0.45 : weatherSys.weather !== 'clear' ? 0.28 : 0;
  if (stormFactor > 0) {
    cWork.lerp(cStorm, stormFactor);
  }
  if (weatherSys.lightningFlash > 0) {
    cWork.lerp(cFlash, weatherSys.lightningFlash * 0.85);
  }

  skyColor.copy(cWork);
  skyDomeMat.color.copy(cWork);
  skyDomeMesh.visible = true;
  fog.color.copy(cWork);
  fog.near = rdBlocks * (stormFactor > 0 ? 0.38 : 0.58);
  fog.far = rdBlocks * (stormFactor > 0 ? 0.88 : 1.08);

  const orbitR = 175;
  const sx = Math.cos(angle) * orbitR;
  const sy = Math.sin(angle) * orbitR;
  celestialGroup.position.set(player.x, player.y, player.z);
  sunMesh.position.set(sx, sy, -45);
  moonMesh.position.set(-sx, -sy, 45);

  const daylight = Math.max(0.22, Math.min(1.0, sunElev * 1.18 + 0.40)) * (1 - stormFactor * 0.42);
  const flashBoost = weatherSys.lightningFlash * 0.75;
  world.setDaylight(Math.min(1.05, daylight + flashBoost), tintR, tintG, tintB, sx, Math.max(18, sy), -45);

  sunLight.intensity = daylight * 0.98 + weatherSys.lightningFlash * 1.2;
  sunLight.position.set(player.x + sx * 0.5, player.y + Math.max(28, sy), player.z - 30);
  hemiLight.intensity = 0.42 + daylight * 0.50 + weatherSys.lightningFlash * 0.8;
}

// ============================================================================
// DYNAMIC MOBILE CONTEXTUAL ACTION PROMPT (Zero-Alloc 10Hz)
// ============================================================================
let lastMobPlaceTitle = 'KOY';
let lastMobPlaceSub = 'Kullan';
let lastMobCrouchTitle = 'EĞİL';

function updateMobileContextPrompt(
  hit: ReturnType<typeof currentRaycastHit>,
  eyeY: number,
  dx: number,
  dy: number,
  dz: number
) {
  const wantCrouch = mobs.mountedMob || boats.mountedBoat ? 'İN' : 'EĞİL';
  if (wantCrouch !== lastMobCrouchTitle) {
    lastMobCrouchTitle = wantCrouch;
    if (mobCrouchTitle) mobCrouchTitle.textContent = wantCrouch;
  }

  let title = 'KOY';
  let sub = 'Kullan';
  const maxD = hit ? Math.min(4.2, hit.dist + 0.1) : 4.2;
  const heldId = activeItemId();
  const heldDef = getItemDef(heldId);

  const standHit = heldId !== ITEM.ARMOR_STAND
    ? armorStands.raycastStand(player.x, eyeY, player.z, dx, dy, dz, maxD, world.dimension)
    : null;
  if (standHit) {
    title = 'ASKI';
    sub = heldId > 0 ? 'Kuşan' : 'Al';
  } else if (boats.raycastBoat(player.x, eyeY, player.z, dx, dy, dz, maxD, world.dimension)) {
    title = 'BİN';
    sub = 'Tekne';
  } else {
    const mobHit = mobs.raycastMob(player.x, eyeY, player.z, dx, dy, dz, maxD, world.dimension);
    if (mobHit && mobHit !== 'dragon') {
      if (mobHit.species === 'villager' || mobHit.species === 'wandering_trader') {
        title = 'TAKAS';
        sub = 'Köylü';
      } else if (mobHit.rideable) {
        title = 'BİN';
        sub = 'Binek';
      } else if ((mobHit.species === 'wolf' && heldId === ITEM.BONE) || (mobHit.species === 'cat' && heldDef.foodRestore)) {
        title = 'BESLE';
        sub = 'Evcil';
      } else if (mobHit.species === 'piglin' && heldId === ITEM.GOLD_INGOT) {
        title = 'TAKAS';
        sub = 'Piglin';
      } else if (mobHit.species === 'sheep' && heldId === ITEM.SHEARS) {
        title = 'KIRP';
        sub = 'Yün';
      }
    } else if (hit && !input.sneak && getBlock(hit.blockId).interactive) {
      const inter = getBlock(hit.blockId).interactive;
      if (inter === 'chest' || inter === 'barrel' || inter === 'door' || inter === 'trapdoor') {
        title = 'AÇ';
        sub = getBlock(hit.blockId).name.slice(0, 7);
      } else {
        title = 'KULLAN';
        sub = getBlock(hit.blockId).name.slice(0, 7);
      }
    } else if (heldId === ITEM.BOW) {
      title = 'GER';
      sub = 'Ok At';
    } else if (heldId === ITEM.CROSSBOW) {
      title = hotbar[selectedSlot]?.loaded ? 'ATEŞLE' : 'KUR';
      sub = 'Arbalet';
    } else if (heldId === ITEM.FISHING_ROD) {
      title = fishingState.active ? 'ÇEK' : 'OLTA';
      sub = fishingState.biteWindow > 0 ? 'Balık!' : 'Su';
    } else if (heldId === ITEM.FIREWORK_ROCKET) {
      title = elytraGliding ? 'İTİŞ' : 'FİŞEK';
      sub = elytraGliding ? 'Elitra' : 'Ateşle';
    } else if (heldId === ITEM.BONE_MEAL) {
      title = 'GÜBRE';
      sub = 'Büyüt';
    } else if (heldId === ITEM.TRIDENT) {
      title = 'FIRLAT';
      sub = 'Üçlü';
    } else if (heldId === ITEM.WIND_CHARGE || heldId === ITEM.ENDER_PEARL || heldId === ITEM.SNOWBALL) {
      title = 'FIRLAT';
      sub = heldDef.name.slice(0, 7);
    } else if (heldDef.armorSlot) {
      title = 'KUŞAN';
      sub = 'Zırh';
    } else if (heldDef.foodRestore) {
      title = 'YE';
      sub = `+${heldDef.foodRestore}`;
    } else if (heldId === ITEM.SPYGLASS) {
      title = 'BAK';
      sub = 'Dürbün';
    } else if (heldId === ITEM.SHIELD || (!heldDef.isBlock && offhandSlot?.id === ITEM.SHIELD)) {
      title = 'KORUN';
      sub = 'Kalkan';
    }
  }

  if (title !== lastMobPlaceTitle) {
    lastMobPlaceTitle = title;
    if (mobPlaceTitle) mobPlaceTitle.textContent = title;
  }
  if (sub !== lastMobPlaceSub) {
    lastMobPlaceSub = sub;
    if (mobPlaceSub) mobPlaceSub.textContent = sub;
  }
}

// ============================================================================
// MAIN HORIZON SIMULATION & RENDER LOOP (Zero-Alloc + Adaptive DPR)
// ============================================================================
let prevTime = performance.now();
let fpsFrames = 0;
let fpsClock = 0;
let currentFps = 60;
let dprAdaptClock = 0;
let launcherWarmupRendered = false;
let swingLoopClock = 0;
let hungerClock = 0;
let regenClock = 0;
let drownClock = 0;
let locatorClock = 0;
let f3Clock = 0;
let mobPromptClock = 0;
let mineBroadcastActive = false;
let lastBossShown = false;
let lastBossTitle = '';
let lastBossPct = -1;
let lastAmbientTint = '';

const activeInputBuf: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  moveX: 0,
  moveZ: 0,
  jump: false,
  sneak: false,
  sprint: false
};
const idleInputBuf: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  moveX: 0,
  moveZ: 0,
  jump: false,
  sneak: false,
  sprint: false
};

function stopMineBroadcastIfActive() {
  if (mineBroadcastActive) {
    mineBroadcastActive = false;
    server.broadcastMine(0, 0, 0, -1, 0, 0, 1, 0, world.dimension);
  }
}

let rafScheduled = false;

function scheduleNextFrame() {
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame((ts) => {
      rafScheduled = false;
      animate(ts);
    });
  }
}

function animate(now: number) {
  scheduleNextFrame();
  const rawDt = (now - prevTime) / 1000;
  const dt = Math.min(0.05, Math.max(0.00004, rawDt));
  prevTime = now;

  // Skip heavy 3D world simulation & WebGL scene render while Launcher Sunset Backdrop is covering the screen!
  if (uiMode === 'launcher' || (uiMode === 'settings' && settingsOpenedFromLauncher)) {
    if (!launcherWarmupRendered) {
      launcherWarmupRendered = true;
      updateAtmosphere(0.016);
      renderer.render(scene, camera);
    }
    return;
  }

  if (hurtImmunity > 0) hurtImmunity = Math.max(0, hurtImmunity - dt);
  if (urielShieldTimer > 0) urielShieldTimer = Math.max(0, urielShieldTimer - dt);
  if (voiceBannerTimer > 0) {
    voiceBannerTimer = Math.max(0, voiceBannerTimer - dt);
    if (voiceBannerTimer <= 0) tensuraVoiceBanner?.classList.add('hidden');
  }
  tensura.update(dt, health);
  pruneSubtitles(now);

  // Smooth Touch Camera Interpolation (Zero-jitter Yaw & Pitch on 60Hz/120Hz mobile screens)
  if (Math.abs(pendingLookYaw) > 1e-5 || Math.abs(pendingLookPitch) > 1e-5) {
    const smoothK = Math.min(1, dt * 42);
    const stepYaw = pendingLookYaw * smoothK;
    const stepPitch = pendingLookPitch * smoothK;
    pendingLookYaw -= stepYaw;
    pendingLookPitch -= stepPitch;
    if (uiMode === 'playing') {
      player.yaw += stepYaw;
      const maxPitch = Math.PI / 2 - 0.02;
      player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch + stepPitch));
    }
  }

  fpsFrames++;
  fpsClock += dt;
  if (fpsClock >= 0.4) {
    currentFps = Math.round(fpsFrames / fpsClock);
    fpsFrames = 0;
    fpsClock = 0;
    if (hudFpsVal) hudFpsVal.textContent = `${currentFps} FPS`;
    if (hudPingVal) hudPingVal.textContent = formatPingLabel(server.currentPing);
    refreshTensuraHudPill();
    if (uiMode === 'tensura') {
      const maxMp = tensura.getMaxMagicules();
      tsMpVal.textContent = `${Math.floor(tensura.magicules)} / ${maxMp} Öz`;
      tsMpFill.style.width = `${Math.min(100, Math.round((tensura.magicules / Math.max(1, maxMp)) * 100))}%`;
    }

    // Adaptive Dynamic PixelRatio in 'auto' mode: eliminates GPU fill-rate FPS drops automatically!
    if (perfMode === 'auto' && uiMode === 'playing') {
      dprAdaptClock += 0.5;
      if (currentFps < 46 && dynamicDprScale > 0.66 && dprAdaptClock >= 1.0) {
        dprAdaptClock = 0;
        dynamicDprScale = Math.max(0.65, dynamicDprScale - 0.12);
        renderer.setPixelRatio(computeTargetPixelRatio());
        renderer.setSize(Math.max(1, lastRenderW), Math.max(1, lastRenderH));
      } else if (currentFps >= 58 && dynamicDprScale < 1.0 && dprAdaptClock >= 4.0) {
        dprAdaptClock = 0;
        dynamicDprScale = Math.min(1.0, dynamicDprScale + 0.08);
        renderer.setPixelRatio(computeTargetPixelRatio());
        renderer.setSize(Math.max(1, lastRenderW), Math.max(1, lastRenderH));
      }
    }
  }

  // Update hold-to-draw Bow, Crossbow, Trident, Spear Couch, Spyglass, Hold-to-Eat & Shield Block BEFORE Physics!
  if (spyglassZooming && (!rightMouseHeld || uiMode !== 'playing' || (activeItemId() !== ITEM.SPYGLASS && offhandSlot?.id !== ITEM.SPYGLASS))) {
    spyglassZooming = false;
  }
  if (bowDrawing) {
    if (!rightMouseHeld || uiMode !== 'playing' || activeItemId() !== ITEM.BOW) {
      bowDrawing = false;
      bowCharge = 0;
      fpHand.bowPull = 0;
    } else {
      bowCharge = Math.min(1, bowCharge + dt * 1.15);
      fpHand.bowPull = bowCharge;
    }
    fpHand.crossbowPull = 0;
  } else if (crossbowCharging) {
    fpHand.bowPull = 0;
    const curXbow = hotbar[selectedSlot];
    if (!rightMouseHeld || uiMode !== 'playing' || !curXbow || curXbow.id !== ITEM.CROSSBOW || curXbow.loaded) {
      crossbowCharging = false;
      crossbowCharge = 0;
      fpHand.crossbowPull = 0;
    } else {
      crossbowCharge = Math.min(1, crossbowCharge + dt * 1.35);
      fpHand.crossbowPull = crossbowCharge;
      if (crossbowCharge >= 1) {
        crossbowCharging = false;
        crossbowCharge = 0;
        fpHand.crossbowPull = 0;
        if (gameMode === 'creative' || consumeItemFromInventory(ITEM.ARROW, 1)) {
          curXbow.loaded = true;
          sound.playCrossbowLoad();
          pushSubtitle('Arbalet kuruldu!');
          renderHotbar();
        }
      }
    }
  } else {
    fpHand.bowPull = 0;
    fpHand.crossbowPull = 0;
  }
  if (tridentDrawing) {
    if (!rightMouseHeld || uiMode !== 'playing' || activeItemId() !== ITEM.TRIDENT) {
      tridentDrawing = false;
      tridentCharge = 0;
      fpHand.tridentAim = 0;
    } else {
      tridentCharge = Math.min(1, tridentCharge + dt * 1.35);
      fpHand.tridentAim = tridentCharge;
    }
  } else {
    fpHand.tridentAim = 0;
  }
  const heldForCouch = activeItemId();
  if (selectedSlot !== lastSpearSlotIdx) {
    lastSpearSlotIdx = selectedSlot;
    spearStrikeCooldown = 0;
    spearCouching = false;
  }
  if (spearCouching && (!rightMouseHeld || uiMode !== 'playing' || (heldForCouch !== ITEM.IRON_SPEAR && heldForCouch !== ITEM.DIAMOND_SPEAR))) {
    spearCouching = false;
  }
  fpHand.spearCouch = spearCouching ? 1 : 0;

  // Authentic Hold-to-Eat (`0.95s` chewing + crunch SFX)
  if (eatingActive) {
    const eatStack = eatingIsOffhand ? offhandSlot : hotbar[selectedSlot];
    if (!rightMouseHeld || uiMode !== 'playing' || !eatStack || eatStack.id !== eatingItemId || eatStack.count <= 0) {
      eatingActive = false;
      eatingTimer = 0;
      fpHand.eatingMainhand = 0;
      fpHand.eatingOffhand = 0;
    } else {
      eatingTimer += dt;
      eatingCrunchClock += dt;
      if (eatingCrunchClock >= 0.24) {
        eatingCrunchClock = 0;
        sound.playEat();
      }
      const eatProg = Math.min(1, eatingTimer / 0.95);
      fpHand.eatingMainhand = eatingIsOffhand ? 0 : eatProg;
      fpHand.eatingOffhand = eatingIsOffhand ? eatProg : 0;
      if (eatingTimer >= 0.95) {
        const foodDef = getItemDef(eatingItemId);
        const restore = foodDef.foodRestore || 4;
        hunger = Math.min(20, hunger + restore);
        saturation = Math.min(
          20,
          saturation + restore * (eatingItemId === ITEM.GOLDEN_APPLE || eatingItemId === ITEM.GOLDEN_CARROT ? 1.2 : 0.6)
        );
        if (foodDef.healAmount) health = Math.min(20, health + foodDef.healAmount);
        if (eatingItemId === ITEM.GOLDEN_APPLE) {
          goldenAppleRegenTimer = 6.0;
          sound.playAmethystChime();
        }
        sound.playEat();
        pushSubtitle(`${foodDef.name} yendi`);
        if (gameMode === 'survival') {
          eatStack.count -= 1;
          if (eatStack.count <= 0) {
            if (eatingIsOffhand) offhandSlot = null;
            else hotbar[selectedSlot] = null;
          }
          renderHotbar();
        }
        renderVitalsAndXp();
        eatingActive = false;
        eatingTimer = 0;
        fpHand.eatingMainhand = 0;
        fpHand.eatingOffhand = 0;
        rightPlaceCooldown = 0.28;
      }
    }
  } else {
    fpHand.eatingMainhand = 0;
    fpHand.eatingOffhand = 0;
  }

  // Per-Hand Strict Shield Blocking & Warmup (`>= 0.18s` active block; NEVER raises non-shield hand!)
  const shieldHandsNow = computeShieldBlockHands();
  const isBlocking = shieldHandsNow.main || shieldHandsNow.off;
  if (isBlocking) {
    shieldRaiseTimer = Math.min(5, shieldRaiseTimer + dt);
  } else {
    shieldRaiseTimer = 0;
  }

  // Vanilla Item-Use Movement Slowdown (`0.28x` walk speed & Sprint cancellation when blocking/drawing/eating/zooming!)
  const isUsingItemSlow =
    isBlocking ||
    bowDrawing ||
    crossbowCharging ||
    tridentDrawing ||
    spyglassZooming ||
    spearCouching ||
    eatingActive;

  if (isUsingItemSlow) {
    doubleTapSprint = false;
    if (!ctrlKeyHeld && !cKeyHeld && !sprintToggleMode) {
      sprintLatched = false;
      input.sprint = false;
    }
    if (mobileSprintLocked) {
      mobileSprintLocked = false;
      mobileJoystickBase.classList.remove('sprint-locked');
    }
  }

  // Hunger > 6 sprint gate in Survival + Zero-Alloc Input Buffer + Mobile Auto-Jump
  const canSprint = (gameMode === 'creative' || hunger > 6) && !isUsingItemSlow && !input.sneak;
  let activeInput: InputState = idleInputBuf;
  if (uiMode === 'playing') {
    let autoJumpNow = false;
    if (
      mobAutoJump &&
      joyTouchId !== null &&
      input.forward &&
      !input.jump &&
      !input.sneak &&
      !isUsingItemSlow &&
      player.onGround &&
      !player.inWater &&
      !player.flying &&
      !mobs.mountedMob &&
      !boats.mountedBoat
    ) {
      const ax = Math.floor(player.x - Math.sin(player.yaw) * 0.64);
      const az = Math.floor(player.z - Math.cos(player.yaw) * 0.64);
      const ay = Math.floor(player.y + 0.08);
      const b0 = getBlock(world.getBlock(ax, ay, az));
      const b1 = getBlock(world.getBlock(ax, ay + 1, az));
      const b2 = getBlock(world.getBlock(ax, ay + 2, az));
      if (b0.solid && b0.id !== BLOCK.OAK_FENCE && !b1.solid && !b2.solid) {
        autoJumpNow = true;
      }
    }
    activeInputBuf.forward = input.forward;
    activeInputBuf.backward = input.backward;
    activeInputBuf.left = input.left;
    activeInputBuf.right = input.right;
    activeInputBuf.moveX = input.moveX;
    activeInputBuf.moveZ = input.moveZ;
    activeInputBuf.jump = input.jump || autoJumpNow;
    activeInputBuf.sneak = input.sneak;
    activeInputBuf.sprint = !!((input.sprint || sprintLatched || sprintToggleMode || ctrlKeyHeld || cKeyHeld) && canSprint);
    activeInputBuf.usingItem = isUsingItemSlow;
    activeInput = activeInputBuf;
  }

  if (spearStrikeCooldown > 0) spearStrikeCooldown = Math.max(0, spearStrikeCooldown - dt);
  if (camelDashCooldown > 0) camelDashCooldown = Math.max(0, camelDashCooldown - dt);
  if (camelDashBoost > 0) camelDashBoost = Math.max(0, camelDashBoost - dt * 14);

  // Tick Campfire cooking (`campfire.rs`: up to 4 items cook in 6s with zero fuel!) & Sweet Berry regrowth
  for (const [cfKey, cf] of campfireCookSlots.entries()) {
    if (cf.dim !== world.dimension) continue;
    if (world.getBlock(cf.bx, cf.by, cf.bz) !== BLOCK.CAMPFIRE) {
      if (cf.timers.length > 0) {
        world.spawnItemDrop(cf.bx + 0.5, cf.by + 0.5, cf.bz + 0.5, { id: ITEM.RAW_BEEF, count: cf.timers.length }, 0.3);
      }
      campfireCookSlots.delete(cfKey);
      continue;
    }
    for (let i = cf.timers.length - 1; i >= 0; i--) {
      cf.timers[i] -= dt;
      if (cf.timers[i] <= 0) {
        cf.timers.splice(i, 1);
        world.spawnItemDrop(cf.bx + 0.5, cf.by + 0.65, cf.bz + 0.5, { id: ITEM.COOKED_STEAK, count: 1 }, 0.35);
        world.spawnXpOrbs(cf.bx + 0.5, cf.by + 0.7, cf.bz + 0.5, 1);
        if (sound.distanceGain(cf.bx + 0.5, cf.by + 0.5, cf.bz + 0.5, player.x, player.y, player.z) > 0.05) {
          sound.playXp(false);
          pushSubtitle('Kamp ateşinde biftek pişti!', cf.bx + 0.5, cf.bz + 0.5);
        }
      }
    }
    if (cf.timers.length === 0) campfireCookSlots.delete(cfKey);
  }
  for (const [bKey, remSec] of berryCooldowns.entries()) {
    const nextSec = remSec - dt;
    if (nextSec <= 0) berryCooldowns.delete(bKey);
    else berryCooldowns.set(bKey, nextSec);
  }
  for (const [tbKey, tb] of activeTargetBlocks.entries()) {
    tb.remaining -= dt;
    if (tb.remaining <= 0) {
      activeTargetBlocks.delete(tbKey);
      if (tb.dim === world.dimension) {
        const coordsPart = tbKey.includes(':') ? tbKey.split(':')[1] : tbKey;
        const [tx, ty, tz] = coordsPart.split(',').map(Number);
        propagateRedstoneAround(tx, ty, tz);
      }
    }
  }

  const boatRiderPos = boats.update(dt, world, activeInput, player.yaw);

  if (boatRiderPos && boats.mountedBoat) {
    player.x = boatRiderPos.x;
    player.y = boatRiderPos.y;
    player.z = boatRiderPos.z;
    player.vx = boats.mountedBoat.vx;
    player.vy = 0;
    player.vz = boats.mountedBoat.vz;
    player.onGround = true;
    player.headUnderwater = false;
    player.resetFallDistance();
  } else if (mobs.mountedMob && !mobs.mountedMob.dead) {
    const mount = mobs.mountedMob;
    mount.yaw = player.yaw;
    const isHappyGhast = mount.species === 'happy_ghast';
    const isNautilus = mount.species === 'nautilus';
    const isStrider = mount.species === 'strider';
    const riderOffset =
      isHappyGhast ? 2.15 : mount.species === 'camel' ? 1.38 : isStrider ? 1.18 : isNautilus ? 0.65 : 1.08;
    const analogMount = Math.abs(activeInput.moveX || 0) > 0.01 || Math.abs(activeInput.moveZ || 0) > 0.01;
    const fwd = analogMount
      ? -(activeInput.moveZ || 0)
      : (activeInput.forward ? 1 : 0) - (activeInput.backward ? 1 : 0);
    const str = analogMount
      ? (activeInput.moveX || 0)
      : (activeInput.right ? 1 : 0) - (activeInput.left ? 1 : 0);
    const mountInWater = isWaterBlock(world.getBlock(Math.floor(mount.x), Math.floor(mount.y + 0.42), Math.floor(mount.z)));
    const mountInLava = isLavaBlock(world.getBlock(Math.floor(mount.x), Math.floor(mount.y - 0.15), Math.floor(mount.z))) ||
      isLavaBlock(world.getBlock(Math.floor(mount.x), Math.floor(mount.y + 0.25), Math.floor(mount.z)));
    const mSpd = isHappyGhast
      ? 8.8
      : isNautilus
        ? (mountInWater ? 9.8 : 2.6)
        : isStrider
          ? (mountInLava ? 7.8 : 4.2)
          : mount.species === 'camel'
            ? 6.8 + camelDashBoost
            : 8.6;
    const sinY = Math.sin(player.yaw);
    const cosY = Math.cos(player.yaw);
    const effFwd = mount.species === 'camel' && camelDashBoost > 0.5 ? Math.max(0.85, fwd) : fwd;
    const mvx = (-sinY * effFwd + cosY * str * 0.6) * mSpd;
    const mvz = (-cosY * effFwd - sinY * str * 0.6) * mSpd;

    const nx = mount.x + mvx * dt;
    const nz = mount.z + mvz * dt;
    if (world.isChunkLoadedAt(nx, nz)) {
      const ix = Math.floor(nx);
      const iz = Math.floor(nz);
      const iy = Math.floor(mount.y + 0.1);
      const riderHeadClearAt = (baseY: number) =>
        !getBlock(world.getBlock(ix, Math.floor(baseY + riderOffset + 0.85), iz)).solid &&
        !getBlock(world.getBlock(ix, Math.floor(baseY + riderOffset + 1.58), iz)).solid;

      if (isHappyGhast) {
        if (!getBlock(world.getBlock(ix, iy + 1, iz)).solid && riderHeadClearAt(mount.y)) {
          mount.x = nx;
          mount.z = nz;
        }
        const flyVy = (Math.sin(player.pitch) * fwd * 7.2) + (activeInput.jump ? 5.8 : 0);
        const ny = Math.max(2, Math.min(WORLD_HEIGHT - 5, mount.y + flyVy * dt));
        const under = getBlock(world.getBlock(Math.floor(mount.x), Math.floor(ny - 0.08), Math.floor(mount.z)));
        if (!under.solid && riderHeadClearAt(ny)) {
          mount.y = ny;
        }
        mount.vy = 0;
      } else {
        if (!getBlock(world.getBlock(ix, iy, iz)).solid && riderHeadClearAt(mount.y)) {
          mount.x = nx;
          mount.z = nz;
        } else if (
          !getBlock(world.getBlock(ix, iy + 1, iz)).solid &&
          !getBlock(world.getBlock(ix, iy + 2, iz)).solid &&
          riderHeadClearAt(iy + 1.02)
        ) {
          mount.x = nx;
          mount.z = nz;
          mount.y = iy + 1.02;
        }

        if (isNautilus && mountInWater) {
          mount.vy = Math.sin(player.pitch) * fwd * 6.5 + (activeInput.jump ? 4.8 : 0);
        } else if (mountInWater) {
          mount.vy = Math.max(mount.vy - 6 * dt, activeInput.jump ? 4.4 : 1.8);
        } else {
          if (activeInput.jump && mount.vy === 0 && riderHeadClearAt(mount.y + 0.8)) {
            if (mount.species === 'camel') {
              if (camelDashCooldown <= 0) {
                mount.sitting = false;
                mount.vy = 5.8;
                camelDashBoost = 8.4;
                camelDashCooldown = 2.4;
                sound.playStep('sand');
                pushSubtitle('Deve ileri atıldı!');
              }
            } else {
              mount.vy = mount.species === 'horse' ? 10.8 : 9.6;
              sound.playStep('grass');
            }
          }
          mount.vy -= 25 * dt;
        }
        const ny = mount.y + mount.vy * dt;
        const underCellY = Math.floor(ny - 0.04);
        const underId = world.getBlock(Math.floor(mount.x), underCellY, Math.floor(mount.z));
        const under = getBlock(underId);
        if (isStrider && isLavaBlock(underId) && ny <= underCellY + 0.96) {
          mount.y = underCellY + 0.94;
          mount.vy = 0;
        } else if (under.solid) {
          mount.y = underCellY + 1.0;
          mount.vy = 0;
        } else {
          mount.y = ny;
        }
      }
    }

    player.x = mount.x;
    player.y = mount.y + riderOffset;
    player.z = mount.z;
    player.vx = mvx;
    player.vy = 0;
    player.vz = mvz;
    player.onGround = true;
    if (isStrider) player.inLava = false;
    if (isNautilus) {
      player.headUnderwater = false;
      airSupply = 16;
    }
    player.resetFallDistance();
  } else {
    if (elytraGliding) {
      if (
        player.onGround ||
        player.inWater ||
        player.inLava ||
        player.flying ||
        armorSlots[1]?.id !== ITEM.ELYTRA
      ) {
        elytraGliding = false;
        fireworkBoostTimer = 0;
      } else {
        const gLook = lookDirection();
        if (fireworkBoostTimer > 0) {
          fireworkBoostTimer = Math.max(0, fireworkBoostTimer - dt);
          const blend = Math.min(1, dt * 8.5);
          player.vx += (gLook.dx * 24 - player.vx) * blend;
          player.vy += (gLook.dy * 22 - player.vy) * blend;
          player.vz += (gLook.dz * 24 - player.vz) * blend;
          fireworkSparkAccum += dt;
          if (fireworkSparkAccum >= 0.08) {
            fireworkSparkAccum = 0;
            world.spawnMiningChips(
              Math.floor(player.x),
              Math.floor(player.y),
              Math.floor(player.z),
              0,
              1,
              0,
              BLOCK.GOLD_BLOCK,
              2
            );
          }
        } else {
          const curH = Math.hypot(player.vx, player.vz);
          const diveFactor = Math.max(0, -gLook.dy);
          const climbFactor = Math.max(0, gLook.dy);
          const targetH = Math.max(8.5, Math.min(22.0, curH * (1 - climbFactor * dt * 1.4) + diveFactor * 16.5 * dt + 2.2 * dt));
          const hNorm = Math.hypot(gLook.dx, gLook.dz) || 1;
          player.vx = (gLook.dx / hNorm) * targetH;
          player.vz = (gLook.dz / hNorm) * targetH;
          const targetVy = climbFactor > 0.05 && curH > 9.5
            ? Math.min(9.5, gLook.dy * curH * 0.72)
            : -2.05 - diveFactor * 13.5;
          player.vy += (targetVy - player.vy) * Math.min(1, dt * 5.5);
        }
        if (player.vy > -12.5) player.resetFallDistance();
        if (gameMode === 'survival' && armorSlots[1]?.id === ITEM.ELYTRA) {
          elytraWearAccum += dt;
          if (elytraWearAccum >= 2.5) {
            elytraWearAccum = 0;
            const maxDur = getItemDef(ITEM.ELYTRA).maxDurability || 432;
            armorSlots[1].damage = Math.min(maxDur - 1, (armorSlots[1].damage || 0) + 1);
          }
        }
        // Suppress gravity jump impulse while gliding so player.update moves smoothly along glide velocity!
        activeInput.jump = false;
      }
    }
    player.update(dt, activeInput, world);
    if (player.onGround && elytraGliding) {
      elytraGliding = false;
      fireworkBoostTimer = 0;
    }
  }

  // Tick Sky Firework Rockets & 3D Fishing Rod Bobber + Catenary Line
  for (let i = pendingSkyFireworks.length - 1; i >= 0; i--) {
    const fw = pendingSkyFireworks[i];
    fw.timer -= dt;
    if (fw.timer <= 0) {
      pendingSkyFireworks.splice(i, 1);
      tensuraVfx.spawnNovaSphere(fw.x, fw.y, fw.z, 5.2, fw.colA, fw.colB);
      sound.playExplosion();
    }
  }

  if (fishingState.active) {
    if (
      activeItemId() !== ITEM.FISHING_ROD ||
      fishingState.dim !== world.dimension ||
      Math.hypot(fishingState.x - player.x, fishingState.z - player.z) > 28
    ) {
      retractFishingBobber();
    } else {
      if (!fishingState.inWater) {
        fishingState.vy -= 20 * dt;
        const nx = fishingState.x + fishingState.vx * dt;
        const ny = fishingState.y + fishingState.vy * dt;
        const nz = fishingState.z + fishingState.vz * dt;
        const blk = world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
        if (isWaterBlock(blk)) {
          fishingState.inWater = true;
          fishingState.x = nx;
          fishingState.y = Math.floor(ny) + 0.86;
          fishingState.z = nz;
          fishingState.vx = 0;
          fishingState.vy = 0;
          fishingState.vz = 0;
          tensuraVfx.spawnWaterSplash(fishingState.x, fishingState.y + 0.05, fishingState.z);
          sound.playStep('water');
        } else if (getBlock(blk).solid) {
          fishingState.vx *= 0.25;
          fishingState.vz *= 0.25;
          fishingState.vy = 0;
          fishingState.y = Math.floor(ny) + 1.02;
        } else {
          fishingState.x = nx;
          fishingState.y = ny;
          fishingState.z = nz;
        }
      } else {
        if (fishingState.biteWindow > 0) {
          fishingState.biteWindow -= dt;
          if (fishingState.biteWindow <= 0) {
            fishingState.biteWait = 2.0 + Math.random() * 2.0;
          }
        } else {
          fishingState.biteWait -= dt;
          if (fishingState.biteWait <= 0) {
            fishingState.biteWindow = 1.65;
            tensuraVfx.spawnWaterSplash(fishingState.x, fishingState.y + 0.08, fishingState.z);
            sound.playStep('water');
            pushSubtitle('Oltaya balık vurdu! Sağ tıkla çekin!', fishingState.x, fishingState.z);
          }
        }
      }
      const dip = fishingState.biteWindow > 0 ? -0.22 + Math.sin(now * 0.025) * 0.06 : Math.sin(now * 0.005) * 0.035;
      const byNow = fishingState.y + (fishingState.inWater ? dip : 0);
      fishingBobberGroup.position.set(fishingState.x, byNow, fishingState.z);
      const rSign = mobLeftHanded ? -1 : 1;
      const rx = player.x + (Math.cos(player.yaw) * 0.32 * rSign - Math.sin(player.yaw) * 0.42);
      const ry = player.y + player.eyeHeight(player.isCrouching || activeInput.sneak) - 0.18;
      const rz = player.z + (-Math.sin(player.yaw) * 0.32 * rSign - Math.cos(player.yaw) * 0.42);
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const sag = Math.sin(t * Math.PI) * 0.36;
        fishingLinePositions[s * 3] = rx + (fishingState.x - rx) * t;
        fishingLinePositions[s * 3 + 1] = ry + (byNow + 0.22 - ry) * t - sag;
        fishingLinePositions[s * 3 + 2] = rz + (fishingState.z - rz) * t;
      }
      fishingLineGeo.attributes.position.needsUpdate = true;
    }
  }

  // Water Entry Splash VFX & Audio
  if (!wasPlayerInWater && player.inWater && Math.abs(player.vy) > 1.8) {
    tensuraVfx.spawnWaterSplash(player.x, player.y + 0.12, player.z);
    sound.playStep('water');
  }
  wasPlayerInWater = player.inWater;

  const curLook = lookDirection();
  const isRainingNow = weatherSys.weather === 'rain' || weatherSys.weather === 'thunder';
  world.update(dt, player.x, player.y, player.z, isRainingNow);
  projectiles.update(dt, world, player.x, player.y, player.z);
  armorStands.update(dt, world.dimension);
  // Horizon 26.3 `spear.rs`: Couched Spear automatic kinetic charge impalement at sprint/mount velocity!
  if (spearCouching && spearStrikeCooldown <= 0 && uiMode === 'playing') {
    const chgSpd = Math.hypot(player.vx, player.vz);
    if (chgSpd > 4.0) {
      const heldDefChg = getItemDef(activeItemId());
      const enchChg = (hotbar[selectedSlot]?.ench || 0) * 1.5;
      const chgDmg = Math.round((heldDefChg.attackDamage ?? 6) + enchChg + tensura.getMeleeDamageBonus() + Math.min(10, (chgSpd - 2.5) * 1.25));
      const chgEyeY = player.y + player.eyeHeight(player.isCrouching || activeInput.sneak);
      if (mobs.spearChargeStrike(player.x, chgEyeY, player.z, curLook.dx, curLook.dy, curLook.dz, chgDmg, world.dimension, world, sound)) {
        spearStrikeCooldown = 0.45;
        damageHeldTool(1, false);
        triggerLocalSwing();
        pushSubtitle(`Mızrak Hücumu! (${chgDmg} Hasar)`);
      }
    }
  }
  mobs.update(
    dt,
    world,
    projectiles,
    sound,
    player.x,
    player.y,
    player.z,
    timeOfDay,
    gameMode === 'creative',
    curLook.dx,
    curLook.dy,
    curLook.dz,
    armorSlots[0]?.id === BLOCK.CARVED_PUMPKIN,
    jukeboxPlayingAt !== null,
    isRainingNow
  );
  const arenaBossInfo = updateTempestArena(dt);
  tensuraVfx.update(
    dt,
    player.x,
    player.y,
    player.z,
    urielShieldTimer > 0,
    mobs.timeStopTimer > 0,
    world.dimension === 'overworld'
  );
  weatherSys.update(dt, world, sound, player.x, player.y, player.z);
  updateAtmosphere(dt);

  // Active Boss Bar (Tempest Arena Trial, Ender Dragon, Wither Boss & Warden!)
  const bossInfo = arenaBossInfo || mobs.getActiveBossBar(world.dimension, player.x, player.z);
  if (bossInfo) {
    if (!lastBossShown) {
      lastBossShown = true;
      bossBarWrap.classList.remove('hidden');
    }
    if (bossInfo.title !== lastBossTitle) {
      lastBossTitle = bossInfo.title;
      bossBarTitle.textContent = bossInfo.title;
    }
    const pct = Math.max(0, Math.round((bossInfo.hp / bossInfo.maxHp) * 100));
    if (pct !== lastBossPct) {
      lastBossPct = pct;
      bossBarFill.style.width = `${pct}%`;
    }
  } else if (lastBossShown) {
    lastBossShown = false;
    lastBossTitle = '';
    lastBossPct = -1;
    bossBarWrap.classList.add('hidden');
  }

  // Survival Vitals Simulation (Saturation + Hunger drain, Golden Apple Regen, Natural Regen, Air Supply #15833)
  if (goldenAppleRegenTimer > 0) {
    const prevInt = Math.ceil(goldenAppleRegenTimer);
    goldenAppleRegenTimer = Math.max(0, goldenAppleRegenTimer - dt);
    if (Math.ceil(goldenAppleRegenTimer) < prevInt && health > 0 && health < 20) {
      health = Math.min(20, health + 1);
      renderVitalsAndXp();
    }
  }
  if (gameMode === 'survival' && uiMode !== 'dead') {
    const horizSpd = Math.hypot(player.vx, player.vz);
    if (horizSpd > 0.5) {
      hungerClock += dt * (activeInput.sprint ? 1.8 : 0.6);
      if (hungerClock >= 22) {
        hungerClock = 0;
        if (saturation > 0) {
          saturation = Math.max(0, saturation - 1);
        } else {
          hunger = Math.max(0, hunger - 1);
          renderVitalsAndXp();
        }
      }
    }
    if (hunger >= 18 && health < 20) {
      regenClock += dt;
      if (regenClock >= (saturation > 0 ? 1.6 : 3.2)) {
        regenClock = 0;
        health = Math.min(20, health + 1);
        if (saturation > 0) saturation = Math.max(0, saturation - 0.75);
        renderVitalsAndXp();
      }
    }
    if (player.headUnderwater) {
      drownClock += dt;
      if (drownClock >= 1.1) {
        drownClock = 0;
        if (airSupply > 0) {
          airSupply = Math.max(0, Math.min(16, airSupply - 2));
          renderVitalsAndXp();
        } else {
          applyDamage(2, 'Boğulma');
        }
      }
    } else if (airSupply < 16) {
      airSupply = Math.min(16, airSupply + 2);
      renderVitalsAndXp();
    }
  }

  const curTint = screenTint.className;
  if (curTint !== 'damage' && curTint !== 'portal' && curTint !== 'totem') {
    const amb = defaultAmbientTint();
    if (amb !== lastAmbientTint || curTint !== amb) {
      lastAmbientTint = amb;
      screenTint.className = amb;
    }
  }

  if (attackCooldown > 0) {
    attackCooldown = Math.max(0, attackCooldown - dt * 2.1);
    attackCooldownWrap.classList.toggle('hidden', attackCooldown <= 0.02);
    attackCooldownFill.style.width = `${Math.round((1 - attackCooldown) * 100)}%`;
  }

  // Right-click continuous placement cooldown (#15516)
  if (rightPlaceCooldown > 0) rightPlaceCooldown = Math.max(0, rightPlaceCooldown - dt);
  if (
    rightMouseHeld &&
    !bowDrawing &&
    !tridentDrawing &&
    !crossbowCharging &&
    !spearCouching &&
    rightPlaceCooldown <= 0 &&
    uiMode === 'playing'
  ) {
    rightPlaceCooldown = 0.18;
    handleRightClickUseOrPlace(false);
  }

  // Progressive Survival Mining + Hold-to-Attack Mobile Melee + 3D Block Crack Overlay
  const hit = uiMode === 'playing' ? currentRaycastHit(false) : null;
  let aimingAtEntityWhileHolding = false;
  if (leftMouseHeld && uiMode === 'playing') {
    const heldIdReach = activeItemId();
    const mReach = gameMode === 'creative' ? 4.4 : (heldIdReach === ITEM.IRON_SPEAR || heldIdReach === ITEM.DIAMOND_SPEAR) ? 4.35 : 3.2;
    const clampedR = hit ? Math.min(mReach, hit.dist + 0.08) : mReach;
    const eyeYHold = player.y + player.eyeHeight(player.isCrouching || activeInput.sneak);
    const hasEnt =
      !!armorStands.raycastStand(player.x, eyeYHold, player.z, curLook.dx, curLook.dy, curLook.dz, clampedR, world.dimension) ||
      !!boats.raycastBoat(player.x, eyeYHold, player.z, curLook.dx, curLook.dy, curLook.dz, clampedR, world.dimension) ||
      !!mobs.raycastMob(player.x, eyeYHold, player.z, curLook.dx, curLook.dy, curLook.dz, clampedR, world.dimension);
    if (hasEnt) {
      aimingAtEntityWhileHolding = true;
      miningProgress = 0;
      world.updateBreakCrack(0, 0, 0, 0);
      stopMineBroadcastIfActive();
      if (attackCooldown <= 0.02) {
        triggerPrimaryAttackOrStartMining();
      }
    }
  }
  if (postBreakDelay > 0) postBreakDelay = Math.max(0, postBreakDelay - dt);

  if (hit && !aimingAtEntityWhileHolding) {
    highlightBox.visible = !cinematicHudHidden;
    const vb = world.getBlockVisualBounds(hit.bx, hit.by, hit.bz);
    highlightBox.scale.set(vb.sx, vb.sy, vb.sz);
    highlightBox.position.set(vb.cx, vb.cy, vb.cz);

    if (leftMouseHeld && gameMode === 'creative' && uiMode === 'playing' && postBreakDelay <= 0) {
      if (getItemDef(activeItemId()).toolClass !== 'sword' && hit.blockId !== BLOCK.END_CRYSTAL_BLOCK) {
        triggerLocalSwing();
        breakBlockAt(hit.bx, hit.by, hit.bz, hit.blockId);
        postBreakDelay = 0.22;
      }
      world.updateBreakCrack(0, 0, 0, 0);
      stopMineBroadcastIfActive();
    } else if (leftMouseHeld && postBreakDelay <= 0 && gameMode === 'survival' && uiMode === 'playing') {
      const key = `${hit.bx},${hit.by},${hit.bz}:${selectedSlot}:${activeItemId()}`;
      if (key !== miningTargetKey) {
        miningTargetKey = key;
        miningProgress = 0.005;
        world.spawnMiningChips(hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz, hit.blockId, 3);
        sound.playHitBlock(getBlock(hit.blockId).material);
      }
      const breakSec = computeBreakDuration(
        hit.blockId,
        activeItemId(),
        player.onGround,
        player.headUnderwater,
        hotbar[selectedSlot]?.ench || 0
      );
      if (breakSec <= 0.02) {
        triggerLocalSwing();
        world.spawnMiningChips(hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz, hit.blockId, 4);
        breakBlockAt(hit.bx, hit.by, hit.bz, hit.blockId);
        miningProgress = 0;
        miningTargetKey = '';
        postBreakDelay = 0;
        world.updateBreakCrack(0, 0, 0, 0);
        stopMineBroadcastIfActive();
      } else if (Number.isFinite(breakSec)) {
        miningProgress += dt / breakSec;
        world.updateBreakCrack(hit.bx, hit.by, hit.bz, miningProgress);
        const stage = Math.min(9, Math.floor(miningProgress * 10));
        mineBroadcastActive = true;
        server.broadcastMine(hit.bx, hit.by, hit.bz, stage, hit.blockId, hit.nx, hit.ny, hit.nz, world.dimension);

        swingLoopClock += dt;
        if (swingLoopClock > 0.22) {
          swingLoopClock = 0;
          fpHand.triggerSwing();
          localAvatar.triggerSwing();
          server.broadcastSwing();
          world.spawnMiningChips(hit.bx, hit.by, hit.bz, hit.nx, hit.ny, hit.nz, hit.blockId, 3);
          sound.playHitBlock(getBlock(hit.blockId).material);
        }

        if (miningProgress >= 1) {
          breakBlockAt(hit.bx, hit.by, hit.bz, hit.blockId);
          miningProgress = 0;
          miningTargetKey = '';
          postBreakDelay = 0.20;
          mineBroadcastActive = false;
          world.updateBreakCrack(0, 0, 0, 0);
        }
      }
    } else {
      world.updateBreakCrack(0, 0, 0, 0);
      stopMineBroadcastIfActive();
    }
  } else {
    highlightBox.visible = false;
    world.updateBreakCrack(0, 0, 0, 0);
    stopMineBroadcastIfActive();
    miningProgress = 0;
    miningTargetKey = '';
  }

  // Camera Placement + Dual-Hand Shield Blocking + Weapon Cooldown & 3rd-Person Pose Sync
  fpHand.blocking = isBlocking;
  fpHand.blockingMainhand = shieldHandsNow.main;
  fpHand.blockingOffhand = shieldHandsNow.off;
  fpHand.cooldownReady = 1 - attackCooldown;
  localAvatar.blocking = isBlocking;
  localAvatar.gliding = elytraGliding;
  localAvatar.poseMode = bowDrawing
    ? 'bow'
    : crossbowCharging || (hotbar[selectedSlot]?.id === ITEM.CROSSBOW && Boolean(hotbar[selectedSlot]?.loaded))
      ? 'crossbow'
      : tridentDrawing
        ? 'trident'
        : spearCouching
          ? 'spear'
          : spyglassZooming
            ? 'spyglass'
            : eatingActive
              ? 'eat'
              : 'none';

  const crouched = player.isCrouching || activeInput.sneak;
  const eyeY = player.y + player.eyeHeight(crouched);
  const horizSpeed = Math.hypot(player.vx, player.vz);

  // Refresh mobile contextual action label at 10Hz when touch HUD is visible
  if (isTouchDevice && uiMode === 'playing' && !cinematicHudHidden) {
    mobPromptClock += dt;
    if (mobPromptClock >= 0.10) {
      mobPromptClock = 0;
      updateMobileContextPrompt(hit, eyeY, curLook.dx, curLook.dy, curLook.dz);
    }
  }

  const baseFov = cachedBaseFov;
  let targetFov = baseFov;
  if (spyglassZooming) targetFov = 18;
  else if (bowDrawing) targetFov = baseFov - bowCharge * 10;
  else if (crossbowCharging) targetFov = baseFov - crossbowCharge * 6;
  else if (tridentDrawing) targetFov = baseFov - tridentCharge * 8;
  else if (elytraGliding) targetFov = baseFov + Math.min(12, horizSpeed * 0.65);
  else if (activeInput.sprint && activeInput.forward) targetFov = baseFov + 8;

  if (Math.abs(camera.fov - targetFov) > 0.1) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
    camera.updateProjectionMatrix();
  }

  localAvatar.syncDirect(player.x, player.y, player.z, player.yaw, player.pitch, horizSpeed, crouched, dt);

  if (cameraPerson === 0) {
    camera.position.set(player.x, eyeY, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    fpHand.update(dt, horizSpeed, !cinematicHudHidden && !spyglassZooming);
  } else {
    fpHand.update(dt, horizSpeed, false);
    const maxDist = 3.8;
    const dirSign = cameraPerson === 1 ? 1 : -1;
    const cosP = Math.cos(player.pitch);
    const rdx = Math.sin(player.yaw) * cosP * dirSign;
    const rdy = -Math.sin(player.pitch) * dirSign + 0.08;
    const rdz = Math.cos(player.yaw) * cosP * dirSign;
    const len = Math.hypot(rdx, rdy, rdz) || 1;
    const ndx = rdx / len, ndy = rdy / len, ndz = rdz / len;

    // P1 #10 Fix: solidOnly=true so F5 camera ignores tall grass, flowers, torches, crops!
    const camHit = raycastVoxel(world, player.x, eyeY, player.z, ndx, ndy, ndz, maxDist, false, true);
    const safeDist = camHit ? Math.max(0.45, camHit.dist - 0.25) : maxDist;

    camera.position.set(player.x + ndx * safeDist, eyeY + ndy * safeDist, player.z + ndz * safeDist);
    camera.lookAt(player.x, eyeY - 0.1, player.z);
  }

  for (const av of remoteAvatars.values()) {
    av.updateInterpolated(dt);
  }

  server.broadcastState(
    player.x,
    player.y,
    player.z,
    player.yaw,
    player.pitch,
    activeItemId(),
    crouched,
    world.dimension,
    isBlocking,
    getEquippedArmorTuple(),
    offhandSlot?.id === ITEM.SHIELD,
    offhandSlot?.id || 0,
    tensura.isSlimeBodyActive()
  );

  locatorClock += dt;
  if (locatorClock > 0.12) {
    locatorClock = 0;
    updateLocatorBar();
  }

  if (showF3) {
    f3Clock += dt;
    if (f3Clock >= 0.2) {
      f3Clock = 0;
      const ix = Math.floor(player.x);
      const iz = Math.floor(player.z);
      const biome = world.getBiomeAt(ix, iz);
      const cx = Math.floor(ix / 16);
      const cz = Math.floor(iz / 16);
      f3Panel.textContent =
        `Horizon 26.3 Web Edition · Tensura RPG (${tensura.getStageTitle()} · Sv.${tensura.getLevel()} · ${tensura.formatEp()} EP)\n` +
        `${currentFps} FPS · DPR: ${renderer.getPixelRatio().toFixed(2)} (${perfMode}) · Chunk: ${world.loadedChunkCount()} · Boyut: ${world.dimension}\n` +
        `XYZ: ${player.x.toFixed(2)} / ${player.y.toFixed(2)} / ${player.z.toFixed(2)} · Chunk [${cx}, ${cz}]\n` +
        `Biyom: ${biome} · Mod: ${gameMode} · Zırh: ${armorPoints}/20 · Seed: ${WORLD_SEED} (Zümrüt Çayır · Tempest)\n` +
        `Sunucu: Horizon Global #1 (${server.connectedGlobal ? 'Global Mesh Aktif' : 'Bağlanıyor'}) · ${server.onlineCount()} Oyuncu · ${formatPingLabel(server.currentPing)}`;
    }
  }

  renderer.render(scene, camera);
}

scheduleNextFrame();
