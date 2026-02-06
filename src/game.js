// ===== 游戏主体 - LeaferJS 游戏板 + 游戏逻辑 =====
import { Leafer, Rect, Text, Ellipse } from 'leafer-ui'
import { store, SYSTEM_ICONS } from './store.js'

// === 常量 ===
const BOARD_SIZE = 24
const TILE_W = 66
const ST = 76 // tile step (size + gap)
const TOKEN_R = 11

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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

function getTileType(i) {
  if (i === 0) return 'start'
  if (EVENT_TILES.includes(i)) return 'event'
  if (NPC_TILES.includes(i)) return 'npc'
  return 'normal'
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
  let starPos = 6 // 星星初始位置
  // 确保星星不在特殊格子上
  while (getTileType(starPos) !== 'normal') { starPos = Math.floor(Math.random() * BOARD_SIZE) }

  // ===== DOM 结构 =====
  container.innerHTML = `
    <div class="game-screen">
      <div id="game-canvas" class="game-canvas-container"></div>
      <div id="all-players" class="all-players-panel"></div>
      <div id="game-info" class="game-info-panel"></div>
      <div id="game-hint" class="game-hint"></div>
    </div>`

  // ===== LeaferJS 棋盘 =====
  const cw = window.innerWidth, ch = window.innerHeight
  const boardW = 7 * ST + TILE_W, boardH = 5 * ST + TILE_W
  const sx = Math.round((cw - boardW) / 2), sy = Math.round((ch - boardH) / 2) - 10
  const tilePos = getTilePositions(sx, sy)

  const leafer = new Leafer({ view: document.getElementById('game-canvas'), width: cw, height: ch, fill: '#0a1628' })

  // 绘制连接线（路径指引）
  for (let i = 0; i < BOARD_SIZE; i++) {
    const a = tilePos[i], b = tilePos[(i + 1) % BOARD_SIZE]
    const ax = a.x + TILE_W / 2, ay = a.y + TILE_W / 2, bx = b.x + TILE_W / 2, by = b.y + TILE_W / 2
    leafer.add(new Rect({ x: Math.min(ax, bx) - 1, y: Math.min(ay, by) - 1, width: Math.abs(bx - ax) + 2 || 3, height: Math.abs(by - ay) + 2 || 3, fill: 'rgba(255,215,0,0.08)', cornerRadius: 1 }))
  }

  // 绘制格子
  const tileColors = {
    normal: { f: '#1a2744', s: '#2d4a7a' }, start: { f: '#1a3a2a', s: '#2ecc71' },
    event: { f: '#3a2a1a', s: '#e67e22' }, npc: { f: '#2a1a3a', s: '#9b59b6' },
  }

  tilePos.forEach((pos, i) => {
    const type = getTileType(i)
    const c = tileColors[type] || tileColors.normal
    leafer.add(new Rect({ x: pos.x, y: pos.y, width: TILE_W, height: TILE_W, fill: c.f, stroke: c.s, strokeWidth: 2, cornerRadius: 8 }))
    // 格子标签
    const labels = { start: 'GO', event: '❗', npc: '👤' }
    if (labels[type]) {
      leafer.add(new Text({ x: pos.x, y: pos.y + 6, width: TILE_W, text: labels[type], fill: c.s, fontSize: type === 'start' ? 15 : 18, fontWeight: 'bold', textAlign: 'center' }))
    }
    // 格子序号
    leafer.add(new Text({ x: pos.x + 4, y: pos.y + TILE_W - 14, text: `${i}`, fill: 'rgba(255,255,255,0.15)', fontSize: 9 }))
  })

  // 星星标记
  const starText = new Text({ x: tilePos[starPos].x, y: tilePos[starPos].y + 2, width: TILE_W, text: '⭐', fontSize: 22, textAlign: 'center' })
  leafer.add(starText)
  const starLabel = new Text({ x: tilePos[starPos].x, y: tilePos[starPos].y + 28, width: TILE_W, text: '10💰', fill: '#ffd700', fontSize: 10, textAlign: 'center' })
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
  const tokens = players.map((p, idx) => {
    const { x, y } = tokenXY(p.position, idx)
    const el = new Ellipse({ x, y, width: TOKEN_R * 2, height: TOKEN_R * 2, fill: p.color, stroke: '#fff', strokeWidth: 2 })
    leafer.add(el)
    const tx = new Text({ x, y: y + 2, width: TOKEN_R * 2, text: p.name[0], fill: '#fff', fontSize: 11, fontWeight: 'bold', textAlign: 'center' })
    leafer.add(tx)
    return { el, tx }
  })

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
      tokens[i].tx.x = x; tokens[i].tx.y = y + 2
    })
  }

  // ===== UI 更新函数 =====
  function updateInfoPanel() {
    const p = players[currentPI]
    document.getElementById('game-info').innerHTML = `
      <div class="round-info">第 ${currentRound} / ${totalRounds} 轮</div>
      <div class="current-player">
        <div class="player-avatar"><img src="${p.avatar}"/></div>
        <div class="player-stats">
          <div class="player-name" style="color:${p.color}">${p.name}</div>
          <div class="stat"><span class="coin">💰 ${p.coins}</span> &nbsp; <span class="star">⭐ ${p.stars}</span></div>
        </div>
      </div>`
  }

  function updatePlayersPanel() {
    document.getElementById('all-players').innerHTML = `
      <div class="ap-title">所有玩家</div>
      ${players.map((p, i) => `
        <div class="ap-item ${i === currentPI ? 'active' : ''}">
          <div class="ap-avatar"><img src="${p.avatar}"/></div>
          <span>${p.name}</span>
          <span style="margin-left:auto">💰${p.coins} ⭐${p.stars}</span>
        </div>`).join('')}`
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
      const targetY = targetI * ITEM_H - 120 + ITEM_H / 2

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
      const track = ov.querySelector('#roller-track')
      requestAnimationFrame(() => {
        track.style.transition = 'transform 3s cubic-bezier(0.15,0.85,0.25,1)'
        track.style.transform = `translateY(-${targetY}px)`
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
            ${isReward ? '🎁 奖励事件' : '😤 惩罚事件'}
          </div>
          <div style="color:rgba(255,255,255,0.7);margin-top:10px;font-size:1.1em">${event.description || ''}</div>
          <div class="continue-hint" style="margin-top:20px">按空格键继续</div>
        </div>`
      document.body.appendChild(ov)
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

  // ===== 移动角色 =====
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

  // ===== 处理落地格子（事件不给金币，仅展示事件内容） =====
  async function handleTileLanding(pi) {
    const p = players[pi]
    const type = getTileType(p.position)
    if (type === 'event' && events.length > 0) {
      setHint('随机事件触发！')
      const ev = await showRoller('🎁 随机事件抽取中...', events, 6)
      if (ev) {
        await showEventResult(ev)
      }
    } else if (type === 'npc' && npcEvents.length > 0) {
      const npcs = store.getNpcs()
      const randomNpc = npcs.length > 0 ? npcs[Math.floor(Math.random() * npcs.length)] : null
      const title = randomNpc ? `🤝 与${randomNpc.name}互动中...` : '🤝 NPC事件抽取中...'
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
      const targetY = targetI * ITEM_H - 120 + ITEM_H / 2

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
      const track = ov.querySelector('#mg-track')
      requestAnimationFrame(() => {
        track.style.transition = 'transform 3.5s cubic-bezier(0.12,0.88,0.22,1)'
        track.style.transform = `translateY(-${targetY}px)`
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
