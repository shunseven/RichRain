// ===== 游戏主体 - LeaferJS 游戏板 + 游戏逻辑 =====
import { Leafer, Rect, Text, Ellipse } from 'leafer-ui'
import { store, SYSTEM_ICONS } from './store.js'
import { resolveAllImages } from './imageDB.js'
import {
  initAudio, startBGM, stopBGM, speedUpBGM,
  playDiceRoll, playDiceResult, playStep, playCoinGain, playCoinLoss,
  playStarCollect, playEventTrigger, playRewardEvent, playPunishmentEvent,
  playSystemEvent, playNpcEncounter,
  playMiniGameStart, playMiniGameReveal, playVictory, playGameOver,
  playForwardBoost, playBackwardSlow, playSwap, playTeleport,
  playRollerSpin, playRollerStop, playClick
} from './sound.js'

// === 常量 ===
const BOARD_SIZE = 24
const TILE_W = 88
const ST = 102 // tile step (size + gap)
const TOKEN_R = 15

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// === 3D 骰子辅助 ===
const DICE_DOT_MAP = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function diceFaceHTML(n) {
  const dots = DICE_DOT_MAP[n]
  let html = ''
  for (let i = 0; i < 9; i++) {
    html += `<span class="dice-dot${dots.includes(i) ? ' show' : ''}"></span>`
  }
  return html
}

function dice3DHTML() {
  return `<div class="dice-scene" id="dice-scene">
    <div class="dice-cube" id="dice-cube">
      <div class="dice-face face-front">${diceFaceHTML(1)}</div>
      <div class="dice-face face-back">${diceFaceHTML(6)}</div>
      <div class="dice-face face-right">${diceFaceHTML(2)}</div>
      <div class="dice-face face-left">${diceFaceHTML(5)}</div>
      <div class="dice-face face-top">${diceFaceHTML(3)}</div>
      <div class="dice-face face-bottom">${diceFaceHTML(4)}</div>
    </div>
    <div class="dice-shadow"></div>
  </div>`
}

// 多圈旋转 + 最终偏移 → 展示正确面
// 面配置: front=1, back=6, right=2, left=5, top=3, bottom=4
const DICE_SPIN = {
  1: 'rotateX(720deg) rotateY(1080deg)',
  2: 'rotateX(720deg) rotateY(990deg)',
  3: 'rotateX(630deg) rotateY(1080deg)',
  4: 'rotateX(810deg) rotateY(1080deg)',
  5: 'rotateX(720deg) rotateY(1170deg)',
  6: 'rotateX(720deg) rotateY(1260deg)',
}

// 各面最终目标角度 (mod 360)
const DICE_TARGET = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 270 },
  3: { x: 270, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
}

// === 系统事件定义（每个20%概率，用于系统事件格子） ===
const _sysIcon = (emoji) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="52">${emoji}</text></svg>`)}`
const SYSTEM_EVENTS = [
  { id: 'sys_star_move', name: '⭐ 星星换位置', emoji: '⭐', icon: _sysIcon('⭐'), description: '星星随机移动到新位置！', color: '#ffd700' },
  { id: 'sys_forward_10', name: '🚀 往前走10格', emoji: '🚀', icon: _sysIcon('🚀'), description: '向前冲刺10格！', color: '#00b894' },
  { id: 'sys_backward_5', name: '🐢 往后走5格', emoji: '🐢', icon: _sysIcon('🐢'), description: '后退5格...', color: '#e74c3c' },
  { id: 'sys_swap_player', name: '🔄 和随机角色换位置', emoji: '🔄', icon: _sysIcon('🔄'), description: '与一位随机角色互换位置！', color: '#6c5ce7' },
  { id: 'sys_near_star', name: '🌠 走到星星前两格', emoji: '🌠', icon: _sysIcon('🌠'), description: '瞬移到星星前两格！', color: '#fdcb6e' },
  { id: 'sys_random_pos', name: '🎲 跳到随机位置', emoji: '🎲', icon: _sysIcon('🎲'), description: '随机传送到棋盘任意位置！', color: '#00cec9' },
  { id: 'sys_steal_coins', name: '🕵️ 抽取金币', emoji: '🕵️', icon: _sysIcon('🕵️'), description: '从随机角色身上抽取金币！', color: '#e67e22' },
  { id: 'sys_star_price_up', name: '📈 星星涨价', emoji: '📈', icon: _sysIcon('📈'), description: '场上所有星星价格上涨5金币！', color: '#ff6348' },
  { id: 'sys_star_price_down', name: '📉 星星降价', emoji: '📉', icon: _sysIcon('📉'), description: '场上所有星星价格下降5金币！', color: '#2ed573' },
  { id: 'sys_add_star', name: '🌟 额外星星', emoji: '🌟', icon: _sysIcon('🌟'), description: '场上出现第二颗星星！', color: '#f9ca24' },
  { id: 'sys_get_coin', name: '💰 获得一个金币', emoji: '💰', icon: _sysIcon('💰'), description: '获得一个金币！', color: '#f1c40f' },
]

// === 金币事件池（-3 到 8） ===
const COIN_EVENTS = []
for (let i = -3; i <= 8; i++) {
  const isGain = i >= 0
  COIN_EVENTS.push({
    id: `coin_${i}`,
    name: isGain ? `💰 获得 ${i} 金币` : `💸 失去 ${Math.abs(i)} 金币`,
    icon: _sysIcon(isGain ? '💰' : '💸'),
    amount: i,
  })
}

// === 加码红包事件池（5, 10, 20, 50, 100） ===
const _redPacketIcon = (amount) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="22" y="15" width="56" height="70" rx="5" fill="#e74c3c"/><rect x="22" y="42" width="56" height="8" fill="#c0392b"/><circle cx="50" cy="46" r="14" fill="#f39c12" stroke="#c0392b" stroke-width="2"/><text x="50" y="52" text-anchor="middle" font-size="${amount >= 100 ? 10 : 12}" fill="#c0392b" font-weight="bold">${amount}</text></svg>`)}`
const BONUS_RED_PACKET_POOL = [
  { id: 'bonus_5', name: '5元红包', icon: _redPacketIcon(5), amount: 5 },
  { id: 'bonus_10', name: '10元红包', icon: _redPacketIcon(10), amount: 10 },
  { id: 'bonus_20', name: '20元红包', icon: _redPacketIcon(20), amount: 20 },
  { id: 'bonus_50', name: '50元红包', icon: _redPacketIcon(50), amount: 50 },
  { id: 'bonus_100', name: '100元红包', icon: _redPacketIcon(100), amount: 100 },
]

// === 偷取金币事件池（1 到 8） ===
const STEAL_COIN_EVENTS = []
for (let i = 1; i <= 8; i++) {
  STEAL_COIN_EVENTS.push({
    id: `steal_coin_${i}`,
    name: `💰 抽取 ${i} 金币`,
    icon: _sysIcon('💰'),
    amount: i,
  })
}

// === 棋盘格子位置 ===
function getTilePositions(sx, sy) {
  const p = []
  for (let i = 0; i <= 7; i++) p.push({ x: sx + i * ST, y: sy }) // top 0-7
  for (let i = 1; i <= 5; i++) p.push({ x: sx + 7 * ST, y: sy + i * ST }) // right 8-12
  for (let i = 6; i >= 0; i--) p.push({ x: sx + i * ST, y: sy + 5 * ST }) // bottom 13-19
  for (let i = 4; i >= 1; i--) p.push({ x: sx, y: sy + i * ST }) // left 20-23
  return p
}

// === 棋盘格子类型 ===
const EVENT_TILES = [2, 5, 9, 14, 17, 21]
const SYSTEM_TILES = [3, 10, 15, 22]  // 系统事件格子（每边各一个）
const COIN_TILES = [1, 7, 12, 19]    // 金币格子（每边各一个）

function getTileType(i, npcTiles) {
  if (i === 0) return 'start'
  if (EVENT_TILES.includes(i)) return 'event'
  if (npcTiles.includes(i)) return 'npc'
  if (SYSTEM_TILES.includes(i)) return 'system'
  if (COIN_TILES.includes(i)) return 'coin'
  return 'normal'
}

// === 格子所在棋盘边 ===
function getTileSide(i) {
  if (i >= 0 && i <= 7) return 'top'
  if (i >= 8 && i <= 12) return 'right'
  if (i >= 13 && i <= 19) return 'bottom'
  return 'left' // 20-23
}

