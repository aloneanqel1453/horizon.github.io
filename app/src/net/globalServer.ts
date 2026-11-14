// Zero-Setup Single Global Server Engine ("Horizon Global #1")
// Quad-Layer Simultaneous Mesh:
//   1. BroadcastChannel (0ms local multi-tab)
//   2. Port-443 WSS Ephemeral Relays (BIP-340 signed NIP-16 kind 25050 — bypasses all ISP non-443 port blocks!)
//   3. Simultaneous Multi-Broker TLS MQTT-over-WSS (Zero split-brain!)
//   4. Automatic WebRTC RTCDataChannel P2P Upgrade (<20ms direct movement & mining sync!)
// Plus Background-Tab Web Worker Heartbeat so Alt+Tabbing to Discord NEVER drops players!

import mqtt, { MqttClient } from 'mqtt';
import { BlockEdit, isValidEdit } from '../world/worldManager';
import { DimensionId } from '../world/terrainGen';

export interface RemotePlayerState {
  id: string;
  name: string;
  color: string;
  dim: DimensionId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  held: number;
  sneak: boolean;
  blocking: boolean;
  armor: [number, number, number, number];
  offhandShield: boolean;
  offhandId: number;
  slimeForm: boolean;
  lastSeen: number;
  ping: number;
}

export interface RemoteMinePacket {
  peerId: string;
  wx: number;
  y: number;
  wz: number;
  stage: number; // 0..9 or -1 (stopped)
  blockId: number;
  nx: number;
  ny: number;
  nz: number;
  dim: DimensionId;
}

export interface RemoteProjectilePacket {
  peerId: string;
  kind: 'arrow' | 'pearl' | 'snowball' | 'trident' | 'wind_charge';
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  speed: number;
  dim: DimensionId;
}

export interface ChatPacket {
  sender: string;
  color: string;
  text: string;
  system?: boolean;
}

const ROOM_ID = 'horizon263_aloneanqel1453_global_v3';
const TOPIC_PREFIX = `horizon263/aloneanqel1453/global_v3`;

// Standard HTTPS Port-443 WebSocket Relays (NEVER blocked by residential/mobile/corporate firewalls!)
const WSS_PORT_443_RELAYS = [
  'wss://relay.primal.net',
  'wss://offchain.pub'
];

// Simultaneous Multi-MQTT-over-WSS Brokers (connected in parallel to eliminate split-brain!)
const WSS_MQTT_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
  'wss://broker.emqx.io:8084/mqtt'
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

// ============================================================================
// Pure-TS Synchronous SHA-256 + BIP-340 Schnorr (secp256k1) for Port-443 Relays
// ============================================================================
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function sha256Bytes(msg: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const bitLen = msg.length * 8;
  const padLen = ((msg.length + 9 + 63) & ~63);
  const buf = new Uint8Array(padLen);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 4294967296), false);
  dv.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => odv.setUint32(i * 4, v, false));
  return out;
}

const SECP_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const SECP_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const SECP_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const SECP_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
const modP = (a: bigint, m = SECP_P) => ((a % m) + m) % m;
function powModP(b: bigint, e: bigint, m = SECP_P): bigint {
  let r = 1n;
  let base = modP(b, m);
  let exp = e;
  while (exp > 0n) {
    if (exp & 1n) r = modP(r * base, m);
    base = modP(base * base, m);
    exp >>= 1n;
  }
  return r;
}
const invP = (a: bigint) => powModP(a, SECP_P - 2n, SECP_P);
type Pt = [bigint, bigint] | null;
function addPt(p1: Pt, p2: Pt): Pt {
  if (!p1) return p2;
  if (!p2) return p1;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  if (x1 === x2 && y1 !== y2) return null;
  const lam = x1 === x2 ? modP(3n * x1 * x1 * invP(2n * y1)) : modP((y2 - y1) * invP(x2 - x1));
  const x3 = modP(lam * lam - x1 - x2);
  return [x3, modP(lam * (x1 - x3) - y1)];
}
function mulPt(k: bigint, p: Pt = [SECP_GX, SECP_GY]): Pt {
  let r: Pt = null;
  let q: Pt = p;
  let n = k;
  while (n > 0n) {
    if (n & 1n) r = addPt(r, q);
    q = addPt(q, q);
    n >>= 1n;
  }
  return r;
}
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const bigToBytes32 = (n: bigint): Uint8Array => {
  const hex = n.toString(16).padStart(64, '0');
  const u = new Uint8Array(32);
  for (let i = 0; i < 32; i++) u[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return u;
};
const bytesToBig = (b: Uint8Array): bigint => BigInt('0x' + bytesToHex(b));
const utf8Enc = new TextEncoder();

function taggedHash(tag: string, parts: Uint8Array[]): Uint8Array {
  const th = sha256Bytes(utf8Enc.encode(tag));
  const total = 64 + parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(total);
  buf.set(th, 0);
  buf.set(th, 32);
  let off = 64;
  for (const p of parts) {
    buf.set(p, off);
    off += p.length;
  }
  return sha256Bytes(buf);
}

class SchnorrIdentity {
  public readonly d: bigint;
  public readonly pubBytes: Uint8Array;
  public readonly pubHex: string;

  constructor() {
    const rnd = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(rnd);
    } else {
      for (let i = 0; i < 32; i++) rnd[i] = Math.floor(Math.random() * 256);
    }
    const raw = (bytesToBig(rnd) % (SECP_N - 2n)) + 1n;
    const pt = mulPt(raw)!;
    this.d = (pt[1] & 1n) === 0n ? raw : SECP_N - raw;
    this.pubBytes = bigToBytes32(pt[0]);
    this.pubHex = bytesToHex(this.pubBytes);
  }

  public signEphemeral(roomTag: string, content: string) {
    const created_at = Math.floor(Date.now() / 1000);
    const kind = 25050;
    const tags = [['t', roomTag]];
    const ser = JSON.stringify([0, this.pubHex, created_at, kind, tags, content]);
    const idBytes = sha256Bytes(utf8Enc.encode(ser));
    const id = bytesToHex(idBytes);

    const k0 = bytesToBig(taggedHash('BIP0340/nonce', [bigToBytes32(this.d), this.pubBytes, idBytes])) % SECP_N;
    const R = mulPt(k0)!;
    const k = (R[1] & 1n) === 0n ? k0 : SECP_N - k0;
    const rxBytes = bigToBytes32(R[0]);
    const e = bytesToBig(taggedHash('BIP0340/challenge', [rxBytes, this.pubBytes, idBytes])) % SECP_N;
    const s = modP(k + e * this.d, SECP_N);
    const sig = bytesToHex(rxBytes) + bytesToHex(bigToBytes32(s));
    return { id, pubkey: this.pubHex, created_at, kind, tags, content, sig };
  }
}

