// ===== 主入口 + 路由 =====
import './style.css'
import { store, SYSTEM_ICONS } from './store.js'
import { showCharacterEditor, showNpcEditor, showMiniGameEditor, showEventEditor, showNpcEventEditor, showPrizeEditor } from './editors.js'
import { startGame } from './game.js'

const app = document.getElementById('app')

// 当前屏幕
let currentScreen = 'menu'

// 路由
export function navigate(screen, params = {}) {
  currentScreen = screen
  app.innerHTML = ''

  switch (screen) {
    case 'menu': showMenu(); break
    case 'character-editor': showCharacterEditor(app, navigate); break
    case 'npc-editor': showNpcEditor(app, navigate); break
    case 'minigame-editor': showMiniGameEditor(app, navigate); break
    case 'event-editor': showEventEditor(app, navigate); break
    case 'npc-event-editor': showNpcEventEditor(app, navigate); break
    case 'prize-editor': showPrizeEditor(app, navigate); break
    case 'round-setup': showRoundSetup(); break
    case 'game': startGame(app, navigate, params.rounds); break
    case 'results': showResults(params); break
    default: showMenu()
  }
}

// ===== 主菜单 =====
function showMenu() {
  app.innerHTML = `
    <div class="menu-screen">
      <div class="menu-title">🎉 新春派对大富翁 🎉</div>
      <div class="menu-subtitle">🧧 恭喜发财 · 万事如意 🧧</div>
      <div class="menu-buttons">
        <button class="menu-btn primary" data-action="start">
          <span class="menu-btn-icon">🎲</span>
          开始游戏
        </button>
        <button class="menu-btn" data-action="character-editor">
          <span class="menu-btn-icon">👤</span>
          角色编辑
        </button>
        <button class="menu-btn" data-action="npc-editor">
          <span class="menu-btn-icon">🧓</span>
          NPC编辑
        </button>
        <button class="menu-btn" data-action="minigame-editor">
          <span class="menu-btn-icon">🎮</span>
          小游戏编辑
        </button>
        <button class="menu-btn" data-action="event-editor">
          <span class="menu-btn-icon">🎁</span>
          随机事件编辑
        </button>
        <button class="menu-btn" data-action="npc-event-editor">
          <span class="menu-btn-icon">🤝</span>
          NPC事件编辑
        </button>
        <button class="menu-btn" data-action="prize-editor">
          <span class="menu-btn-icon">🏆</span>
          最终大奖设定
        </button>
      </div>
    </div>
  `

  app.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action
      if (action === 'start') {
        navigate('round-setup')
      } else {
        navigate(action)
      }
    })
  })
}

// ===== 轮数设置 =====
function showRoundSetup() {
  app.innerHTML = `
    <div class="round-setup">
      <h2>🎲 设置游戏轮数</h2>
      <input type="number" id="round-input" min="1" max="50" value="5" />
      <button class="btn-start" id="btn-start-game">开始游戏 🎉</button>
      <button class="btn-back" style="margin-top:15px" id="btn-back-menu">返回菜单</button>
    </div>
  `

  document.getElementById('btn-start-game').addEventListener('click', () => {
    const rounds = parseInt(document.getElementById('round-input').value) || 5
    if (rounds < 1 || rounds > 50) {
      alert('请输入1-50之间的轮数')
      return
    }
    navigate('game', { rounds })
  })

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    navigate('menu')
  })
}

// ===== 结果界面 =====
function showResults(params = {}) {
  const { players = [] } = params
  const prize = store.getFinalPrize()

  // 排序: 星星多的在前，星星相同金币多的在前
  const sorted = [...players].sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars
    return b.coins - a.coins
  })

  app.innerHTML = `
    <div class="result-screen">
      <h1>🏆 游戏结束 🏆</h1>
      <div class="result-list">
        ${sorted.map((p, i) => `
          <div class="result-item">
            <div class="rank-num">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
            <div class="result-avatar"><img src="${p.avatar}" alt="${p.name}"/></div>
            <div class="result-info">
              <div class="result-name">${p.name}</div>
              <div class="result-stats">⭐ ${p.stars} 星  |  💰 ${p.coins} 金币</div>
            </div>
            ${i === 0 ? `<div class="result-prize"><img src="${prize.icon}" title="${prize.name}"/><div style="font-size:0.75em;color:#ffd700;margin-top:4px">${prize.name}</div></div>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn-home" id="btn-go-home">返回主菜单</button>
    </div>
  `

  document.getElementById('btn-go-home').addEventListener('click', () => {
    navigate('menu')
  })
}

// 启动应用
navigate('menu')