// ========================================
// 主游戏函数
// ========================================
export function startGame(container, navigate, totalRounds, diceMode = 'auto', savedState = null) {
  const characters = store.getCharacters()
  if (characters.length === 0) { alert('请先添加至少一个角色！'); navigate('menu'); return }

  const npcs = store.getNpcs()
  
  // 动态计算 NPC 格子：
  // 1. 找出所有已经被占用的格子（起点、事件、系统、金币）
  const occupiedTiles = new Set([0, ...EVENT_TILES, ...SYSTEM_TILES, ...COIN_TILES])
  // 2. 找出所有空闲格子
  const freeTiles = []
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (!occupiedTiles.has(i)) freeTiles.push(i)
  }
  
  // 3. 将 NPC 分配到空闲格子上
  // 如果 NPC 数量多于空闲格子，则只放前面的 NPC
  // 如果 NPC 数量少于空闲格子，则只占用部分空闲格子
  const npcTiles = []
  const npcMap = new Map() // tileIndex -> npc
  
  // 简单打乱空闲格子顺序，让 NPC 分布更随机（可选，这里先顺序填充）
  // freeTiles.sort(() => Math.random() - 0.5)

  for (let i = 0; i < Math.min(npcs.length, freeTiles.length); i++) {
    const tileIdx = freeTiles[i]
    npcTiles.push(tileIdx)
    npcMap.set(tileIdx, npcs[i])
  }

  // 如果不是恢复存档，则重置小游戏次数
  if (!savedState) {
    store.resetMiniGameCounts()
  }

  // 游戏状态 - 如果有存档则从存档恢复，否则新建
  const players = savedState
    ? savedState.players
    : characters.map(c => ({ ...c, coins: 5, stars: 0, position: 0, eventLog: [] }))
  let currentRound = savedState ? savedState.currentRound : 1
  let currentPI = savedState ? savedState.currentPI : 0
  let phase = 'waiting_dice'
  // 使用存档的总轮数和骰子模式（存档优先）
  if (savedState) {
    totalRounds = savedState.totalRounds
    diceMode = savedState.diceMode
  }
  // 星星初始位置 - 随机放在任意格子上
  let starPos = savedState ? savedState.starPos : Math.floor(Math.random() * BOARD_SIZE)

  // 星星价格（可涨价，购买后恢复原价10）
  let starPrice = savedState ? (savedState.starPrice || 10) : 10

  // 加码红包累计
  let bonusRedPacket = savedState ? (savedState.bonusRedPacket || 0) : 0

  // 最后三轮状态
  let starPos2 = savedState ? savedState.starPos2 : -1           // 第二颗星位置 (-1 = 未激活)
  let star2Active = savedState ? savedState.star2Active : false     // 第二颗星是否激活
  let isLastThreeRounds = savedState ? savedState.isLastThreeRounds : false

  // === 保存游戏进度的辅助函数 ===
  function saveProgress() {
    store.saveGameProgress({
      players: players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, coins: p.coins, stars: p.stars, position: p.position, eventLog: p.eventLog })),
      currentRound,
      currentPI,
      totalRounds,
      diceMode,
      starPos,
      starPos2,
      star2Active,
      isLastThreeRounds,
      starPrice,
      bonusRedPacket,
    })
  }

  // ===== DOM 结构 =====
  container.innerHTML = `
    <div class="game-screen">
      <div class="festive-lantern left">🏮</div>
      <div class="festive-lantern right">🏮</div>
      <div class="festive-particles" id="festive-particles"></div>
      <div id="game-canvas" class="game-canvas-container"></div>
      <div id="avatar-overlay" class="avatar-overlay"></div>
      <div id="all-players" class="all-players-panel"></div>
      <div id="game-info" class="game-info-panel"></div>
      <div id="game-hint" class="game-hint"></div>
    </div>`

  // 生成飘落的喜庆粒子
  const particleContainer = document.getElementById('festive-particles')
  const particleEmojis = ['🧧', '✨', '🎊', '💰', '🎆', '🎇', '🌟']
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('span')
    p.className = 'festive-particle'
    p.textContent = particleEmojis[Math.floor(Math.random() * particleEmojis.length)]
    p.style.left = Math.random() * 100 + '%'
    p.style.animationDelay = Math.random() * 8 + 's'
    p.style.animationDuration = (6 + Math.random() * 6) + 's'
    p.style.fontSize = (12 + Math.random() * 14) + 'px'
    p.style.opacity = 0.3 + Math.random() * 0.4
    particleContainer.appendChild(p)
  }

  // ===== LeaferJS 棋盘 =====
  const cw = window.innerWidth, ch = window.innerHeight
  const boardW = 7 * ST + TILE_W, boardH = 5 * ST + TILE_W
  const sx = Math.round((cw - boardW) / 2), sy = Math.round((ch - boardH) / 2) - 10
  const tilePos = getTilePositions(sx, sy)

  const leafer = new Leafer({ view: document.getElementById('game-canvas'), width: cw, height: ch, fill: 'transparent' })

  // 绘制喜庆底纹装饰（散落的金色小圆点 + 星光）
  for (let i = 0; i < 50; i++) {
    const rx = Math.random() * cw, ry = Math.random() * ch
    const size = 3 + Math.random() * 5
    leafer.add(new Ellipse({ x: rx, y: ry, width: size, height: size,
      fill: `rgba(255,215,0,${0.02 + Math.random() * 0.06})`,
      shadow: { x: 0, y: 0, blur: 4 + Math.random() * 6, color: `rgba(255,215,0,${0.03 + Math.random() * 0.05})` }
    }))
  }
  // 棋盘区域底部柔光
  leafer.add(new Rect({
    x: sx - 30, y: sy - 30, width: boardW + 60, height: boardH + 60,
    fill: { type: 'radial', stops: [
      { offset: 0, color: 'rgba(139,0,0,0.08)' },
      { offset: 0.6, color: 'rgba(139,0,0,0.03)' },
      { offset: 1, color: 'rgba(0,0,0,0)' },
    ]},
    cornerRadius: 30
  }))

  // 绘制连接线（路径指引 - 华丽金色光带）
  for (let i = 0; i < BOARD_SIZE; i++) {
    const a = tilePos[i], b = tilePos[(i + 1) % BOARD_SIZE]
    const ax = a.x + TILE_W / 2, ay = a.y + TILE_W / 2, bx = b.x + TILE_W / 2, by = b.y + TILE_W / 2
    // 外层光晕
    leafer.add(new Rect({ x: Math.min(ax, bx) - 4, y: Math.min(ay, by) - 4, width: Math.abs(bx - ax) + 8 || 8, height: Math.abs(by - ay) + 8 || 8,
      fill: 'rgba(255,215,0,0.04)', cornerRadius: 4 }))
    // 主光带
    leafer.add(new Rect({ x: Math.min(ax, bx) - 1.5, y: Math.min(ay, by) - 1.5, width: Math.abs(bx - ax) + 3 || 3, height: Math.abs(by - ay) + 3 || 3,
      fill: { type: 'linear', stops: ['rgba(255,215,0,0.06)', 'rgba(255,215,0,0.18)', 'rgba(255,215,0,0.06)'] }, cornerRadius: 2 }))
  }

  // 绘制格子 - 华丽喜庆新春配色
  const tileColors = {
    normal: {
      grad1: '#3a0e0e', grad2: '#1e0505', s: '#c0392b', s2: '#e74c3c',
      glow: 'rgba(192,57,43,0.2)', glowOuter: 'rgba(192,57,43,0.08)',
      innerGlow: 'rgba(255,100,80,0.06)', highlight: 'rgba(255,180,150,0.12)',
      icon: '', label: '',
    },
    start: {
      grad1: '#4a2000', grad2: '#2a0e00', s: '#ffd700', s2: '#ffe44d',
      glow: 'rgba(255,215,0,0.25)', glowOuter: 'rgba(255,215,0,0.1)',
      innerGlow: 'rgba(255,215,0,0.08)', highlight: 'rgba(255,245,180,0.18)',
      icon: '🧧', label: '起点',
    },
    event: {
      grad1: '#4a1e00', grad2: '#2a0f00', s: '#e67e22', s2: '#f39c12',
      glow: 'rgba(230,126,34,0.22)', glowOuter: 'rgba(230,126,34,0.08)',
      innerGlow: 'rgba(255,180,80,0.07)', highlight: 'rgba(255,220,160,0.15)',
      icon: '❗', label: '事件',
    },
    npc: {
      grad1: '#3a0030', grad2: '#1e0018', s: '#e84393', s2: '#fd79a8',
      glow: 'rgba(232,67,147,0.22)', glowOuter: 'rgba(232,67,147,0.08)',
      innerGlow: 'rgba(255,120,180,0.07)', highlight: 'rgba(255,180,220,0.15)',
      icon: '👥', label: 'NPC',
    },
    system: {
      grad1: '#0a1a3a', grad2: '#050e20', s: '#3498db', s2: '#74b9ff',
      glow: 'rgba(52,152,219,0.25)', glowOuter: 'rgba(52,152,219,0.1)',
      innerGlow: 'rgba(100,180,255,0.08)', highlight: 'rgba(180,220,255,0.16)',
      icon: '⚡', label: '系统',
    },
    coin: {
      grad1: '#3a3000', grad2: '#201a00', s: '#f1c40f', s2: '#f9e547',
      glow: 'rgba(241,196,15,0.25)', glowOuter: 'rgba(241,196,15,0.1)',
      innerGlow: 'rgba(255,220,50,0.08)', highlight: 'rgba(255,240,150,0.18)',
      icon: '💰', label: '金币',
    },
  }

  tilePos.forEach((pos, i) => {
    const type = getTileType(i, npcTiles)
    const c = tileColors[type] || tileColors.normal

    // ① 最外层：柔和大范围光晕
    leafer.add(new Rect({
      x: pos.x - 8, y: pos.y - 8, width: TILE_W + 16, height: TILE_W + 16,
      fill: c.glowOuter, cornerRadius: 20
    }))

    // ② 外发光层
    leafer.add(new Rect({
      x: pos.x - 4, y: pos.y - 4, width: TILE_W + 8, height: TILE_W + 8,
      fill: c.glow, cornerRadius: 16,
      shadow: { x: 0, y: 0, blur: 12, color: c.glow }
    }))

    // ③ 格子主体 - 渐变背景 + 描边 + 阴影
    leafer.add(new Rect({
      x: pos.x, y: pos.y, width: TILE_W, height: TILE_W,
      fill: { type: 'linear', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, stops: [
        { offset: 0, color: c.grad1 },
        { offset: 0.5, color: c.grad2 },
        { offset: 1, color: c.grad1 },
      ]},
      stroke: c.s, strokeWidth: 2.5, cornerRadius: 12,
      shadow: [
        { x: 0, y: 4, blur: 15, color: 'rgba(0,0,0,0.5)' },
        { x: 0, y: 0, blur: 8, color: c.glow },
      ],
      innerShadow: [
        { x: 0, y: 2, blur: 8, color: c.innerGlow },
        { x: 0, y: -1, blur: 4, color: 'rgba(0,0,0,0.3)' },
      ]
    }))

    // ④ 内层装饰边框（双线）
    leafer.add(new Rect({
      x: pos.x + 4, y: pos.y + 4, width: TILE_W - 8, height: TILE_W - 8,
      fill: 'transparent', stroke: `${c.s}30`, strokeWidth: 1, cornerRadius: 9
    }))
    leafer.add(new Rect({
      x: pos.x + 7, y: pos.y + 7, width: TILE_W - 14, height: TILE_W - 14,
      fill: 'transparent', stroke: `${c.s}18`, strokeWidth: 0.5, cornerRadius: 7
    }))

    // ⑤ 顶部高光 - 模拟玻璃质感
    leafer.add(new Rect({
      x: pos.x + 6, y: pos.y + 3, width: TILE_W - 12, height: TILE_W * 0.35,
      fill: { type: 'linear', from: { x: 0.5, y: 0 }, to: { x: 0.5, y: 1 }, stops: [
        { offset: 0, color: c.highlight },
        { offset: 1, color: 'rgba(255,255,255,0)' },
      ]},
      cornerRadius: [8, 8, 20, 20]
    }))

    // ⑥ 四角装饰小点
    const dotSize = 4, dotOff = 10, dotColor = `${c.s}55`
    leafer.add(new Ellipse({ x: pos.x + dotOff, y: pos.y + dotOff, width: dotSize, height: dotSize, fill: dotColor }))
    leafer.add(new Ellipse({ x: pos.x + TILE_W - dotOff - dotSize, y: pos.y + dotOff, width: dotSize, height: dotSize, fill: dotColor }))
    leafer.add(new Ellipse({ x: pos.x + dotOff, y: pos.y + TILE_W - dotOff - dotSize, width: dotSize, height: dotSize, fill: dotColor }))
    leafer.add(new Ellipse({ x: pos.x + TILE_W - dotOff - dotSize, y: pos.y + TILE_W - dotOff - dotSize, width: dotSize, height: dotSize, fill: dotColor }))

    // ⑦ 格子图标（特殊格子）
    if (c.icon) {
      leafer.add(new Text({
        x: pos.x, y: pos.y + 8, width: TILE_W, text: c.icon,
        fill: c.s, fontSize: 26, fontWeight: 'bold', textAlign: 'center'
      }))
    }

    // ⑧ 格子类型文字标签（特殊格子底部）
    if (c.label) {
      leafer.add(new Text({
        x: pos.x, y: pos.y + TILE_W - 24, width: TILE_W,
        text: c.label, fill: `${c.s}aa`, fontSize: 11, fontWeight: 'bold', textAlign: 'center'
      }))
    }

    // ⑨ 普通格子中心装饰纹样
    if (type === 'normal') {
      // 中央菱形装饰
      leafer.add(new Rect({
        x: pos.x + TILE_W / 2 - 8, y: pos.y + TILE_W / 2 - 8,
        width: 16, height: 16,
        fill: 'transparent', stroke: `${c.s}25`, strokeWidth: 1,
        rotation: 45, around: 'center', cornerRadius: 2
      }))
      // 中心小圆点
      leafer.add(new Ellipse({
        x: pos.x + TILE_W / 2 - 2.5, y: pos.y + TILE_W / 2 - 2.5,
        width: 5, height: 5, fill: `${c.s}30`
      }))
    }

    // ⑩ 格子序号 - 更精致
    leafer.add(new Text({
      x: pos.x + 6, y: pos.y + TILE_W - 17,
      text: `${i}`, fill: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '600'
    }))
  })

  // ===== NPC头像覆盖层（根据格子位置突出到对应方向） =====
  const avatarOverlay = document.getElementById('avatar-overlay')
  const NPC_AVATAR_SIZE = 48
  npcTiles.forEach((tileIdx) => {
    const npc = npcMap.get(tileIdx)
    if (!npc) return
    
    const pos = tilePos[tileIdx]
    const side = getTileSide(tileIdx)
    const el = document.createElement('div')
    el.className = 'tile-npc-avatar npc-side-' + side
    el.style.width = NPC_AVATAR_SIZE + 'px'
    el.style.height = NPC_AVATAR_SIZE + 'px'

    // 根据格子所在边决定头像突出方向
    if (side === 'top' || side === 'bottom') {
      // 上边和下边：头像在格子上方
      el.style.left = (pos.x + TILE_W / 2 - NPC_AVATAR_SIZE / 2) + 'px'
      el.style.top = (pos.y - NPC_AVATAR_SIZE / 2 - 2) + 'px'
    } else if (side === 'right') {
      // 右边：头像在格子右侧
      el.style.left = (pos.x + TILE_W - NPC_AVATAR_SIZE / 2 + 2) + 'px'
      el.style.top = (pos.y + TILE_W / 2 - NPC_AVATAR_SIZE / 2) + 'px'
    } else {
      // 左边：头像在格子左侧
      el.style.left = (pos.x - NPC_AVATAR_SIZE / 2 - 2) + 'px'
      el.style.top = (pos.y + TILE_W / 2 - NPC_AVATAR_SIZE / 2) + 'px'
    }

    el.innerHTML = `<img src="${npc.avatar}" alt="${npc.name}"/><span class="npc-name-tag">${npc.name}</span>`
    avatarOverlay.appendChild(el)
  })
  resolveAllImages(avatarOverlay)

  // ===== 星星标记 - 华丽动画版 =====
  const STAR_SIZE = 56
  // 记录星星格子中心坐标（用于动画偏移计算）
  let starBaseX = tilePos[starPos].x, starBaseY = tilePos[starPos].y
  const starCX = () => starBaseX + TILE_W / 2
  const starCY = () => starBaseY + TILE_W / 2

  // ① 外层大光晕（x,y 为左上角）
  const starGlowOuter = new Ellipse({
    x: starCX() - STAR_SIZE * 0.75,
    y: starCY() - STAR_SIZE * 0.75 - 20,
    width: STAR_SIZE * 1.5, height: STAR_SIZE * 1.5,
    fill: { type: 'radial', stops: [
      { offset: 0, color: 'rgba(255,215,0,0.35)' },
      { offset: 0.5, color: 'rgba(255,215,0,0.12)' },
      { offset: 1, color: 'rgba(255,215,0,0)' },
    ]},
    shadow: { x: 0, y: 0, blur: 25, color: 'rgba(255,215,0,0.5)' },
  })
  leafer.add(starGlowOuter)

  // ② 内层光圈
  const starGlowInner = new Ellipse({
    x: starCX() - STAR_SIZE * 0.5,
    y: starCY() - STAR_SIZE * 0.5 - 20,
    width: STAR_SIZE, height: STAR_SIZE,
    fill: { type: 'radial', stops: [
      { offset: 0, color: 'rgba(255,235,100,0.45)' },
      { offset: 0.6, color: 'rgba(255,215,0,0.15)' },
      { offset: 1, color: 'rgba(255,215,0,0)' },
    ]},
  })
  leafer.add(starGlowInner)

  // ③ 环绕光点（8颗小星光围绕星星旋转）
  const SPARKLE_COUNT = 8
  const SPARKLE_ORBIT = 38
  const sparkles = []
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const s = new Ellipse({
      x: 0, y: 0, width: 5, height: 5,
      fill: i % 2 === 0 ? 'rgba(255,235,120,0.9)' : 'rgba(255,200,50,0.7)',
      shadow: { x: 0, y: 0, blur: 6, color: 'rgba(255,215,0,0.6)' },
    })
    leafer.add(s)
    sparkles.push(s)
  }

  // ④ 闪烁粒子（随机飘出的小星星）
  const TWINKLE_COUNT = 6
  const twinkles = []
  for (let i = 0; i < TWINKLE_COUNT; i++) {
    const t = new Text({
      x: 0, y: 0, text: '✦', fontSize: 8 + Math.random() * 6,
      fill: `rgba(255,${200 + Math.floor(Math.random() * 55)},${50 + Math.floor(Math.random() * 100)},0.8)`,
      opacity: 0,
    })
    leafer.add(t)
    twinkles.push({
      el: t,
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * 25,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      drift: 0.8 + Math.random() * 1.2,
    })
  }

  // ⑤ 星星emoji - 居中在格子内（textAlign居中，y偏移让星星视觉居中）
  const STAR_FONT = 40
  const starText = new Text({
    x: starBaseX, y: starCY() - STAR_FONT / 2 - 30,
    width: TILE_W, text: '⭐', fontSize: STAR_FONT, textAlign: 'center',
  })
  leafer.add(starText)

  // ⑥ 价格标签 - 在星星下方
  const starLabel = new Text({
    x: starBaseX, y: starCY() + STAR_FONT / 2 - 8,
    width: TILE_W, text: `${starPrice}💰`, fill: starPrice > 10 ? '#ff6348' : '#ffd700', fontSize: 14,
    fontWeight: 'bold', textAlign: 'center',
  })
  leafer.add(starLabel)

  // ===== 第二颗星星视觉元素（最后三轮激活）=====
  const star2GlowOuter = new Ellipse({
    x: -200, y: -200, width: STAR_SIZE * 1.5, height: STAR_SIZE * 1.5,
    fill: { type: 'radial', stops: [
      { offset: 0, color: 'rgba(255,120,120,0.35)' },
      { offset: 0.5, color: 'rgba(255,120,120,0.12)' },
      { offset: 1, color: 'rgba(255,120,120,0)' },
    ]},
    shadow: { x: 0, y: 0, blur: 25, color: 'rgba(255,120,120,0.5)' },
    opacity: 0,
  })
  leafer.add(star2GlowOuter)

  const star2GlowInner = new Ellipse({
    x: -200, y: -200, width: STAR_SIZE, height: STAR_SIZE,
    fill: { type: 'radial', stops: [
      { offset: 0, color: 'rgba(255,180,100,0.45)' },
      { offset: 0.6, color: 'rgba(255,160,80,0.15)' },
      { offset: 1, color: 'rgba(255,160,80,0)' },
    ]},
    opacity: 0,
  })
  leafer.add(star2GlowInner)

  const star2Text = new Text({
    x: -200, y: -200, width: TILE_W, text: '⭐', fontSize: STAR_FONT, textAlign: 'center',
    opacity: 0,
  })
  leafer.add(star2Text)

  const star2Label = new Text({
    x: -200, y: -200, width: TILE_W, text: `${starPrice}💰`, fill: starPrice > 10 ? '#ff6348' : '#ff6b6b', fontSize: 14,
    fontWeight: 'bold', textAlign: 'center', opacity: 0,
  })
  leafer.add(star2Label)

  // ===== 更新星星价格标签 =====
  function updateStarPriceLabels() {
    const priceText = starPrice <= 0 ? '免费⭐' : `${starPrice}💰`
    const isInflated = starPrice > 10
    const isDiscounted = starPrice < 10
    starLabel.text = priceText
    starLabel.fill = isInflated ? '#ff6348' : isDiscounted ? '#2ed573' : '#ffd700'
    star2Label.text = priceText
    star2Label.fill = isInflated ? '#ff6348' : isDiscounted ? '#2ed573' : '#ff6b6b'
  }

  // ===== 星星综合动画 =====
  let starAnimT = 0
  const starPulseTimer = setInterval(() => {
    starAnimT += 0.06
    const cx = starCX()
    const cy = starCY()

    // --- 呼吸光晕（从中心缩放） ---
    const pulse = Math.sin(starAnimT)
    const outerScale = 1 + pulse * 0.15
    const outerHalf = STAR_SIZE * 0.75
    starGlowOuter.x = cx - outerHalf * outerScale
    starGlowOuter.y = cy - outerHalf * outerScale - 20
    starGlowOuter.width = STAR_SIZE * 1.5 * outerScale
    starGlowOuter.height = STAR_SIZE * 1.5 * outerScale

    const innerScale = 1 + pulse * 0.08
    const innerHalf = STAR_SIZE * 0.5
    starGlowInner.x = cx - innerHalf * innerScale
    starGlowInner.y = cy - innerHalf * innerScale - 20
    starGlowInner.width = STAR_SIZE * innerScale
    starGlowInner.height = STAR_SIZE * innerScale

    // --- 星星上下浮动 ---
    const floatY = Math.sin(starAnimT * 0.8) * 4
    starText.y = cy - STAR_FONT / 2 - 30 + floatY

    // --- 环绕光点旋转 ---
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const baseAngle = (i / SPARKLE_COUNT) * Math.PI * 2
      const angle = baseAngle + starAnimT * 0.8
      const rx = SPARKLE_ORBIT + Math.sin(starAnimT * 1.5 + i) * 4
      const ry = SPARKLE_ORBIT * 0.7 + Math.cos(starAnimT * 1.2 + i) * 3
      sparkles[i].x = cx + Math.cos(angle) * rx - 2.5
      sparkles[i].y = cy - 20 + Math.sin(angle) * ry - 2.5
      sparkles[i].opacity = 0.4 + Math.sin(starAnimT * 3 + i * 1.5) * 0.4
      const sz = 3 + Math.sin(starAnimT * 2 + i) * 2
      sparkles[i].width = sz
      sparkles[i].height = sz
    }

    // --- 闪烁粒子飘散 ---
    for (let i = 0; i < TWINKLE_COUNT; i++) {
      const tw = twinkles[i]
      tw.phase += 0.04
      if (tw.phase > Math.PI * 2) {
        tw.phase = 0
        tw.angle = Math.random() * Math.PI * 2
        tw.radius = 5 + Math.random() * 8
      }
      const progress = tw.phase / (Math.PI * 2)
      const curR = tw.radius + progress * 35
      tw.el.x = cx + Math.cos(tw.angle + progress * 0.5) * curR - 5
      tw.el.y = cy - 20 + Math.sin(tw.angle + progress * 0.5) * curR - 5 + floatY * 0.3
      tw.el.opacity = progress < 0.2 ? progress / 0.2 * 0.8 : (1 - progress) * 0.8
      tw.el.rotation = progress * 180
      const pScale = progress < 0.3 ? 1 : 1 - (progress - 0.3) * 0.7
      tw.el.scaleX = pScale
      tw.el.scaleY = pScale
    }

    // --- 第二颗星星动画 ---
    if (star2Active && starPos2 >= 0) {
      const cx2 = tilePos[starPos2].x + TILE_W / 2
      const cy2 = tilePos[starPos2].y + TILE_W / 2
      const floatY2 = Math.sin(starAnimT * 0.8 + 1) * 4

      // 呼吸光晕
      const pulse2 = Math.sin(starAnimT + 0.5)
      const outer2Scale = 1 + pulse2 * 0.15
      const outer2Half = STAR_SIZE * 0.75
      star2GlowOuter.x = cx2 - outer2Half * outer2Scale
      star2GlowOuter.y = cy2 - outer2Half * outer2Scale - 20
      star2GlowOuter.width = STAR_SIZE * 1.5 * outer2Scale
      star2GlowOuter.height = STAR_SIZE * 1.5 * outer2Scale

      const inner2Scale = 1 + pulse2 * 0.08
      const inner2Half = STAR_SIZE * 0.5
      star2GlowInner.x = cx2 - inner2Half * inner2Scale
      star2GlowInner.y = cy2 - inner2Half * inner2Scale - 20
      star2GlowInner.width = STAR_SIZE * inner2Scale
      star2GlowInner.height = STAR_SIZE * inner2Scale

      // 上下浮动
      star2Text.y = cy2 - STAR_FONT / 2 - 30 + floatY2
    }
  }, 50)

  function moveStarElements(pos) {
    starBaseX = pos.x; starBaseY = pos.y
    const cx = starCX(), cy = starCY()
    starGlowOuter.x = cx - STAR_SIZE * 0.75
    starGlowOuter.y = cy - STAR_SIZE * 0.75 - 20
    starGlowInner.x = cx - STAR_SIZE * 0.5
    starGlowInner.y = cy - STAR_SIZE * 0.5 - 20
    starText.x = pos.x; starText.y = cy - STAR_FONT / 2 - 30
    starLabel.x = pos.x; starLabel.y = cy + STAR_FONT / 2 - 8
  }

  function moveStar() {
    // 星星可以移动到任意格子（排除当前位置和第二颗星位置）
    const candidates = []
    for (let i = 0; i < BOARD_SIZE; i++) { if (i !== starPos && i !== starPos2) candidates.push(i) }
    if (candidates.length === 0) return
    starPos = candidates[Math.floor(Math.random() * candidates.length)]
    moveStarElements(tilePos[starPos])
  }

  // ===== 第二颗星管理函数 =====
  function moveStar2Elements(pos) {
    if (!pos) return
    const cx2 = pos.x + TILE_W / 2
    const cy2 = pos.y + TILE_W / 2
    star2GlowOuter.x = cx2 - STAR_SIZE * 0.75
    star2GlowOuter.y = cy2 - STAR_SIZE * 0.75 - 20
    star2GlowInner.x = cx2 - STAR_SIZE * 0.5
    star2GlowInner.y = cy2 - STAR_SIZE * 0.5 - 20
    star2Text.x = pos.x
    star2Text.y = cy2 - STAR_FONT / 2 - 30
    star2Label.x = pos.x
    star2Label.y = cy2 + STAR_FONT / 2 - 8
  }

  function showStar2(pos) {
    starPos2 = pos
    star2Active = true
    star2GlowOuter.opacity = 1
    star2GlowInner.opacity = 1
    star2Text.opacity = 1
    star2Label.opacity = 1
    moveStar2Elements(tilePos[pos])
  }

  function hideStar2() {
    star2Active = false
    star2GlowOuter.opacity = 0
    star2GlowInner.opacity = 0
    star2Text.opacity = 0
    star2Label.opacity = 0
  }

  // ===== 最后三轮弹窗（5秒后自动消失）=====
  function showLastThreeRoundsPopup() {
    return new Promise(resolve => {
      const ov = document.createElement('div')
      ov.className = 'event-result-overlay'
      ov.innerHTML = `
        <div class="event-result" style="text-align:center">
          <div style="font-size:80px;margin-bottom:15px">🔥</div>
          <div class="event-name" style="color:#ff6b6b;font-size:1.8em">最后三轮！</div>
          <div style="color:rgba(255,255,255,0.9);font-size:1.3em;margin:20px 0">
            ⚡ 游戏进入冲刺阶段 ⚡
          </div>
          <div style="color:rgba(255,215,0,0.9);font-size:1.1em;margin:10px 0;line-height:2">
            ⭐ 场上将出现两颗星星<br/>
            🎵 决战BGM启动！
          </div>
          <div class="continue-hint" style="margin-top:25px;opacity:0.6">5秒后自动关闭...</div>
        </div>`
      document.body.appendChild(ov)
      // 5秒后自动消失
      setTimeout(() => {
        if (ov.parentNode) {
          ov.remove()
          resolve()
        }
      }, 5000)
      // 也支持按 Enter 键或点击屏幕提前关闭
      const closeHandler = () => {
        document.removeEventListener('keydown', keyHandler)
        if (ov.parentNode) {
          ov.removeEventListener('click', closeHandler)
          ov.remove()
          resolve()
        }
      }
      const keyHandler = (e) => {
        if (e.code === 'Enter') closeHandler()
      }
      document.addEventListener('keydown', keyHandler)
      setTimeout(() => ov.addEventListener('click', closeHandler), 300)
      // 5秒后清理监听
      setTimeout(() => {
        document.removeEventListener('keydown', keyHandler)
        if (ov.parentNode) ov.removeEventListener('click', closeHandler)
      }, 5100)
    })
  }

  // ===== 激活最后三轮模式 =====
  async function activateLastThreeRounds() {
    isLastThreeRounds = true
    await showLastThreeRoundsPopup()
    // 加速BGM
    speedUpBGM()
    // 激活第二颗星星（固定在场上）
    const candidates = []
    for (let i = 0; i < BOARD_SIZE; i++) { if (i !== starPos) candidates.push(i) }
    if (candidates.length > 0) {
      showStar2(candidates[Math.floor(Math.random() * candidates.length)])
    }
  }

  // 角色棋子
  const PLAYER_AVATAR_SIZE = 40
  const tokens = players.map((p, idx) => {
    const { x, y } = tokenXY(p.position, idx)
    const el = new Ellipse({ x, y, width: TOKEN_R * 2, height: TOKEN_R * 2, fill: p.color, stroke: '#fff', strokeWidth: 2 })
    leafer.add(el)
    const tx = new Text({ x, y: y + 3, width: TOKEN_R * 2, text: p.name[0], fill: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' })
    leafer.add(tx)
    // 角色头像DOM覆盖层（突出到格子外面）
    const avatarEl = document.createElement('div')
    avatarEl.className = 'tile-player-avatar'
    avatarEl.style.width = PLAYER_AVATAR_SIZE + 'px'
    avatarEl.style.height = PLAYER_AVATAR_SIZE + 'px'
    avatarEl.style.left = (x + TOKEN_R - PLAYER_AVATAR_SIZE / 2) + 'px'
    avatarEl.style.top = (y - PLAYER_AVATAR_SIZE + 4) + 'px'
    avatarEl.style.borderColor = p.color
    avatarEl.innerHTML = `<img src="${p.avatar}"/>`
    avatarOverlay.appendChild(avatarEl)
    return { el, tx, avatarEl }
  })
  resolveAllImages(avatarOverlay)

  function tokenXY(tileIdx, playerIdx) {
    const t = tilePos[tileIdx]
    const sameCount = players.filter(p => p.position === tileIdx).length
    const offsets = sameCount <= 1
      ? [{ dx: TILE_W / 2 - TOKEN_R, dy: TILE_W - TOKEN_R * 2 - 4 }]
      : [{ dx: 6, dy: TILE_W - TOKEN_R * 2 - 4 }, { dx: TILE_W / 2 - TOKEN_R, dy: TILE_W - TOKEN_R * 2 - 4 }, { dx: TILE_W - TOKEN_R * 2 - 6, dy: TILE_W - TOKEN_R * 2 - 4 }]
    const o = offsets[playerIdx % offsets.length]
    return { x: t.x + o.dx, y: t.y + o.dy }
  }

  function refreshTokens() {
    players.forEach((p, i) => {
      const { x, y } = tokenXY(p.position, i)
      tokens[i].el.x = x; tokens[i].el.y = y
      tokens[i].tx.x = x; tokens[i].tx.y = y + 3
      // 更新角色头像覆盖层位置
      tokens[i].avatarEl.style.left = (x + TOKEN_R - PLAYER_AVATAR_SIZE / 2) + 'px'
      tokens[i].avatarEl.style.top = (y - PLAYER_AVATAR_SIZE + 4) + 'px'
    })
  }

  // ===== UI 更新函数 =====
  function updateInfoPanel() {
    const p = players[currentPI]
    const infoEl = document.getElementById('game-info')
    infoEl.innerHTML = `
      <div class="round-info">第 ${currentRound} / ${totalRounds} 轮</div>
      <div class="current-player">
        <div class="player-avatar"><img src="${p.avatar}"/></div>
        <div class="player-stats">
          <div class="player-name" style="color:${p.color}">${p.name}</div>
          <div class="stat"><span class="star">⭐ ${p.stars}</span> <span class="coin">💰 ${p.coins}</span></div>
        </div>
      </div>`
    resolveAllImages(infoEl)
  }

  function updatePlayersPanel() {
    const panelEl = document.getElementById('all-players')
    // 按星星（降序）→ 金币（降序）排序，计算排名
    const sorted = players.map((p, i) => ({ ...p, origIdx: i }))
      .sort((a, b) => b.stars !== a.stars ? b.stars - a.stars : b.coins - a.coins)
    const rankIcons = ['🥇', '🥈', '🥉']
    // 为每个玩家分配排名
    const rankMap = {}
    sorted.forEach((p, i) => { rankMap[p.origIdx] = i })

    panelEl.innerHTML = `
      <div class="ap-title">所有玩家</div>
      ${sorted.map((p, sortIdx) => `
        <div class="ap-item ${p.origIdx === currentPI ? 'active' : ''}">
          <span class="ap-rank">${sortIdx < 3 ? rankIcons[sortIdx] : `<span class="ap-rank-num">${sortIdx + 1}</span>`}</span>
          <div class="ap-avatar"><img src="${p.avatar}"/></div>
          <span>${p.name}</span>
          <span class="ap-stats" style="margin-left:auto"><span class="ap-star">⭐ ${p.stars}</span> <span class="ap-coin">💰 ${p.coins}</span></span>
        </div>`).join('')}`
    resolveAllImages(panelEl)
  }

  function setHint(text) { document.getElementById('game-hint').textContent = text }

  // ===== 3D 骰子动画 =====
  function rollDice(player) {
    if (diceMode === 'external') {
      return rollDiceExternal(player)
    }
    return new Promise(resolve => {
      const result = Math.floor(Math.random() * 6) + 1
      const ov = document.createElement('div'); ov.className = 'dice-overlay'
      const charHTML = player ? `
        <div class="dice-character-info">
          <div class="dice-char-avatar"><img src="${player.avatar}"/></div>
          <div class="dice-char-name" style="color:${player.color}">${player.name}</div>
          <div class="dice-char-label">🎲 摇骰子中...</div>
        </div>` : ''
      ov.innerHTML = `<div class="dice-with-character">${charHTML}${dice3DHTML()}</div>`
      document.body.appendChild(ov)
      if (player) resolveAllImages(ov)
      playDiceRoll()  // 🔊 骰子摇动音效

      const cube = ov.querySelector('#dice-cube')
      const scene = ov.querySelector('#dice-scene')
      // 初始倾斜位置
      cube.style.transform = 'translateZ(-70px) rotateX(15deg) rotateY(-15deg)'
      cube.getBoundingClientRect() // 强制 reflow

      // 动画翻滚到结果面
      requestAnimationFrame(() => {
        cube.style.transition = 'transform 2s cubic-bezier(0.15, 0.8, 0.25, 1)'
        cube.style.transform = `translateZ(-70px) ${DICE_SPIN[result]}`
      })

      // 停稳效果
      setTimeout(() => {
        playDiceResult()  // 🔊 骰子结果音效
        scene.classList.add('settled')
      }, 2000)

      // 移除并返回结果
      setTimeout(() => { ov.remove(); resolve(result) }, 2900)
    })
  }

  // ===== 场外骰子模式（3D版） =====
  function rollDiceExternal(player) {
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'dice-overlay'
      const charHTML = player ? `
        <div class="dice-character-info">
          <div class="dice-char-avatar"><img src="${player.avatar}"/></div>
          <div class="dice-char-name" style="color:${player.color}">${player.name}</div>
          <div class="dice-char-label">🎯 等待输入点数...</div>
        </div>` : ''
      ov.innerHTML = `
        <div class="dice-with-character">
          ${charHTML}
          ${dice3DHTML()}
        </div>
        <div class="dice-input-area">
          <div class="dice-input-hint">🎯 请输入场外骰子点数</div>
          <div class="dice-number-buttons" id="dice-buttons">
            ${[1,2,3,4,5,6].map(n => `<button class="dice-num-btn" data-num="${n}">${n}</button>`).join('')}
          </div>
        </div>`
      document.body.appendChild(ov)
      if (player) resolveAllImages(ov)

      const cube = ov.querySelector('#dice-cube')
      const scene = ov.querySelector('#dice-scene')
      let spinX = 0, spinY = 0

      // 持续旋转翻滚
      cube.style.transform = 'translateZ(-70px) rotateX(0deg) rotateY(0deg)'
      const spinIv = setInterval(() => {
        spinX += 80 + Math.random() * 100
        spinY += 100 + Math.random() * 140
        cube.style.transition = 'transform 0.18s linear'
        cube.style.transform = `translateZ(-70px) rotateX(${spinX}deg) rotateY(${spinY}deg)`
      }, 180)

      function settle(num) {
        clearInterval(spinIv)
        // 计算最终角度：至少再转 1 圈后落到正确面
        const target = DICE_TARGET[num]
        let finalX = spinX + 360
        finalX = finalX - (finalX % 360) + target.x
        if (finalX <= spinX + 180) finalX += 360
        let finalY = spinY + 360
        finalY = finalY - (finalY % 360) + target.y
        if (finalY <= spinY + 180) finalY += 360

        cube.style.transition = 'transform 1.5s cubic-bezier(0.15, 0.8, 0.25, 1)'
        cube.style.transform = `translateZ(-70px) rotateX(${finalX}deg) rotateY(${finalY}deg)`

        const inputArea = ov.querySelector('.dice-input-area')
        if (inputArea) inputArea.style.display = 'none'

        setTimeout(() => {
          playDiceResult()  // 🔊 骰子结果音效
          scene.classList.add('settled')
        }, 1500)

        setTimeout(() => { ov.remove(); resolve(num) }, 2400)
      }

      // 点击数字按钮
      ov.querySelectorAll('.dice-num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          settle(parseInt(btn.dataset.num))
        })
      })

      // 也支持键盘输入 1-6
      const keyHandler = (e) => {
        const num = parseInt(e.key)
        if (num >= 1 && num <= 6) {
          document.removeEventListener('keydown', keyHandler)
          settle(num)
        }
      }
      document.addEventListener('keydown', keyHandler)
    })
  }

  // ===== 事件/NPC滚动器 =====
  function showRoller(title, pool, count = 6, characterInfo = null, characterInfo2 = null) {
    return new Promise(resolve => {
      if (pool.length === 0) { resolve(null); return }
      playRollerSpin()  // 🔊 滚动器旋转音效
      const items = []; const used = new Set()
      while (items.length < Math.min(count, pool.length)) {
        const idx = Math.floor(Math.random() * pool.length)
        if (!used.has(idx)) { used.add(idx); items.push(pool[idx]) }
      }
      const selectedIdx = Math.floor(Math.random() * items.length)
      const ITEM_H = 60, REPEATS = 5
      const all = []; for (let r = 0; r < REPEATS; r++) all.push(...items)
      // 向下滚动：目标在列表前部，起点在列表尾部
      const targetI = 1 * items.length + selectedIdx
      const targetY = targetI * ITEM_H - 130
      const startI = (REPEATS - 1) * items.length
      const startY = startI * ITEM_H - 130

      const charHTML = characterInfo ? `
        <div class="roller-character-info">
          <div class="roller-char-avatar" style="border-color:${characterInfo.color || '#e84393'}; box-shadow: 0 0 20px ${characterInfo.color || '#e84393'}66, 0 4px 15px rgba(0,0,0,0.5)"><img src="${characterInfo.avatar}"/></div>
          <div class="roller-char-name" style="color:${characterInfo.color || '#ffd700'}">${characterInfo.name}</div>
        </div>` : ''

      const char2HTML = characterInfo2 ? `
        <div class="roller-character-info">
          <div class="roller-char-avatar" style="border-color:${characterInfo2.color || '#e84393'}; box-shadow: 0 0 20px ${characterInfo2.color || '#e84393'}66, 0 4px 15px rgba(0,0,0,0.5)"><img src="${characterInfo2.avatar}"/></div>
          <div class="roller-char-name" style="color:${characterInfo2.color || '#ffd700'}">${characterInfo2.name}</div>
        </div>` : ''

      const rollerContainerHTML = `
        <div class="roller-container">
          <div class="roller-highlight"></div>
          <div class="roller-items" id="roller-track">
            ${all.map(it => `<div class="roller-item"><img src="${it.icon}"/><span class="item-label">${it.name}</span></div>`).join('')}
          </div>
        </div>`

      const hasChar = characterInfo || characterInfo2
      const ov = document.createElement('div'); ov.className = 'roller-overlay'
      ov.innerHTML = hasChar
        ? `<div class="roller-title">${title}</div>
           <div class="roller-with-character">${charHTML}${rollerContainerHTML}${char2HTML}</div>`
        : `<div class="roller-title">${title}</div>${rollerContainerHTML}`
      document.body.appendChild(ov)
      resolveAllImages(ov)
      const track = ov.querySelector('#roller-track')
      // 初始位置：显示列表尾部（向下滚动的起点）
      track.style.transform = `translateY(-${startY}px)`
      // 强制浏览器完成初始布局，确保过渡动画可以正常触发
      track.getBoundingClientRect()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = 'transform 3s cubic-bezier(0.15,0.85,0.25,1)'
          // 向下滚动到目标位置（targetY < startY，所以内容向下移动）
          track.style.transform = `translateY(-${targetY}px)`
        })
      })
      setTimeout(() => { playRollerStop(); setTimeout(() => { ov.remove(); resolve(items[selectedIdx]) }, 1200) }, 3100)  // 🔊 滚动器停止音效
    })
  }

  // ===== 事件结果展示（事件不给金币，仅展示） =====
  function showEventResult(event) {
    return new Promise(resolve => {
      let typeLabel = '✨ 奖励事件'
      let typeClass = 'reward'
      if (event.type === 'punishment') {
        typeLabel = '😤 惩罚事件'
        typeClass = 'punishment'
      } else if (event.type === 'assign_task') {
        typeLabel = '📝 指定任务'
        typeClass = 'reward'
      } else if (event.type === 'npc_system') {
        typeLabel = '⚡ NPC系统事件'
        typeClass = 'reward'
      }

      // 🔊 根据事件类型播放不同音效
      if (event.type === 'punishment') playPunishmentEvent(); else playRewardEvent()

      const ov = document.createElement('div'); ov.className = 'event-result-overlay'
      ov.innerHTML = `
        <div class="event-result">
          <div class="event-icon"><img src="${event.icon}"/></div>
          <div class="event-name">${event.name}</div>
          <div class="event-effect ${typeClass}">
            ${typeLabel}
          </div>
          <div style="color:rgba(255,255,255,0.7);margin-top:10px;font-size:1.1em">${event.description || ''}</div>
          <div class="continue-hint" style="margin-top:20px">按 Enter 键或点击屏幕继续</div>
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)
      const closeHandler = () => {
        document.removeEventListener('keydown', keyHandler)
        ov.removeEventListener('click', closeHandler)
        ov.remove()
        resolve()
      }
      const keyHandler = (e) => {
        if (e.code === 'Enter') closeHandler()
      }
      document.addEventListener('keydown', keyHandler)
      setTimeout(() => ov.addEventListener('click', closeHandler), 300)
    })
  }

  // ===== 星星弹窗 =====
  function showStarPopup(player, cost = 10) {
    return new Promise(resolve => {
      playStarCollect()  // 🔊 获得星星音效
      const ov = document.createElement('div'); ov.className = 'star-popup'
      ov.innerHTML = `<div class="star-icon">⭐</div><div class="star-text">${player.name} 获得一颗星！<br/><span style="font-size:0.8em;color:#aaa">-${cost} 金币</span></div>`
      document.body.appendChild(ov)
      setTimeout(() => { ov.remove(); resolve() }, 2000)
    })
  }

  // ===== 金币不足弹窗 =====
  function showNotEnoughCoins(player, cost) {
    return new Promise(resolve => {
      playCoinLoss()
      const ov = document.createElement('div')
      ov.className = 'not-enough-coins-popup'
      ov.innerHTML = `
        <div class="nec-content">
          <div class="nec-icon">💸</div>
          <div class="nec-title">金币不足！</div>
          <div class="nec-detail">需要 ${cost} 💰，当前只有 ${player.coins} 💰</div>
        </div>`
      document.body.appendChild(ov)
      setTimeout(() => { ov.remove(); resolve() }, 1800)
    })
  }

  // ===== 金币弹窗 =====
  function showCoinPopup(player, amount) {
    return new Promise(resolve => {
      const isGain = amount >= 0
      if (isGain) playCoinGain(); else playCoinLoss()  // 🔊 金币获得/失去音效
      const ov = document.createElement('div'); ov.className = 'star-popup'
      ov.innerHTML = `
        <div class="star-icon" style="font-size:60px">${isGain ? '💰' : '💸'}</div>
        <div class="star-text">
          ${player.name} ${isGain ? '获得' : '失去'}了 <span style="color:${isGain ? '#f1c40f' : '#e74c3c'};font-weight:bold">${Math.abs(amount)}</span> 个金币！
          <br/><span style="font-size:0.8em;color:#aaa">当前金币: ${player.coins}</span>
        </div>`
      document.body.appendChild(ov)
      setTimeout(() => { ov.remove(); resolve() }, 2000)
    })
  }

  // ===== 小游戏选择逻辑 =====
  function selectMiniGame() {
    const games = store.getMiniGames()
    let selected

    // 1. 最优先：guaranteeFirst=true 且尚未触发过的游戏（首次概率100%）
    const guaranteeGames = games.filter(g => g.guaranteeFirst && !g.hasTriggered && g.remainingCount > 0)
    if (guaranteeGames.length > 0) {
      selected = guaranteeGames[Math.floor(Math.random() * guaranteeGames.length)]
    } else {
      // 2. 其次：概率100%且剩余次数>0的
      const p100 = games.filter(g => g.probability === 100 && g.remainingCount > 0)
      if (p100.length > 0) {
        selected = p100[Math.floor(Math.random() * p100.length)]
      } else {
        const avail = games.filter(g => g.remainingCount > 0)
        if (avail.length === 0) {
          selected = games[Math.floor(Math.random() * games.length)]
          return { selected, games }
        }
        // 加权随机
        const tw = avail.reduce((s, g) => s + g.probability, 0)
        let r = Math.random() * tw
        selected = avail[0]
        for (const g of avail) { r -= g.probability; if (r <= 0) { selected = g; break } }
      }
    }

    // 更新：减少剩余次数，并标记已触发（用于 guaranteeFirst）
    const updateData = { remainingCount: Math.max(0, selected.remainingCount - 1) }
    if (selected.guaranteeFirst && !selected.hasTriggered) {
      updateData.hasTriggered = true
    }
    store.updateMiniGame(selected.id, updateData)
    return { selected, games }
  }

  function buildMiniGameRoller(allGames, selected) {
    const items = [selected]
    const zeroes = allGames.filter(g => g.remainingCount <= 0 && g.id !== selected.id).slice(0, 2)
    items.push(...zeroes)
    const others = allGames.filter(g => g.id !== selected.id && !zeroes.find(z => z.id === g.id)).sort(() => Math.random() - 0.5)
    while (items.length < 8 && others.length > 0) items.push(others.pop())
    // 随机排列，但记住 selected 的新位置
    const shuffled = items.sort(() => Math.random() - 0.5)
    const si = shuffled.findIndex(g => g.id === selected.id)
    return { items: shuffled, selectedIndex: si }
  }

  // ===== 小游戏结果 + 选择胜者 =====
  function showMiniGameResult(game) {
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'minigame-overlay'
      ov.innerHTML = `
        <div class="minigame-result">
          <div class="mg-icon"><img src="${game.icon}"/></div>
          <div class="mg-name">${game.name}</div>
          <div class="mg-condition">🏆 胜利条件: <span>${game.winCondition}</span></div>
          <div style="color:rgba(255,255,255,0.4);margin-bottom:15px">👆 点击选择胜利者（可多选，最多3人）</div>
          <div class="player-rank-area" id="rank-area">
            ${players.map((p, i) => `
              <div class="rank-player" data-idx="${i}">
                <div class="rank-avatar"><img src="${p.avatar}"/></div>
                <div class="rank-name">${p.name}</div>
                <div class="rank-badge" id="badge-${i}"></div>
              </div>`).join('')}
          </div>
          <button class="btn-confirm-winner" id="btn-confirm-winner" style="margin-top:20px;padding:10px 20px;font-size:1.2em;border-radius:5px;border:none;background:#f1c40f;color:#c0392b;font-weight:bold;cursor:pointer;">确认胜利者</button>
          <div class="rank-instruction" id="rank-inst" style="margin-top:10px;display:none;">按 Enter 键或点击屏幕继续</div>
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)

      const selectedWinners = new Set()
      const btnConfirm = ov.querySelector('#btn-confirm-winner')
      const rankInst = ov.querySelector('#rank-inst')

      const confirmWinner = () => {
        if (selectedWinners.size === 0) {
          alert('请至少选择一位胜利者！')
          return
        }

        playVictory()  // 🔊 胜利音效
        btnConfirm.style.display = 'none'

        // 结算规则
        // 1人胜: 胜者+5, 其余+2
        // 2人胜: 胜者+4, 其余+2
        // 3人胜: 胜者+3, 其余+2
        let winCoins = 5
        if (selectedWinners.size === 2) winCoins = 4
        if (selectedWinners.size === 3) winCoins = 3

        const winners = Array.from(selectedWinners)

        // 显示醒目的金币奖励横幅
        const banner = document.createElement('div')
        banner.className = 'win-coins-banner'
        banner.textContent = `🎉 胜者获得 +${winCoins} 💰 金币！`
        const rankArea = ov.querySelector('#rank-area')
        rankArea.parentNode.insertBefore(banner, rankArea)

        // 金币从上方掉落进头像的动画 + 数字从0滚动到目标值
        const animateCoinDrop = (playerEl, targetCoins, isWinner) => {
          const avatarEl = playerEl.querySelector('.rank-avatar')
          const badge = playerEl.querySelector('.rank-badge')

          // 1. 金币掉落动画：多个💰从头像上方依次掉入
          const dropCount = isWinner ? targetCoins : targetCoins
          for (let k = 0; k < dropCount; k++) {
            const coin = document.createElement('div')
            coin.className = 'coin-drop'
            coin.textContent = '💰'
            coin.style.left = (Math.random() * 30 + 15) + 'px'
            coin.style.top = '0px'
            coin.style.animationDelay = (k * 0.15) + 's'
            playerEl.style.position = 'relative'
            playerEl.style.overflow = 'visible'
            playerEl.appendChild(coin)
            setTimeout(() => coin.remove(), 800 + k * 150)
          }

          // 2. 金币数字从0滚动到目标值
          badge.style.color = isWinner ? '#ffd700' : '#aaa'
          let current = 0
          const prefix = isWinner ? '🏆 +' : '+'
          const suffix = ' 💰'
          badge.textContent = `${prefix}0${suffix}`

          const countInterval = setInterval(() => {
            current++
            badge.textContent = `${prefix}${current}${suffix}`
            if (current >= targetCoins) {
              clearInterval(countInterval)
            }
          }, isWinner ? (800 / targetCoins) : (600 / targetCoins))
        }
        
        // 更新金币和UI
        players.forEach((p, i) => {
          const badge = ov.querySelector(`#badge-${i}`)
          const playerEl = ov.querySelector(`.rank-player[data-idx="${i}"]`)
          
          if (selectedWinners.has(i)) {
            p.coins += winCoins
            playerEl.classList.add('ranked', 'winner')
            playerEl.style.border = '2px solid #ffd700'
            animateCoinDrop(playerEl, winCoins, true)
          } else {
            p.coins += 2
            playerEl.classList.add('ranked')
            playerEl.style.border = 'none'
            animateCoinDrop(playerEl, 2, false)
          }
        })

        rankInst.style.display = 'block'
        rankInst.textContent = '🎊 选择完成！按 Enter 键或点击屏幕继续'

        const closeHandler = () => {
          document.removeEventListener('keydown', keyHandler)
          ov.removeEventListener('click', closeHandler)
          ov.remove()
          resolve()
        }
        const keyHandler = (e) => {
          if (e.code === 'Enter') closeHandler()
        }
        document.addEventListener('keydown', keyHandler)
        // 延迟绑定点击关闭，防止误触和事件冒泡导致的立即关闭
        setTimeout(() => {
          ov.addEventListener('click', closeHandler)
        }, 500)
      }

      ov.querySelectorAll('.rank-player').forEach(el => {
        el.addEventListener('click', () => {
          if (btnConfirm.style.display === 'none') return // Already confirmed

          const idx = parseInt(el.dataset.idx)
          if (selectedWinners.has(idx)) {
            selectedWinners.delete(idx)
            el.classList.remove('selected-winner')
            el.style.border = '2px solid transparent'
          } else {
            if (selectedWinners.size >= 3) {
              alert('最多选择3位胜利者！')
              return
            }
            selectedWinners.add(idx)
            el.classList.add('selected-winner')
            el.style.border = '2px solid #f1c40f'
          }
        })
      })

      btnConfirm.addEventListener('click', confirmWinner)
      
      // 支持 Enter 键确认胜利者
      const enterConfirmHandler = (e) => {
        if (e.code === 'Enter' && btnConfirm.style.display !== 'none') {
           document.removeEventListener('keydown', enterConfirmHandler)
           confirmWinner()
        }
      }
      document.addEventListener('keydown', enterConfirmHandler)
    })
  }

  // ===== 移动角色（前进） =====
  async function movePlayer(pi, steps) {
    const p = players[pi]
    for (let s = 0; s < steps; s++) {
      p.position = (p.position + 1) % BOARD_SIZE
      refreshTokens()
      updateInfoPanel()
      playStep()  // 🔊 移动一步音效
      await sleep(350)
      // 检查星星1
      if (p.position === starPos && p.coins >= starPrice) {
        const cost = starPrice
        p.coins -= cost; p.stars++
        starPrice = 10  // 购买后恢复原价
        updateStarPriceLabels()
        updateInfoPanel(); updatePlayersPanel()
        await showStarPopup(p, cost)
        moveStar()
      } else if (p.position === starPos && p.coins < starPrice) {
        await showNotEnoughCoins(p, starPrice)
      }
      // 检查星星2（最后三轮激活）
      if (star2Active && p.position === starPos2 && p.coins >= starPrice) {
        const cost = starPrice
        p.coins -= cost; p.stars++
        starPrice = 10  // 购买后恢复原价
        updateStarPriceLabels()
        updateInfoPanel(); updatePlayersPanel()
        await showStarPopup(p, cost)
        // 移动星星2到新位置
        const candidates = []
        for (let i = 0; i < BOARD_SIZE; i++) {
          if (i !== starPos && i !== starPos2) candidates.push(i)
        }
        if (candidates.length > 0) {
          showStar2(candidates[Math.floor(Math.random() * candidates.length)])
        }
      } else if (star2Active && p.position === starPos2 && p.coins < starPrice) {
        await showNotEnoughCoins(p, starPrice)
      }
    }
  }

  // ===== 移动角色（后退） =====
  async function movePlayerBack(pi, steps) {
    const p = players[pi]
    for (let s = 0; s < steps; s++) {
      p.position = (p.position - 1 + BOARD_SIZE) % BOARD_SIZE
      refreshTokens()
      updateInfoPanel()
      playStep()  // 🔊 移动一步音效
      await sleep(350)
      // 检查星星1
      if (p.position === starPos && p.coins >= starPrice) {
        const cost = starPrice
        p.coins -= cost; p.stars++
        starPrice = 10  // 购买后恢复原价
        updateStarPriceLabels()
        updateInfoPanel(); updatePlayersPanel()
        await showStarPopup(p, cost)
        moveStar()
      } else if (p.position === starPos && p.coins < starPrice) {
        await showNotEnoughCoins(p, starPrice)
      }
      // 检查星星2（最后三轮激活）
      if (star2Active && p.position === starPos2 && p.coins >= starPrice) {
        const cost = starPrice
        p.coins -= cost; p.stars++
        starPrice = 10  // 购买后恢复原价
        updateStarPriceLabels()
        updateInfoPanel(); updatePlayersPanel()
        await showStarPopup(p, cost)
        // 移动星星2到新位置
        const candidates = []
        for (let i = 0; i < BOARD_SIZE; i++) {
          if (i !== starPos && i !== starPos2) candidates.push(i)
        }
        if (candidates.length > 0) {
          showStar2(candidates[Math.floor(Math.random() * candidates.length)])
        }
      } else if (star2Active && p.position === starPos2 && p.coins < starPrice) {
        await showNotEnoughCoins(p, starPrice)
      }
    }
  }

  // ===== 瞬移角色到指定格子 =====
  async function teleportPlayer(pi, targetPos) {
    const p = players[pi]
    p.position = targetPos
    refreshTokens()
    updateInfoPanel()
    updatePlayersPanel()
    await sleep(500)
  }

  // ===== 系统事件结果展示 =====
  function showSystemEventResult(sysEvent, extraInfo = '') {
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'event-result-overlay'
      ov.innerHTML = `
        <div class="event-result">
          <div style="font-size:80px;margin-bottom:15px">${sysEvent.emoji}</div>
          <div class="event-name" style="color:${sysEvent.color}">${sysEvent.name}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:1.2em;margin:15px 0">${sysEvent.description}</div>
          ${extraInfo ? `<div style="color:${sysEvent.color};font-size:1.1em;margin-bottom:10px">${extraInfo}</div>` : ''}
          <div class="continue-hint" style="margin-top:20px">按 Enter 键或点击屏幕继续</div>
        </div>`
      document.body.appendChild(ov)
      const closeHandler = () => {
        document.removeEventListener('keydown', keyHandler)
        ov.removeEventListener('click', closeHandler)
        ov.remove()
        resolve()
      }
      const keyHandler = (e) => {
        if (e.code === 'Enter') closeHandler()
      }
      document.addEventListener('keydown', keyHandler)
      setTimeout(() => ov.addEventListener('click', closeHandler), 300)
    })
  }

  // ===== 执行系统事件 =====
  async function executeSystemEvent(pi, sysEvent) {
    const p = players[pi]

    switch (sysEvent.id) {
      case 'sys_star_move': {
        await showSystemEventResult(sysEvent, '星星飞走了...')
        moveStar()
        break
      }
      case 'sys_forward_10': {
        await showSystemEventResult(sysEvent, `${p.name} 向前冲刺10格！`)
        playForwardBoost()  // 🔊 前进加速音效
        await movePlayer(pi, 10)
        break
      }
      case 'sys_backward_5': {
        await showSystemEventResult(sysEvent, `${p.name} 被迫后退5格...`)
        playBackwardSlow()  // 🔊 后退减速音效
        await movePlayerBack(pi, 5)
        break
      }
      case 'sys_swap_player': {
        const others = players.filter((_, i) => i !== pi)
        if (others.length === 0) {
          await showSystemEventResult(sysEvent, '没有其他角色可以交换！')
          break
        }
        const target = others[Math.floor(Math.random() * others.length)]
        const targetIdx = players.indexOf(target)
        const tmpPos = p.position
        await showSystemEventResult(sysEvent, `${p.name} 和 ${target.name} 互换位置！`)
        playSwap()  // 🔊 交换位置音效
        p.position = target.position
        target.position = tmpPos
        refreshTokens()
        updateInfoPanel()
        updatePlayersPanel()
        await sleep(500)
        break
      }
      case 'sys_near_star': {
        // 如果有两颗星，选择距离最近的一颗
        let nearestStarPos = starPos
        if (star2Active && starPos2 >= 0) {
          const dist1 = ((starPos - p.position) + BOARD_SIZE) % BOARD_SIZE
          const dist2 = ((starPos2 - p.position) + BOARD_SIZE) % BOARD_SIZE
          nearestStarPos = dist1 <= dist2 ? starPos : starPos2
        }
        const targetPos = (nearestStarPos - 2 + BOARD_SIZE) % BOARD_SIZE
        await showSystemEventResult(sysEvent, `${p.name} 瞬移到星星前两格！`)
        playTeleport()  // 🔊 传送音效
        await teleportPlayer(pi, targetPos)
        break
      }
      case 'sys_random_pos': {
        const randomPos = Math.floor(Math.random() * BOARD_SIZE)
        await showSystemEventResult(sysEvent, `${p.name} 被传送到了第 ${randomPos} 格！`)
        playTeleport()  // 🔊 传送音效
        await teleportPlayer(pi, randomPos)
        break
      }
      case 'sys_star_price_up': {
        const oldPrice = starPrice
        starPrice = Math.min(starPrice + 5, 20)
        updateStarPriceLabels()
        await showSystemEventResult(sysEvent, `星星价格从 ${oldPrice}💰 涨到了 ${starPrice}💰！${starPrice >= 20 ? '（已达上限）' : ''}`)
        break
      }
      case 'sys_star_price_down': {
        const oldPrice = starPrice
        starPrice = Math.max(starPrice - 5, 0)
        updateStarPriceLabels()
        await showSystemEventResult(sysEvent, `星星价格从 ${oldPrice}💰 降到了 ${starPrice}💰！${starPrice <= 0 ? '（免费星星！）' : ''}`)
        break
      }
      case 'sys_add_star': {
        if (star2Active) {
          await showSystemEventResult(sysEvent, '场上已经有两颗星星了！')
        } else {
          const candidates = []
          for (let i = 0; i < BOARD_SIZE; i++) { if (i !== starPos) candidates.push(i) }
          if (candidates.length > 0) {
            showStar2(candidates[Math.floor(Math.random() * candidates.length)])
            await showSystemEventResult(sysEvent, '场上出现了第二颗星星！快去抢吧！')
          }
        }
        break
      }
      case 'sys_get_coin': {
        p.coins += 1
        await showSystemEventResult(sysEvent, `${p.name} 获得了1个金币！当前金币: ${p.coins}`)
        playCoinGain()
        updateInfoPanel(); updatePlayersPanel()
        break
      }
      case 'sys_steal_coins': {
        const others = players.filter((_, i) => i !== pi)
        if (others.length === 0) {
          await showSystemEventResult(sysEvent, '没有其他角色可以抽取！')
          break
        }
        const target = others[Math.floor(Math.random() * others.length)]
        await showSystemEventResult(sysEvent, `准备从 ${target.name} 身上抽取金币！`)
        
        const ev = await showRoller(`从 ${target.name} 抽取金币...`, STEAL_COIN_EVENTS, 6, p, target)
        
        if (ev) {
          const amount = ev.amount
          // 确保不超过对方拥有的金币
          const stolen = Math.min(target.coins, amount)
          
          target.coins -= stolen
          p.coins += stolen
          
          updateInfoPanel(); updatePlayersPanel()
          playCoinGain()
          
          await showSystemEventResult({
            ...sysEvent,
            description: `成功从 ${target.name} 那里抽取了 ${stolen} 金币！`
          })
        }
        break
      }
    }
  }

  // ===== 处理落地格子 =====
  async function handleTileLanding(pi) {
    const p = players[pi]
    const type = getTileType(p.position, npcTiles)
    
    // 每次实时获取最新的事件列表，避免状态残留
    const events = store.getEvents()
    const npcEvents = store.getNpcEvents()

    if (type === 'event' && events.length > 0) {
      // 随机事件格子 → 仅从用户自定义事件中抽取
      setHint('随机事件触发！')
      playEventTrigger()  // 🔊 事件触发音效
      const ev = await showRoller('❗ 随机事件抽取中...', events, Math.min(6, events.length), p)
      if (ev) {
        p.eventLog.push({ category: 'event', name: ev.name, type: ev.type, icon: ev.icon })
        await showEventResult(ev)

        // 检查是否有金币奖励
        if (ev.coins) {
          p.coins += ev.coins
          updateInfoPanel(); updatePlayersPanel()
          await showCoinPopup(p, ev.coins)
        }
      }
    } else if (type === 'system') {
      // 系统事件格子 → 从系统事件中抽取（条件过滤不可用事件）
      const availSysEvents = SYSTEM_EVENTS.filter(e => {
        if (e.id === 'sys_star_price_up' && starPrice >= 20) return false
        if (e.id === 'sys_star_price_down' && starPrice <= 0) return false
        if (e.id === 'sys_add_star' && star2Active) return false
        return true
      })
      setHint('⚡ 系统事件触发！')
      playSystemEvent()  // 🔊 系统事件音效
      const ev = await showRoller('⚡ 系统事件抽取中...', availSysEvents, availSysEvents.length, p)
      if (ev) {
        await executeSystemEvent(pi, ev)
      }
    } else if (type === 'coin') {
      // 金币格子 → 滚动器抽取 -3 到 8 个金币
      setHint('💰 金币事件触发！')
      const ev = await showRoller('💰 金币抽取中...', COIN_EVENTS, Math.min(6, COIN_EVENTS.length), p)
      if (ev) {
        const coinChange = ev.amount
        p.coins += coinChange
        if (p.coins < 0) p.coins = 0
        updateInfoPanel(); updatePlayersPanel()
        await showCoinPopup(p, coinChange)
      }
    } else if (type === 'npc' && npcEvents.length > 0) {
      const npcs = store.getNpcs()
      
      // 修复：确保交互的NPC与地图上显示的NPC一致
      let targetNpc = npcMap.get(p.position)
      if (!targetNpc && npcs.length > 0) {
          // 兜底逻辑
          targetNpc = npcs[Math.floor(Math.random() * npcs.length)]
      }

      const title = targetNpc ? `👥 与${targetNpc.name}互动中...` : '👥 NPC事件抽取中...'
      setHint('NPC事件触发！')
      playNpcEncounter()  // 🔊 NPC遭遇音效
      const ev = await showRoller(title, npcEvents, 6, targetNpc, p)
      if (ev) {
        p.eventLog.push({ category: 'npc', name: ev.name, type: ev.type, icon: ev.icon, npcName: targetNpc ? targetNpc.name : '' })
        await showEventResult(ev)

        // NPC系统事件：再摇一次
        if (ev.type === 'npc_system' && (ev.name.includes('再摇一次') || ev.description.includes('再摇一次')) && targetNpc) {
          setHint(`${targetNpc.name} 正在帮你再摇一次骰子...`)
          await sleep(500)

          // 构造一个临时的NPC玩家对象用于显示
          const npcPlayer = {
             ...p,
             name: targetNpc.name,
             avatar: targetNpc.avatar,
             color: targetNpc.color || p.color
          }

          const dice = await rollDice(npcPlayer)
          setHint(`${targetNpc.name} 摇到了 ${dice}！${p.name} 移动中...`)
          await sleep(300)
          await movePlayer(pi, dice)
          // 递归处理落地事件
          await handleTileLanding(pi)
        }

        // NPC系统事件：加码红包
        if (ev.type === 'npc_system' && (ev.name.includes('加码') || ev.description.includes('加码'))) {
          setHint(`${targetNpc ? targetNpc.name : 'NPC'} 正在加码红包...`)
          await sleep(500)

          const bonusEv = await showRoller(
            `🧧 ${targetNpc ? targetNpc.name : 'NPC'}加码红包抽取中...`,
            BONUS_RED_PACKET_POOL, 5, targetNpc, p
          )
          if (bonusEv) {
            bonusRedPacket += bonusEv.amount
            await showSystemEventResult({
              emoji: '🧧',
              name: `获得${bonusEv.amount}元加码红包！`,
              description: `${targetNpc ? targetNpc.name : 'NPC'}为最终大奖加码了${bonusEv.amount}元红包！`,
              color: '#e74c3c',
            }, `累计加码红包: ${bonusRedPacket}元 🧧`)
          }
        }
      }
    }
  }

  // ===== 小游戏阶段 =====
  async function miniGamePhase() {
    setHint('🎮 小游戏时间！')
    playMiniGameStart()  // 🔊 小游戏开始音效
    await sleep(800)
    const { selected, games } = selectMiniGame()
    const { items, selectedIndex } = buildMiniGameRoller(games, selected)

    if (items.length > 0) {
      const ITEM_H = 60, REPEATS = 5
      const all = []; for (let r = 0; r < REPEATS; r++) all.push(...items)
      const targetI = (REPEATS - 2) * items.length + selectedIndex
      const targetY = targetI * ITEM_H - 130

      const ov = document.createElement('div'); ov.className = 'roller-overlay'
      ov.innerHTML = `
        <div class="roller-title">🎮 抽取小游戏中...</div>
        <div class="roller-container">
          <div class="roller-highlight"></div>
          <div class="roller-items" id="mg-track">
            ${all.map(it => `<div class="roller-item"><img src="${it.icon}"/><span class="item-label">${it.name}</span></div>`).join('')}
          </div>
        </div>
        <div class="mg-players-row">
          ${players.map(p => `
            <div class="mg-player-item">
              <div class="mg-player-avatar" style="border-color:${p.color}"><img src="${p.avatar}"/></div>
              <div class="mg-player-name" style="color:${p.color}">${p.name}</div>
            </div>`).join('')}
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)
      const track = ov.querySelector('#mg-track')
      // 强制浏览器完成初始布局，确保过渡动画可以正常触发
      track.getBoundingClientRect()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = 'transform 3.5s cubic-bezier(0.12,0.88,0.22,1)'
          track.style.transform = `translateY(-${targetY}px)`
        })
      })
      await sleep(3600)
      await sleep(1000)
      ov.remove()
    }

    // 展示选中的游戏并排名
    playMiniGameReveal()  // 🔊 小游戏揭晓音效
    await showMiniGameResult(selected)
    updateInfoPanel(); updatePlayersPanel()
  }

  // ===== 游戏主循环 =====
  async function gameLoop() {
    updateInfoPanel(); updatePlayersPanel()

    // 如果总轮数 ≤ 3，游戏一开始就进入最后三轮模式
    if (!isLastThreeRounds && totalRounds <= 3) {
      await activateLastThreeRounds()
    }

    // 恢复存档时：如果已在最后三轮且第二颗星已激活，恢复显示
    if (savedState && star2Active && starPos2 >= 0) {
      showStar2(starPos2)
    }
    // 恢复存档时：如果已在最后三轮，恢复BGM加速
    if (savedState && isLastThreeRounds) {
      speedUpBGM()
    }

    // 保存初始进度
    saveProgress()

    setHint(`轮到 ${players[currentPI].name}，按 Enter 或点击屏幕摇骰子 🎲`)
    phase = 'waiting_dice'
  }

  // ===== 摇骰子逻辑 =====
  async function handleDiceRoll() {
    if (phase !== 'waiting_dice') return
    phase = 'rolling'
    playClick()  // 🔊 按键音效
    setHint('摇骰子中...')
    const dice = await rollDice(players[currentPI])
    setHint(`${players[currentPI].name} 摇到了 ${dice}！移动中...`)
    await sleep(300)

    // 移动
    phase = 'moving'
    await movePlayer(currentPI, dice)

    // 处理格子事件
    phase = 'event'
    await handleTileLanding(currentPI)

    // 下一个玩家
    currentPI++
    if (currentPI >= players.length) {
      // 一轮结束 → 小游戏
      currentPI = 0
      phase = 'minigame'
      await miniGamePhase()

      // 检查游戏是否结束
      currentRound++
      if (currentRound > totalRounds) {
        phase = 'gameover'
        store.clearGameProgress()  // 🗑️ 游戏正常结束，清除存档
        stopBGM()  // 🔊 停止背景音乐
        playGameOver()  // 🔊 游戏结束音效
        clearInterval(starPulseTimer)  // 清理星星动画
        await sleep(500)
        // 清理事件
        document.removeEventListener('keydown', onKeyDown)
        document.removeEventListener('click', onGameClick)
        navigate('results', { players, bonusRedPacket })
        return
      }

      // 检查是否进入最后三轮
      if (!isLastThreeRounds && currentRound >= totalRounds - 2 && totalRounds > 3) {
        await activateLastThreeRounds()
      }
    }

    // 保存游戏进度
    saveProgress()

    // 继续游戏
    phase = 'waiting_dice'
    updateInfoPanel(); updatePlayersPanel()
    setHint(`轮到 ${players[currentPI].name}，按 Enter 或点击屏幕摇骰子 🎲`)
  }

  // ===== 键盘事件 =====
  async function onKeyDown(e) {
    if (phase === 'waiting_dice' && e.code === 'Enter') {
      await handleDiceRoll()
    }
  }

  // ===== 点击事件 =====
  async function onGameClick(e) {
    // 忽略按钮点击，避免冲突
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return
    // 忽略输入框
    if (e.target.tagName === 'INPUT') return
    
    if (phase === 'waiting_dice') {
      await handleDiceRoll()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('click', onGameClick)

  // 初始化音频并启动背景音乐
  initAudio()
  startBGM()

  // 启动游戏
  gameLoop()
}
