// ===== 游戏主体 - LeaferJS 游戏板 + 游戏逻辑 =====
import { Leafer, Rect, Text, Ellipse } from 'leafer-ui'
import { store, SYSTEM_ICONS } from './store.js'
import { resolveAllImages } from './imageDB.js'

// === 常量 ===
const BOARD_SIZE = 24
const TILE_W = 88
const ST = 102 // tile step (size + gap)
const TOKEN_R = 15

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// === 系统事件定义（每个20%概率，用于系统事件格子） ===
const _sysIcon = (emoji) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="52">${emoji}</text></svg>`)}`
const SYSTEM_EVENTS = [
  { id: 'sys_star_move', name: '⭐ 星星换位置', emoji: '⭐', icon: _sysIcon('⭐'), description: '星星随机移动到新位置！', color: '#ffd700' },
  { id: 'sys_forward_10', name: '🚀 往前走10格', emoji: '🚀', icon: _sysIcon('🚀'), description: '向前冲刺10格！', color: '#00b894' },
  { id: 'sys_backward_5', name: '🐢 往后走5格', emoji: '🐢', icon: _sysIcon('🐢'), description: '后退5格...', color: '#e74c3c' },
  { id: 'sys_swap_player', name: '🔄 和随机角色换位置', emoji: '🔄', icon: _sysIcon('🔄'), description: '与一位随机角色互换位置！', color: '#6c5ce7' },
  { id: 'sys_near_star', name: '🌠 走到星星前两格', emoji: '🌠', icon: _sysIcon('🌠'), description: '瞬移到星星前两格！', color: '#fdcb6e' },
  { id: 'sys_random_pos', name: '🎲 跳到随机位置', emoji: '🎲', icon: _sysIcon('🎲'), description: '随机传送到棋盘任意位置！', color: '#00cec9' },
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
const NPC_TILES = [4, 8, 11, 16, 20, 23]
const SYSTEM_TILES = [3, 10, 15, 22]  // 系统事件格子（每边各一个）
const COIN_TILES = [1, 7, 12, 19]    // 金币格子（每边各一个）

function getTileType(i) {
  if (i === 0) return 'start'
  if (EVENT_TILES.includes(i)) return 'event'
  if (NPC_TILES.includes(i)) return 'npc'
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
export function startGame(container, navigate, totalRounds) {
  const characters = store.getCharacters()
  if (characters.length === 0) { alert('请先添加至少一个角色！'); navigate('menu'); return }

  store.resetMiniGameCounts()
  const events = store.getEvents()
  const npcEvents = store.getNpcEvents()

  // 游戏状态
  const players = characters.map(c => ({ ...c, coins: 5, stars: 0, position: 0 }))
  let currentRound = 1, currentPI = 0, phase = 'waiting_dice'
  // 星星初始位置 - 随机放在普通格子上
  const normalTiles = []
  for (let i = 0; i < BOARD_SIZE; i++) { if (getTileType(i) === 'normal') normalTiles.push(i) }
  let starPos = normalTiles[Math.floor(Math.random() * normalTiles.length)]

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
    const type = getTileType(i)
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
  const npcs = store.getNpcs()
  const NPC_AVATAR_SIZE = 48
  NPC_TILES.forEach((tileIdx, i) => {
    if (npcs.length === 0) return
    const npc = npcs[i % npcs.length]
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

  // 星星标记
  const starText = new Text({ x: tilePos[starPos].x, y: tilePos[starPos].y + 2, width: TILE_W, text: '⭐', fontSize: 28, textAlign: 'center' })
  leafer.add(starText)
  const starLabel = new Text({ x: tilePos[starPos].x, y: tilePos[starPos].y + 34, width: TILE_W, text: '10💰', fill: '#ffd700', fontSize: 13, textAlign: 'center' })
  leafer.add(starLabel)

  function moveStar() {
    const normals = []
    for (let i = 0; i < BOARD_SIZE; i++) { if (getTileType(i) === 'normal' && i !== starPos) normals.push(i) }
    if (normals.length === 0) return
    starPos = normals[Math.floor(Math.random() * normals.length)]
    starText.x = tilePos[starPos].x; starText.y = tilePos[starPos].y + 2
    starLabel.x = tilePos[starPos].x; starLabel.y = tilePos[starPos].y + 28
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
          <div class="stat"><span class="coin">💰 ${p.coins}</span> &nbsp; <span class="star">⭐ ${p.stars}</span></div>
        </div>
      </div>`
    resolveAllImages(infoEl)
  }

  function updatePlayersPanel() {
    const panelEl = document.getElementById('all-players')
    panelEl.innerHTML = `
      <div class="ap-title">所有玩家</div>
      ${players.map((p, i) => `
        <div class="ap-item ${i === currentPI ? 'active' : ''}">
          <div class="ap-avatar"><img src="${p.avatar}"/></div>
          <span>${p.name}</span>
          <span style="margin-left:auto">💰${p.coins} ⭐${p.stars}</span>
        </div>`).join('')}`
    resolveAllImages(panelEl)
  }

  function setHint(text) { document.getElementById('game-hint').textContent = text }

  // ===== 骰子动画 =====
  function rollDice() {
    return new Promise(resolve => {
      const result = Math.floor(Math.random() * 6) + 1
      const ov = document.createElement('div'); ov.className = 'dice-overlay'
      ov.innerHTML = `<div class="dice-display" id="dice-num">1</div>`
      document.body.appendChild(ov)
      const dn = ov.querySelector('#dice-num')
      let count = 0
      const iv = setInterval(() => {
        dn.textContent = Math.floor(Math.random() * 6) + 1
        count++
        if (count >= 22) {
          clearInterval(iv)
          dn.textContent = result; dn.classList.add('settled')
          setTimeout(() => { ov.remove(); resolve(result) }, 900)
        }
      }, 90)
    })
  }

  // ===== 事件/NPC滚动器 =====
  function showRoller(title, pool, count = 6) {
    return new Promise(resolve => {
      if (pool.length === 0) { resolve(null); return }
      const items = []; const used = new Set()
      while (items.length < Math.min(count, pool.length)) {
        const idx = Math.floor(Math.random() * pool.length)
        if (!used.has(idx)) { used.add(idx); items.push(pool[idx]) }
      }
      const selectedIdx = Math.floor(Math.random() * items.length)
      const ITEM_H = 60, REPEATS = 5
      const all = []; for (let r = 0; r < REPEATS; r++) all.push(...items)
      const targetI = (REPEATS - 2) * items.length + selectedIdx
      const targetY = targetI * ITEM_H - 130

      const ov = document.createElement('div'); ov.className = 'roller-overlay'
      ov.innerHTML = `
        <div class="roller-title">${title}</div>
        <div class="roller-container">
          <div class="roller-highlight"></div>
          <div class="roller-items" id="roller-track">
            ${all.map(it => `<div class="roller-item"><img src="${it.icon}"/><span class="item-label">${it.name}</span></div>`).join('')}
          </div>
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)
      const track = ov.querySelector('#roller-track')
      // 强制浏览器完成初始布局，确保过渡动画可以正常触发
      track.getBoundingClientRect()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = 'transform 3s cubic-bezier(0.15,0.85,0.25,1)'
          track.style.transform = `translateY(-${targetY}px)`
        })
      })
      setTimeout(() => { setTimeout(() => { ov.remove(); resolve(items[selectedIdx]) }, 1200) }, 3100)
    })
  }

  // ===== 事件结果展示（事件不给金币，仅展示） =====
  function showEventResult(event) {
    return new Promise(resolve => {
      const isReward = event.type === 'reward'
      const ov = document.createElement('div'); ov.className = 'event-result-overlay'
      ov.innerHTML = `
        <div class="event-result">
          <div class="event-icon"><img src="${event.icon}"/></div>
          <div class="event-name">${event.name}</div>
          <div class="event-effect ${isReward ? 'reward' : 'punishment'}">
            ${isReward ? '✨ 奖励事件' : '😤 惩罚事件'}
          </div>
          <div style="color:rgba(255,255,255,0.7);margin-top:10px;font-size:1.1em">${event.description || ''}</div>
          <div class="continue-hint" style="margin-top:20px">按空格键继续</div>
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)
      const handler = (e) => {
        if (e.code === 'Space') { document.removeEventListener('keydown', handler); ov.remove(); resolve() }
      }
      document.addEventListener('keydown', handler)
    })
  }

  // ===== 星星弹窗 =====
  function showStarPopup(player) {
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'star-popup'
      ov.innerHTML = `<div class="star-icon">⭐</div><div class="star-text">${player.name} 获得一颗星！<br/><span style="font-size:0.8em;color:#aaa">-10 金币</span></div>`
      document.body.appendChild(ov)
      setTimeout(() => { ov.remove(); resolve() }, 2000)
    })
  }

  // ===== 金币弹窗 =====
  function showCoinPopup(player, amount) {
    return new Promise(resolve => {
      const isGain = amount >= 0
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
    // 优先选概率100且剩余次数>0的
    const p100 = games.filter(g => g.probability === 100 && g.remainingCount > 0)
    let selected
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
    store.updateMiniGame(selected.id, { remainingCount: Math.max(0, selected.remainingCount - 1) })
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

  // ===== 小游戏结果 + 排名 =====
  function showMiniGameResult(game) {
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'minigame-overlay'
      ov.innerHTML = `
        <div class="minigame-result">
          <div class="mg-icon"><img src="${game.icon}"/></div>
          <div class="mg-name">${game.name}</div>
          <div class="mg-condition">🏆 胜利条件: <span>${game.winCondition}</span></div>
          <div style="color:rgba(255,255,255,0.4);margin-bottom:15px">请按顺序点击玩家排名（第1名→第2名→...）</div>
          <div class="player-rank-area" id="rank-area">
            ${players.map((p, i) => `
              <div class="rank-player" data-idx="${i}">
                <div class="rank-avatar"><img src="${p.avatar}"/></div>
                <div class="rank-name">${p.name}</div>
                <div class="rank-badge" id="badge-${i}"></div>
              </div>`).join('')}
          </div>
          <div class="rank-instruction" id="rank-inst">👆 点击第 1 名</div>
        </div>`
      document.body.appendChild(ov)
      resolveAllImages(ov)

      const rankings = [] // [{playerIdx, rank}]
      const coins = [5, 3, 1] // 前三名奖励

      ov.querySelectorAll('.rank-player').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx)
          if (el.classList.contains('ranked')) return
          const rank = rankings.length + 1
          rankings.push({ playerIdx: idx, rank })
          el.classList.add('ranked')
          const badge = ov.querySelector(`#badge-${idx}`)
          badge.textContent = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] + ` +${coins[rank - 1] || 0}💰` : `第${rank}名`
          badge.style.color = rank <= 3 ? '#ffd700' : '#aaa'

          // 奖励金币
          if (rank <= 3) { players[idx].coins += coins[rank - 1] }

          if (rankings.length >= players.length) {
            ov.querySelector('#rank-inst').textContent = '排名完成！按空格键继续'
            const handler = (e) => {
              if (e.code === 'Space') { document.removeEventListener('keydown', handler); ov.remove(); resolve() }
            }
            document.addEventListener('keydown', handler)
          } else {
            ov.querySelector('#rank-inst').textContent = `👆 点击第 ${rankings.length + 1} 名`
          }
        })
      })
    })
  }

  // ===== 移动角色（前进） =====
  async function movePlayer(pi, steps) {
    const p = players[pi]
    for (let s = 0; s < steps; s++) {
      p.position = (p.position + 1) % BOARD_SIZE
      refreshTokens()
      updateInfoPanel()
      await sleep(350)
      // 检查星星
      if (p.position === starPos && p.coins >= 10) {
        p.coins -= 10; p.stars++
        updateInfoPanel(); updatePlayersPanel()
        await showStarPopup(p)
        moveStar()
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
      await sleep(350)
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
          <div class="continue-hint" style="margin-top:20px">按空格键继续</div>
        </div>`
      document.body.appendChild(ov)
      const handler = (e) => {
        if (e.code === 'Space') { document.removeEventListener('keydown', handler); ov.remove(); resolve() }
      }
      document.addEventListener('keydown', handler)
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
        await movePlayer(pi, 10)
        break
      }
      case 'sys_backward_5': {
        await showSystemEventResult(sysEvent, `${p.name} 被迫后退5格...`)
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
        p.position = target.position
        target.position = tmpPos
        refreshTokens()
        updateInfoPanel()
        updatePlayersPanel()
        await sleep(500)
        break
      }
      case 'sys_near_star': {
        const targetPos = (starPos - 2 + BOARD_SIZE) % BOARD_SIZE
        await showSystemEventResult(sysEvent, `${p.name} 瞬移到星星前两格！`)
        await teleportPlayer(pi, targetPos)
        break
      }
      case 'sys_random_pos': {
        const randomPos = Math.floor(Math.random() * BOARD_SIZE)
        await showSystemEventResult(sysEvent, `${p.name} 被传送到了第 ${randomPos} 格！`)
        await teleportPlayer(pi, randomPos)
        break
      }
    }
  }

  // ===== 处理落地格子 =====
  async function handleTileLanding(pi) {
    const p = players[pi]
    const type = getTileType(p.position)
    if (type === 'event' && events.length > 0) {
      // 随机事件格子 → 仅从用户自定义事件中抽取
      setHint('随机事件触发！')
      const ev = await showRoller('❗ 随机事件抽取中...', events, Math.min(6, events.length))
      if (ev) {
        await showEventResult(ev)
      }
    } else if (type === 'system') {
      // 系统事件格子 → 从5个系统事件中抽取
      setHint('⚡ 系统事件触发！')
      const ev = await showRoller('⚡ 系统事件抽取中...', SYSTEM_EVENTS, SYSTEM_EVENTS.length)
      if (ev) {
        await executeSystemEvent(pi, ev)
      }
    } else if (type === 'coin') {
      // 金币格子 → 滚动器抽取 -3 到 8 个金币
      setHint('💰 金币事件触发！')
      const ev = await showRoller('💰 金币抽取中...', COIN_EVENTS, Math.min(6, COIN_EVENTS.length))
      if (ev) {
        const coinChange = ev.amount
        p.coins += coinChange
        if (p.coins < 0) p.coins = 0
        updateInfoPanel(); updatePlayersPanel()
        await showCoinPopup(p, coinChange)
      }
    } else if (type === 'npc' && npcEvents.length > 0) {
      const npcs = store.getNpcs()
      const randomNpc = npcs.length > 0 ? npcs[Math.floor(Math.random() * npcs.length)] : null
      const title = randomNpc ? `👥 与${randomNpc.name}互动中...` : '👥 NPC事件抽取中...'
      setHint('NPC事件触发！')
      const ev = await showRoller(title, npcEvents, 6)
      if (ev) {
        await showEventResult(ev)
      }
    }
  }

  // ===== 小游戏阶段 =====
  async function miniGamePhase() {
    setHint('🎮 小游戏时间！')
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
    await showMiniGameResult(selected)
    updateInfoPanel(); updatePlayersPanel()
  }

  // ===== 游戏主循环 =====
  async function gameLoop() {
    updateInfoPanel(); updatePlayersPanel()
    setHint(`轮到 ${players[currentPI].name}，按 Enter 摇骰子 🎲`)
    phase = 'waiting_dice'
  }

  // ===== 键盘事件 =====
  async function onKeyDown(e) {
    if (phase === 'waiting_dice' && e.code === 'Enter') {
      phase = 'rolling'
      setHint('摇骰子中...')
      const dice = await rollDice()
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
          await sleep(500)
          // 清理键盘事件
          document.removeEventListener('keydown', onKeyDown)
          navigate('results', { players })
          return
        }
      }

      // 继续游戏
      phase = 'waiting_dice'
      updateInfoPanel(); updatePlayersPanel()
      setHint(`轮到 ${players[currentPI].name}，按 Enter 摇骰子 🎲`)
    }
  }

  document.addEventListener('keydown', onKeyDown)

  // 启动游戏
  gameLoop()
}