export function sanitizeHexColor(raw: unknown, fallback = '#38bdf8'): string {
  const s = String(raw || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

export function sanitizePlayerName(raw: unknown, fallback = 'Gezgin'): string {
  const s = String(raw || '')
    .replace(/[^\p{L}\p{N}_\-]/gu, '')
    .slice(0, 16);
  return s || fallback;
}

function sanitizeDim(raw: unknown): DimensionId {
  return raw === 'nether' || raw === 'end' ? raw : 'overworld';
}

interface RtcPeerLink {
  pc: RTCPeerConnection;
  fast: RTCDataChannel | null;
  rel: RTCDataChannel | null;
  connected: boolean;
}

export class GlobalHorizonServer {
  public selfId: string;
  public selfName: string;
  public selfColor: string;
  public selfDim: DimensionId = 'overworld';
  public connectedGlobal = false;
  public currentPing = 0;

  public peers = new Map<string, RemotePlayerState>();

  public onPeerJoin?: (peer: RemotePlayerState) => void;
  public onPeerUpdate?: (peer: RemotePlayerState) => void;
  public onPeerLeave?: (peerId: string, name: string) => void;
  public onPeerSwing?: (peerId: string) => void;
  public onPeerHurt?: (peerId: string) => void;
  public onPeerMine?: (pkt: RemoteMinePacket) => void;
  public onPeerProjectile?: (pkt: RemoteProjectilePacket) => void;
  public onBlockEdit?: (edits: BlockEdit[], isLiveAction: boolean) => void;
  public onRemoteTnt?: (wx: number, y: number, wz: number, dim: DimensionId) => void;
  public onWorldEvent?: (ev: Record<string, any>) => void;
  public onChat?: (msg: ChatPacket) => void;
  public onStatusChange?: () => void;
  public getWorldDiff?: () => BlockEdit[];

  private bc: BroadcastChannel | null = null;
  private tabNonce = Math.random().toString(36).slice(2, 10);
  private localTabPeers = new Set<string>();
  private mqttClients: MqttClient[] = [];
  private mqttBrokerUrls = new Map<MqttClient, string>();
  private ws443Sockets = new Map<string, WebSocket>();
  private relayRtt = new Map<string, number>();
  private bestRelayUrl = '';
  private pingSeq = 0;
  private answeredPingSeqs = new Set<number>();
  private lastRelayProbeAt = 0;
  private edgeWarm = false;
  private edgeProbeInFlight = false;
  private schnorr = new SchnorrIdentity();
  private rtcLinks = new Map<string, RtcPeerLink>();
  private heartbeatWorker: Worker | null = null;

  private joinedAt = Date.now();
  private lastStateSent = 0;
  private lastRelayStateSent = 0;
  private lastMineSent = 0;
  private lastMineStage = -1;
  private lastMineKey = '';
  private msgSeq = 0;
  private seenMsgIds = new Set<string>();
  private seenQueue: string[] = [];
  private observedSyncResponses = new Set<string>();
  private receivedInitialSync = false;

  private lastX = 0.5;
  private lastY = 49.05;
  private lastZ = 7.5;
  private lastYaw = 0;
  private lastPitch = 0;
  private lastHeld = 0;
  private lastSneak = false;
  private lastBlocking = false;
  private lastArmor: [number, number, number, number] = [0, 0, 0, 0];
  private lastOffhandShield = true;
  private lastOffhandId = 220;
  private lastSlimeForm = false;
  private joinedWorld = false;

  constructor(name: string, color: string) {
    let savedTabId = '';
    try {
      if (typeof sessionStorage !== 'undefined') {
        savedTabId = sessionStorage.getItem('horizon_tab_self_id') || '';
      }
    } catch {
      // sessionStorage unavailable
    }
    if (/^hz_[a-z0-9]{6,14}$/.test(savedTabId)) {
      this.selfId = savedTabId;
    } else {
      this.selfId = 'hz_' + Math.random().toString(36).slice(2, 10);
      try {
        sessionStorage?.setItem('horizon_tab_self_id', this.selfId);
      } catch {
        // ignore
      }
    }
    this.selfName = sanitizePlayerName(name);
    this.selfColor = sanitizeHexColor(color);

    this.initBroadcastChannel();
    this.initPort443Relays();
    this.initSimultaneousMqtt();
    this.initBackgroundSafeHeartbeat();
    if (typeof window !== 'undefined') {
      setTimeout(() => this.measureEdgeHttpPing(), 180);
    }

    if (typeof window !== 'undefined') {
      const sendLeave = () => {
        if (this.joinedWorld) {
          this.sendRaw('leave', { id: this.selfId, name: this.selfName }, 0, true);
        }
      };
      window.addEventListener('pagehide', sendLeave);
      window.addEventListener('beforeunload', sendLeave);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.joinedWorld) {
          this.publishPresenceNow(true);
        }
      });
    }
  }

  public setJoinedWorld(joined: boolean) {
    if (this.joinedWorld === joined) return;
    this.joinedWorld = joined;
    if (joined) {
      this.publishPresenceNow(true);
    } else {
      this.sendRaw('leave', { id: this.selfId, name: this.selfName }, 0, true);
    }
  }

  public updateIdentity(name: string, color: string) {
    this.selfName = sanitizePlayerName(name);
    this.selfColor = sanitizeHexColor(color);
    this.publishPresenceNow(true);
  }

  private rememberMsgId(mid: string): boolean {
    if (this.seenMsgIds.has(mid)) return false;
    this.seenMsgIds.add(mid);
    this.seenQueue.push(mid);
    if (this.seenQueue.length > 1024) {
      const old = this.seenQueue.shift();
      if (old) this.seenMsgIds.delete(old);
    }
    return true;
  }

  private recomputeOnlineFlag() {
    const anyMqtt = this.mqttClients.some((c) => c.connected);
    let anyWs443 = false;
    for (const ws of this.ws443Sockets.values()) {
      if (ws.readyState === 1) {
        anyWs443 = true;
        break;
      }
    }
    const prev = this.connectedGlobal;
    this.connectedGlobal = anyMqtt || anyWs443;
    if (prev !== this.connectedGlobal) {
      this.onStatusChange?.();
    }
  }

  private hasRemoteInternetPeers(): boolean {
    if (this.peers.size === 0) return false;
    for (const pid of this.peers.keys()) {
      if (!this.localTabPeers.has(pid)) return true;
    }
    return false;
  }

  private updateSmoothedPing(sampleMs: number) {
    const clamped = Math.max(2, Math.min(250, Math.round(sampleMs)));
    if (this.currentPing <= 0) {
      this.currentPing = clamped;
    } else if (clamped > this.currentPing * 1.85 + 18) {
      // Dampen transient single-packet jitter spikes while tracking real network latency
      this.currentPing = Math.max(2, Math.round(this.currentPing * 0.85 + clamped * 0.15));
    } else {
      this.currentPing = Math.max(2, Math.round(this.currentPing * 0.72 + clamped * 0.28));
    }
    this.onStatusChange?.();
  }

  private measureEdgeHttpPing(): boolean {
    if (
      typeof window === 'undefined' ||
      typeof fetch !== 'function' ||
      !/^https?:$/i.test(window.location?.protocol || '')
    ) {
      return false;
    }
    if (this.edgeProbeInFlight) return true;
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    if (!baseUrl) return false;

    const runTimedHead = () => {
      this.edgeProbeInFlight = true;
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      fetch(`${baseUrl}?hzp=${Date.now().toString(36)}_${++this.pingSeq}`, {
        method: 'HEAD',
        cache: 'no-store'
      })
        .then((res) => {
          this.edgeProbeInFlight = false;
          if (res.ok || res.status === 304 || res.status === 204) {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.updateSmoothedPing(Math.max(2, Math.round(now - t0)));
          }
        })
        .catch(() => {
          this.edgeProbeInFlight = false;
        });
    };

    if (!this.edgeWarm) {
      this.edgeProbeInFlight = true;
      fetch(baseUrl, { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          this.edgeWarm = true;
          this.edgeProbeInFlight = false;
          runTimedHead();
        })
        .catch(() => {
          this.edgeProbeInFlight = false;
        });
      return true;
    }

    runTimedHead();
    return true;
  }

  private isRelayConnected(url: string): boolean {
    if (!url) return false;
    const ws = this.ws443Sockets.get(url);
    if (ws && ws.readyState === 1) return true;
    for (const c of this.mqttClients) {
      if (c.connected && this.mqttBrokerUrls.get(c) === url) return true;
    }
    return false;
  }

  private selectBestConnectedRelayUrl(): string {
    let bestUrl = '';
    let bestRtt = Infinity;
    for (const [url, rtt] of this.relayRtt.entries()) {
      if (!this.isRelayConnected(url)) continue;
      if (rtt < bestRtt) {
        bestRtt = rtt;
        bestUrl = url;
      }
    }
    if (this.bestRelayUrl && this.isRelayConnected(this.bestRelayUrl)) {
      const curRtt = this.relayRtt.get(this.bestRelayUrl);
      if (curRtt !== undefined && (!bestUrl || bestRtt + 12 >= curRtt)) {
        return this.bestRelayUrl;
      }
    }
    if (bestUrl) this.bestRelayUrl = bestUrl;
    return this.bestRelayUrl;
  }

  private sendSingleRelayProbe(targetUrl: string, seq: number, t0: number): boolean {
    const payload = { id: this.selfId, seq, t0, ro: 0, _m: `${this.selfId}:${++this.msgSeq}` };
    const ws = this.ws443Sockets.get(targetUrl);
    if (ws && ws.readyState === 1) {
      try {
        const rtcFrame = JSON.stringify({ _k: `ping/${this.selfId}`, _p: payload });
        const ev = this.schnorr.signEphemeral(ROOM_ID, rtcFrame);
        ws.send(JSON.stringify(['EVENT', ev]));
        return true;
      } catch {
        return false;
      }
    }
    for (const c of this.mqttClients) {
      if (c.connected && this.mqttBrokerUrls.get(c) === targetUrl) {
        try {
          c.publish(`${TOPIC_PREFIX}/ping/${this.selfId}`, JSON.stringify(payload), { qos: 0 });
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  private initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel('horizon_global_server_v3');
        this.bc.onmessage = (ev) => {
          if (ev.data && ev.data.kind && ev.data.payload) {
            if (ev.data.kind === '_tab_probe') {
              if (ev.data.payload.id === this.selfId && ev.data.payload.nonce !== this.tabNonce) {
                try {
                  this.bc?.postMessage({
                    kind: '_tab_conflict',
                    payload: { id: this.selfId, targetNonce: ev.data.payload.nonce },
                    local: 1
                  });
                } catch {
                  // ignore
                }
              }
              return;
            }
            if (ev.data.kind === '_tab_conflict') {
              if (ev.data.payload.targetNonce === this.tabNonce && ev.data.payload.id === this.selfId) {
                this.selfId = 'hz_' + Math.random().toString(36).slice(2, 10);
                try {
                  sessionStorage?.setItem('horizon_tab_self_id', this.selfId);
                } catch {
                  // ignore
                }
                this.publishPresenceNow(true);
              }
              return;
            }
            if (ev.data.local && typeof ev.data.payload.id === 'string' && ev.data.payload.id !== this.selfId) {
              this.localTabPeers.add(ev.data.payload.id.slice(0, 28));
            }
            this.handleIncoming(ev.data.kind, ev.data.payload, 'local');
          }
        };
        this.bc.postMessage({ kind: '_tab_probe', payload: { id: this.selfId, nonce: this.tabNonce }, local: 1 });
      }
    } catch {
      // BroadcastChannel unavailable
    }
  }

  private initPort443Relays() {
    if (typeof WebSocket === 'undefined') return;
    for (const url of WSS_PORT_443_RELAYS) {
      this.connectSingle443Relay(url);
    }
  }

  private connectSingle443Relay(url: string) {
    try {
      const ws = new WebSocket(url);
      this.ws443Sockets.set(url, ws);

      ws.onopen = () => {
        this.recomputeOnlineFlag();
        const subFilter = { kinds: [25050], '#t': [ROOM_ID], since: Math.floor(Date.now() / 1000) - 10 };
        try {
          ws.send(JSON.stringify(['REQ', 'hz_global', subFilter]));
        } catch {
          // Ignore
        }
        setTimeout(() => {
          if (ws.readyState === 1) {
            this.publishPresenceNow(true);
            if (!this.receivedInitialSync) {
              this.sendRaw('sync_req', { id: this.selfId, ts: Date.now() }, 0, true);
            }
            this.sendPingProbe();
          }
        }, 150);
      };

      ws.onmessage = (ev) => {
        try {
          const arr = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
          if (Array.isArray(arr) && arr[0] === 'EVENT' && arr[2]?.content) {
            const inner = JSON.parse(arr[2].content);
            if (inner && typeof inner._k === 'string' && inner._p) {
              this.handleIncoming(inner._k, inner._p, url);
            }
          }
        } catch {
          // Ignore malformed relay frame
        }
      };

      const scheduleReconnect = () => {
        this.recomputeOnlineFlag();
        setTimeout(() => {
          const cur = this.ws443Sockets.get(url);
          if (!cur || cur.readyState >= 2) {
            this.connectSingle443Relay(url);
          }
        }, 3500);
      };

      ws.onclose = scheduleReconnect;
      ws.onerror = () => {
        try { ws.close(); } catch { /* ignore */ }
      };
    } catch {
      // Ignore
    }
  }

  private initSimultaneousMqtt() {
    for (const url of WSS_MQTT_BROKERS) {
      try {
        const client = mqtt.connect(url, {
          clientId: `${this.selfId}_${Math.floor(Math.random() * 99999)}`,
          clean: true,
          connectTimeout: 6000,
          reconnectPeriod: 5000,
          keepalive: 30
        });
        this.mqttClients.push(client);
        this.mqttBrokerUrls.set(client, url);

        client.on('connect', () => {
          this.recomputeOnlineFlag();
          client.subscribe(`${TOPIC_PREFIX}/#`, { qos: 0 });
          if (!this.receivedInitialSync) {
            this.sendRaw('sync_req', { id: this.selfId, ts: Date.now() }, 0, true);
          }
          this.sendPingProbe();
          this.publishPresenceNow(true);
          this.onStatusChange?.();
        });

        client.on('message', (topic, buf) => {
          try {
            const kind = topic.slice(TOPIC_PREFIX.length + 1);
            const payload = JSON.parse(buf.toString());
            this.handleIncoming(kind, payload, url);
          } catch {
            // Ignore
          }
        });

        client.on('offline', () => this.recomputeOnlineFlag());
        client.on('close', () => this.recomputeOnlineFlag());
        client.on('error', () => this.recomputeOnlineFlag());
      } catch {
        // Ignore broker init failure
      }
    }
  }

  private initBackgroundSafeHeartbeat() {
    // Web Worker timer NEVER pauses when browser tab is in background / Alt+Tabbed to Discord!
    try {
      if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        const blob = new Blob(['setInterval(()=>postMessage(1),1800);'], { type: 'application/javascript' });
        this.heartbeatWorker = new Worker(URL.createObjectURL(blob));
        this.heartbeatWorker.onmessage = () => this.housekeep();
        return;
      }
    } catch {
      // Fallback to standard setInterval
    }
    setInterval(() => this.housekeep(), 1800);
  }

  // ============================================================================
  // Automatic WebRTC P2P Mesh Upgrade (<20ms Direct DataChannel + Relay Fallback)
  // ============================================================================
  private ensureRtcPeer(peerId: string) {
    if (typeof RTCPeerConnection === 'undefined') return;
    if (this.rtcLinks.has(peerId)) return;
    // Deterministic initiator: lower lexical ID offers!
    if (this.selfId > peerId) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const fast = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
    const rel = pc.createDataChannel('rel', { ordered: true });
    const link: RtcPeerLink = { pc, fast, rel, connected: false };
    this.rtcLinks.set(peerId, link);
    this.wireRtcLink(peerId, link);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          this.sendRaw('rtc_sig', { id: this.selfId, to: peerId, sdp: pc.localDescription }, 0, true);
        }
      })
      .catch(() => this.cleanupRtcLink(peerId));
  }

  private wireRtcLink(peerId: string, link: RtcPeerLink) {
    const bindDc = (dc: RTCDataChannel) => {
      dc.onopen = () => {
        link.connected = true;
      };
      dc.onclose = () => {
        link.connected = false;
      };
      dc.onmessage = (ev) => {
        try {
          const obj = JSON.parse(String(ev.data));
          if (obj && typeof obj._k === 'string' && obj._p) {
            if (obj._k === 'rtc_ping' && typeof obj._p.t0 === 'number') {
              try {
                dc.send(JSON.stringify({ _k: 'rtc_pong', _p: { id: this.selfId, seq: obj._p.seq, t0: obj._p.t0 } }));
              } catch {
                // Ignore
              }
              return;
            }
            if (obj._k === 'rtc_pong' && typeof obj._p.t0 === 'number') {
              const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
              const seq = Number(obj._p.seq) || 0;
              if (seq > 0) this.answeredPingSeqs.add(seq);
              this.updateSmoothedPing(Math.max(1, (now - obj._p.t0) * 0.5));
              return;
            }
            this.handleIncoming(obj._k, obj._p, 'rtc');
          }
        } catch {
          // Ignore
        }
      };
    };

    if (link.fast) bindDc(link.fast);
    if (link.rel) bindDc(link.rel);

    link.pc.ondatachannel = (ev) => {
      if (ev.channel.label === 'fast') link.fast = ev.channel;
      else link.rel = ev.channel;
      bindDc(ev.channel);
    };

    link.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendRaw('rtc_sig', { id: this.selfId, to: peerId, ice: ev.candidate.toJSON() }, 0, true);
      }
    };

    link.pc.onconnectionstatechange = () => {
      const st = link.pc.connectionState;
      if (st === 'failed' || st === 'closed' || st === 'disconnected') {
        this.cleanupRtcLink(peerId);
      }
    };
  }

  private handleRtcSignal(peerId: string, p: Record<string, any>) {
    if (typeof RTCPeerConnection === 'undefined') return;
    if (p.to !== this.selfId) return;

    let link = this.rtcLinks.get(peerId);
    if (p.sdp) {
      const desc = p.sdp as RTCSessionDescriptionInit;
      if (desc.type === 'offer') {
        if (link) this.cleanupRtcLink(peerId);
        const pc = new RTCPeerConnection(RTC_CONFIG);
        link = { pc, fast: null, rel: null, connected: false };
        this.rtcLinks.set(peerId, link);
        this.wireRtcLink(peerId, link);
        pc.setRemoteDescription(desc)
          .then(() => pc.createAnswer())
          .then((ans) => pc.setLocalDescription(ans))
          .then(() => {
            if (pc.localDescription) {
              this.sendRaw('rtc_sig', { id: this.selfId, to: peerId, sdp: pc.localDescription }, 0, true);
            }
          })
          .catch(() => this.cleanupRtcLink(peerId));
      } else if (desc.type === 'answer' && link) {
        link.pc.setRemoteDescription(desc).catch(() => {});
      }
    } else if (p.ice && link) {
      link.pc.addIceCandidate(p.ice).catch(() => {});
    }
  }

  private cleanupRtcLink(peerId: string) {
    const link = this.rtcLinks.get(peerId);
    if (!link) return;
    this.rtcLinks.delete(peerId);
    try { link.fast?.close(); } catch { /* ignore */ }
    try { link.rel?.close(); } catch { /* ignore */ }
    try { link.pc.close(); } catch { /* ignore */ }
  }

  private pickFastestMqttClient(): MqttClient | null {
    let best: MqttClient | null = null;
    let bestRtt = Infinity;
    for (const client of this.mqttClients) {
      if (!client.connected) continue;
      const url = this.mqttBrokerUrls.get(client) || '';
      const rtt = this.relayRtt.get(url) ?? 120;
      if (rtt < bestRtt) {
        bestRtt = rtt;
        best = client;
      }
    }
    return best;
  }

  private pickFastestWs443(): WebSocket | null {
    let best: WebSocket | null = null;
    let bestRtt = Infinity;
    for (const [url, ws] of this.ws443Sockets.entries()) {
      if (ws.readyState !== 1) continue;
      const rtt = this.relayRtt.get(url) ?? 140;
      if (rtt < bestRtt) {
        bestRtt = rtt;
        best = ws;
      }
    }
    return best;
  }

  private sendRaw(kind: string, payload: Record<string, unknown>, qos: 0 | 1 = 0, forceRelays = false) {
    const mid = `${this.selfId}:${++this.msgSeq}`;
    const packet = { ...payload, _m: mid };
    this.rememberMsgId(mid);

    // 1. Local BroadcastChannel (<1ms same-device instant bus)
    try {
      this.bc?.postMessage({ kind, payload: packet, local: 1 });
    } catch {
      // Ignore
    }

    const isFast = kind === 'state' || kind === 'swing' || kind === 'mine';
    const hasRemote = this.hasRemoteInternetPeers();

    // When solo or only same-device local tabs exist, skip non-forced 16Hz internet relay spam
    // (periodic forced presence heartbeats still announce us globally every 1.4s!)
    if (!forceRelays && isFast && !hasRemote) {
      return;
    }

    // 2. Direct WebRTC DataChannels to all connected remote peers
    let allRemotePeersCoveredByRtc = hasRemote;
    const rtcFrame = JSON.stringify({ _k: kind, _p: packet });

    for (const [pid] of this.peers) {
      if (this.localTabPeers.has(pid)) continue;
      const link = this.rtcLinks.get(pid);
      const ch = isFast ? (link?.fast?.readyState === 'open' ? link.fast : link?.rel) : link?.rel;
      if (link && ch && ch.readyState === 'open') {
        try {
          ch.send(rtcFrame);
        } catch {
          allRemotePeersCoveredByRtc = false;
        }
      } else {
        allRemotePeersCoveredByRtc = false;
      }
    }

    // If high-frequency movement/mining packet is already delivered via WebRTC to all remote peers,
    // skip public relay copies completely to eliminate upload congestion!
    if (!forceRelays && isFast && allRemotePeersCoveredByRtc) {
      return;
    }

    // 3. MQTT-over-WSS: use fastest single broker for high-frequency non-forced packets, all brokers for reliable/discovery!
    const jsonStr = JSON.stringify(packet);
    if (!forceRelays && isFast) {
      const fastMqtt = this.pickFastestMqttClient();
      if (fastMqtt) {
        try {
          fastMqtt.publish(`${TOPIC_PREFIX}/${kind}`, jsonStr, { qos });
        } catch {
          // Ignore
        }
      }
      const fastWs = this.pickFastestWs443();
      if (fastWs) {
        try {
          const ev = this.schnorr.signEphemeral(ROOM_ID, rtcFrame);
          fastWs.send(JSON.stringify(['EVENT', ev]));
        } catch {
          // Ignore
        }
      }
      return;
    }

    for (const client of this.mqttClients) {
      if (client.connected) {
        try {
          client.publish(`${TOPIC_PREFIX}/${kind}`, jsonStr, { qos });
        } catch {
          // Ignore
        }
      }
    }

    // 4. Simultaneous Port-443 WSS Relays (Ephemeral NIP-16 kind 25050)
    let signedFrame: string | null = null;
    for (const ws of this.ws443Sockets.values()) {
      if (ws.readyState === 1) {
        if (!signedFrame) {
          const ev = this.schnorr.signEphemeral(ROOM_ID, rtcFrame);
          signedFrame = JSON.stringify(['EVENT', ev]);
        }
        try {
          ws.send(signedFrame);
        } catch {
          // Ignore
        }
      }
    }
  }

  private sendPingProbe() {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const seq = ++this.pingSeq;
    if (this.answeredPingSeqs.size > 64) {
      const first = this.answeredPingSeqs.values().next().value;
      if (first !== undefined) this.answeredPingSeqs.delete(first);
    }

    // 1. Direct WebRTC DataChannels to active remote internet peers (lowest latency P2P path)
    let sentRtcProbe = false;
    const probeFrame = JSON.stringify({ _k: 'rtc_ping', _p: { id: this.selfId, seq, t0 } });
    for (const [pid] of this.peers) {
      if (this.localTabPeers.has(pid)) continue;
      const link = this.rtcLinks.get(pid);
      const dc = link?.fast?.readyState === 'open' ? link.fast : link?.rel?.readyState === 'open' ? link.rel : null;
      if (dc) {
        try {
          dc.send(probeFrame);
          sentRtcProbe = true;
        } catch {
          // Ignore
        }
      }
    }
    if (sentRtcProbe) {
      if (t0 - this.lastRelayProbeAt > 16000) {
        this.lastRelayProbeAt = t0;
        this.sendRaw(`ping/${this.selfId}`, { id: this.selfId, seq, t0, ro: 1 }, 0, true);
      }
      return;
    }

    // 2. Real Nearest CDN Edge HTTP/2-QUIC RTT + Relay Ranking (never fake 1ms; never US MQTT queue jitter!)
    const usedEdgeHttp = this.measureEdgeHttpPing();
    if (!this.connectedGlobal) return;

    const bestUrl = this.selectBestConnectedRelayUrl();
    if (!bestUrl || t0 - this.lastRelayProbeAt > 16000) {
      this.lastRelayProbeAt = t0;
      this.sendRaw(`ping/${this.selfId}`, { id: this.selfId, seq, t0, ro: usedEdgeHttp || bestUrl ? 1 : 0 }, 0, true);
    }
    if (bestUrl && !usedEdgeHttp) {
      this.sendSingleRelayProbe(bestUrl, seq, t0);
    }
  }

  public publishPresenceNow(forceRelays = false) {
    if (!this.joinedWorld) return;
    const hasAr = this.lastArmor[0] || this.lastArmor[1] || this.lastArmor[2] || this.lastArmor[3];
    this.sendRaw(
      'state',
      {
        id: this.selfId,
        n: this.selfName,
        c: this.selfColor,
        dm: this.selfDim,
        x: +this.lastX.toFixed(2),
        y: +this.lastY.toFixed(2),
        z: +this.lastZ.toFixed(2),
        yw: +this.lastYaw.toFixed(3),
        pt: +this.lastPitch.toFixed(3),
        h: this.lastHeld,
        sn: this.lastSneak ? 1 : 0,
        bl: this.lastBlocking ? 1 : 0,
        sh: this.lastOffhandShield ? 1 : 0,
        oh: this.lastOffhandId,
        ...(this.lastSlimeForm ? { sl: 1 } : {}),
        ...(hasAr ? { ar: this.lastArmor } : {}),
        pg: this.currentPing
      },
      0,
      forceRelays
    );
  }

  public broadcastState(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    held: number,
    sneak: boolean,
    dim: DimensionId = 'overworld',
    blocking = false,
    armor: [number, number, number, number] = [0, 0, 0, 0],
    offhandShield = false,
    offhandId = 0,
    slimeForm = false
  ) {
    this.lastX = x;
    this.lastY = y;
    this.lastZ = z;
    this.lastYaw = yaw;
    this.lastPitch = pitch;
    this.lastHeld = held;
    this.lastSneak = sneak;
    this.lastBlocking = blocking;
    this.lastArmor = armor;
    this.lastOffhandShield = offhandShield;
    this.lastOffhandId = offhandId;
    this.lastSlimeForm = slimeForm;
    this.selfDim = dim;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastStateSent < 60) return;
    this.lastStateSent = now;

    // Force relay broadcast at least every 1400ms so newly joining players always discover us immediately!
    const forceRelay = now - this.lastRelayStateSent > 1400;
    if (forceRelay) this.lastRelayStateSent = now;
    this.publishPresenceNow(forceRelay);
  }

  public broadcastSwing() {
    this.sendRaw('swing', { id: this.selfId });
  }

  public broadcastHurt() {
    this.sendRaw('hurt', { id: this.selfId }, 0, true);
  }

  public broadcastMine(
    wx: number,
    y: number,
    wz: number,
    stage: number,
    blockId: number,
    nx = 0,
    ny = 1,
    nz = 0,
    dim: DimensionId = 'overworld'
  ) {
    const key = `${wx},${y},${wz},${dim}`;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (stage < 0) {
      if (this.lastMineStage < 0) return;
      this.lastMineStage = -1;
      this.lastMineKey = '';
      this.sendRaw('mine', { id: this.selfId, wx, y, wz, st: -1, bid: blockId, nx, ny, nz, dm: dim }, 0, true);
      return;
    }
    if (key === this.lastMineKey && stage === this.lastMineStage && now - this.lastMineSent < 210) {
      return;
    }
    this.lastMineKey = key;
    this.lastMineStage = stage;
    this.lastMineSent = now;
    this.sendRaw('mine', { id: this.selfId, wx, y, wz, st: stage, bid: blockId, nx, ny, nz, dm: dim });
  }

  public broadcastProjectile(
    kind: 'arrow' | 'pearl' | 'snowball' | 'trident' | 'wind_charge',
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    speed: number,
    dim: DimensionId = 'overworld'
  ) {
    this.sendRaw(
      'proj',
      {
        id: this.selfId,
        k: kind,
        x: +x.toFixed(2),
        y: +y.toFixed(2),
        z: +z.toFixed(2),
        dx: +dx.toFixed(3),
        dy: +dy.toFixed(3),
        dz: +dz.toFixed(3),
        sp: +speed.toFixed(1),
        dm: dim
      },
      0,
      true
    );
  }

  public broadcastTnt(wx: number, y: number, wz: number, dim: DimensionId) {
    this.sendRaw('tnt', { id: this.selfId, wx, y, wz, dm: dim }, 1, true);
  }

  public broadcastWorldEvent(ev: Record<string, unknown>) {
    this.sendRaw('wev', { id: this.selfId, ...ev }, 1, true);
  }

  public broadcastBlockEdit(wx: number, y: number, wz: number, blockId: number, dim: DimensionId = 'overworld') {
    this.sendRaw('block', { id: this.selfId, lv: 1, e: [[wx, y, wz, blockId, dim]] }, 1, true);
  }

  public broadcastBlockEditsBatch(edits: BlockEdit[], isLiveAction = true) {
    if (!edits.length) return;
    // Chunk into batches of 350 edits so large explosions/structures never exceed relay frame caps
    for (let i = 0; i < edits.length; i += 350) {
      const slice = edits.slice(i, i + 350).map((d) => [d.wx, d.y, d.wz, d.blockId, d.dim || 'overworld']);
      this.sendRaw('block', { id: this.selfId, lv: isLiveAction ? 1 : 0, e: slice }, 1, true);
    }
  }

  public broadcastChat(text: string) {
    const cleanText = String(text || '').trim().slice(0, 180);
    if (!cleanText) return;
    const msg: ChatPacket = {
      sender: this.selfName,
      color: this.selfColor,
      text: cleanText
    };
    this.onChat?.(msg);
    this.sendRaw('chat', { id: this.selfId, ...msg }, 1, true);
  }

  private parseCompactEdits(rawArr: unknown[]): BlockEdit[] {
    const out: BlockEdit[] = [];
    for (const item of rawArr) {
      if (!Array.isArray(item) || item.length < 4) continue;
      const cand: BlockEdit = {
        wx: Number(item[0]),
        y: Number(item[1]),
        wz: Number(item[2]),
        blockId: Number(item[3]),
        dim: sanitizeDim(item[4])
      };
      if (isValidEdit(cand)) out.push(cand);
    }
    return out;
  }

  private handleIncoming(kind: string, p: Record<string, any>, sourceUrl = '') {
    if (!p || typeof p !== 'object') return;

    if (kind === `ping/${this.selfId}` && p.id === this.selfId && typeof p.t0 === 'number') {
      if (!sourceUrl || sourceUrl === 'local') return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const rtt = Math.max(4, Math.round(now - p.t0));
      if (sourceUrl !== 'rtc') {
        const prev = this.relayRtt.get(sourceUrl);
        this.relayRtt.set(sourceUrl, prev !== undefined ? Math.round(prev * 0.65 + rtt * 0.35) : rtt);
        this.selectBestConnectedRelayUrl();
      }
      const seq = Number(p.seq) || 0;
      if (!p.ro && (seq === 0 || !this.answeredPingSeqs.has(seq))) {
        if (this.bestRelayUrl && sourceUrl !== 'rtc' && sourceUrl !== this.bestRelayUrl) {
          return;
        }
        if (seq > 0) this.answeredPingSeqs.add(seq);
        this.updateSmoothedPing(Math.max(4, Math.round(rtt * 0.5)));
      }
      return;
    }

    // Track if someone already answered a newcomer's sync_req so we don't duplicate
    if (kind.startsWith('sync_res/')) {
      const targetReqId = kind.slice('sync_res/'.length);
      this.observedSyncResponses.add(targetReqId);
    }

    if (typeof p._m === 'string' && !this.rememberMsgId(p._m)) {
      return;
    }

    if (p.id === this.selfId || typeof p.id !== 'string') return;
    const peerId = p.id.slice(0, 28);

    if (kind === 'rtc_sig') {
      this.handleRtcSignal(peerId, p);
      return;
    }

    if (kind === 'state') {
      const now = Date.now();
      const x = Number.isFinite(Number(p.x)) ? Number(p.x) : 0.5;
      const y = Number.isFinite(Number(p.y)) ? Number(p.y) : 49.05;
      const z = Number.isFinite(Number(p.z)) ? Number(p.z) : 7.5;
      const yaw = Number.isFinite(Number(p.yw)) ? Number(p.yw) : 0;
      const pitch = Number.isFinite(Number(p.pt)) ? Number(p.pt) : 0;
      const held = Number.isInteger(Number(p.h)) ? Number(p.h) : 0;
      const ping = Math.max(1, Math.min(999, Math.round(Number(p.pg) || 28)));
      const dim = sanitizeDim(p.dm);
      const rawAr = Array.isArray(p.ar) ? p.ar : [];
      const armor: [number, number, number, number] = [
        Number.isInteger(Number(rawAr[0])) ? Number(rawAr[0]) : 0,
        Number.isInteger(Number(rawAr[1])) ? Number(rawAr[1]) : 0,
        Number.isInteger(Number(rawAr[2])) ? Number(rawAr[2]) : 0,
        Number.isInteger(Number(rawAr[3])) ? Number(rawAr[3]) : 0
      ];
      const offhandShield = !!p.sh;
      const offhandId = Number.isInteger(Number(p.oh)) ? Number(p.oh) : (offhandShield ? 220 : 0);
      const slimeForm = !!p.sl;

      let peer = this.peers.get(peerId);
      if (!peer) {
        peer = {
          id: peerId,
          name: sanitizePlayerName(p.n, 'Oyuncu'),
          color: sanitizeHexColor(p.c),
          dim,
          x,
          y,
          z,
          yaw,
          pitch,
          held,
          sneak: !!p.sn,
          blocking: !!p.bl,
          armor,
          offhandShield,
          offhandId,
          slimeForm,
          lastSeen: now,
          ping
        };
        this.peers.set(peerId, peer);
        this.onPeerJoin?.(peer);
        this.onStatusChange?.();

        // Immediately announce ourselves back so the other player sees us within <100ms!
        this.publishPresenceNow(true);
        this.ensureRtcPeer(peerId);

        // Request world diff if we recently joined and haven't synced yet
        if (!this.receivedInitialSync && Date.now() - this.joinedAt < 20000) {
          this.sendRaw('sync_req', { id: this.selfId, ts: Date.now() }, 0, true);
        }
      } else {
        peer.name = sanitizePlayerName(p.n, peer.name);
        peer.color = sanitizeHexColor(p.c, peer.color);
        peer.dim = dim;
        peer.x = x;
        peer.y = y;
        peer.z = z;
        peer.yaw = yaw;
        peer.pitch = pitch;
        peer.held = held;
        peer.sneak = !!p.sn;
        peer.blocking = !!p.bl;
        peer.armor = armor;
        peer.offhandShield = offhandShield;
        peer.offhandId = offhandId;
        peer.slimeForm = slimeForm;
        peer.ping = ping;
        peer.lastSeen = now;
        this.onPeerUpdate?.(peer);
        this.ensureRtcPeer(peerId);
      }
      return;
    }

    // Refresh peer lastSeen on any action packet too
    const activePeer = this.peers.get(peerId);
    if (activePeer) activePeer.lastSeen = Date.now();

    if (kind === 'swing') {
      this.onPeerSwing?.(peerId);
      return;
    }

    if (kind === 'hurt') {
      this.onPeerHurt?.(peerId);
      return;
    }

    if (kind === 'mine') {
      if (Number.isInteger(p.wx) && Number.isInteger(p.y) && Number.isInteger(p.wz)) {
        this.onPeerMine?.({
          peerId,
          wx: p.wx,
          y: p.y,
          wz: p.wz,
          stage: Math.max(-1, Math.min(9, Number(p.st) || 0)),
          blockId: Number(p.bid) || 1,
          nx: Number(p.nx) || 0,
          ny: Number(p.ny) || 1,
          nz: Number(p.nz) || 0,
          dim: sanitizeDim(p.dm)
        });
      }
      return;
    }

    if (kind === 'proj') {
      if (p.k === 'arrow' || p.k === 'pearl' || p.k === 'snowball' || p.k === 'trident' || p.k === 'wind_charge') {
        this.onPeerProjectile?.({
          peerId,
          kind: p.k,
          x: Number(p.x) || 0,
          y: Number(p.y) || 50,
          z: Number(p.z) || 0,
          dx: Number(p.dx) || 0,
          dy: Number(p.dy) || 0,
          dz: Number(p.dz) || -1,
          speed: Number(p.sp) || 24,
          dim: sanitizeDim(p.dm)
        });
      }
      return;
    }

    if (kind === 'tnt') {
      if (Number.isInteger(p.wx) && Number.isInteger(p.y) && Number.isInteger(p.wz)) {
        this.onRemoteTnt?.(p.wx, p.y, p.wz, sanitizeDim(p.dm));
      }
      return;
    }

    if (kind === 'wev') {
      this.onWorldEvent?.(p);
      return;
    }

    if (kind === 'leave') {
      this.cleanupRtcLink(peerId);
      this.localTabPeers.delete(peerId);
      const ex = this.peers.get(peerId);
      if (ex) {
        this.peers.delete(peerId);
        if (!this.hasRemoteInternetPeers()) this.sendPingProbe();
        this.onPeerLeave?.(ex.id, ex.name);
        this.onStatusChange?.();
      }
      return;
    }

    if (kind === 'block' && Array.isArray(p.e)) {
      const edits = this.parseCompactEdits(p.e);
      if (edits.length > 0) this.onBlockEdit?.(edits, !!p.lv);
      return;
    }

    if (kind === 'chat' && typeof p.text === 'string') {
      this.onChat?.({
        sender: sanitizePlayerName(p.sender, 'Oyuncu'),
        color: sanitizeHexColor(p.color, '#a9a9ff'),
        text: String(p.text).slice(0, 180)
      });
      return;
    }

    if (kind === 'sync_req' && this.getWorldDiff) {
      const diff = this.getWorldDiff();
      if (diff.length === 0) return;

      this.observedSyncResponses.delete(peerId);
      // Deterministic jitter based on selfId so lowest-jitter peer answers first & others cancel!
      let hash = 0;
      for (let i = 0; i < this.selfId.length; i++) hash = (hash * 31 + this.selfId.charCodeAt(i)) & 0xff;
      const delayMs = 45 + (hash % 180);

      setTimeout(() => {
        if (this.observedSyncResponses.has(peerId)) return;
        for (let i = 0; i < diff.length; i += 350) {
          const compact = diff.slice(i, i + 350).map((d) => [d.wx, d.y, d.wz, d.blockId, d.dim || 'overworld']);
          this.sendRaw(`sync_res/${peerId}`, { id: this.selfId, e: compact }, 0, true);
        }
      }, delayMs);
      return;
    }

    if (kind === `sync_res/${this.selfId}` && Array.isArray(p.e)) {
      this.receivedInitialSync = true;
      const edits = this.parseCompactEdits(p.e);
      if (edits.length > 0) this.onBlockEdit?.(edits, false);
    }
  }

  private housekeep() {
    const now = Date.now();
    for (const [id, peer] of this.peers.entries()) {
      // 12-second resilient timeout (Web Worker beats every 1.8s in background tabs, while closed tabs clear quickly!)
      if (now - peer.lastSeen > 12000) {
        this.cleanupRtcLink(id);
        this.localTabPeers.delete(id);
        this.peers.delete(id);
        this.onPeerLeave?.(id, peer.name);
        this.onStatusChange?.();
      }
    }
    this.publishPresenceNow(true);
    this.sendPingProbe();
  }

  public destroy() {
    try { this.heartbeatWorker?.terminate(); } catch { /* ignore */ }
    try { this.bc?.close(); } catch { /* ignore */ }
    for (const id of Array.from(this.rtcLinks.keys())) this.cleanupRtcLink(id);
    for (const c of this.mqttClients) {
      try { c.end(true); } catch { /* ignore */ }
    }
    for (const ws of this.ws443Sockets.values()) {
      try { ws.close(); } catch { /* ignore */ }
    }
  }

  public onlineCount(): number {
    return 1 + this.peers.size;
  }
}
