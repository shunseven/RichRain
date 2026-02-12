// ===== 主入口 + 路由 =====
import './style.css'
import { store, SYSTEM_ICONS } from './store.js'
import { resolveAllImages } from './imageDB.js'
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
    case 'game': startGame(app, navigate, params.rounds, params.diceMode, params.savedState || null); break
    case 'results': showResults(params); break
    default: showMenu()
  }
}

// ===== 主菜单 =====
function showMenu() {
  const hasSave = store.hasGameProgress()
  const savedState = hasSave ? store.getGameProgress() : null

  app.innerHTML = `
    <div class="menu-screen">
      <video id="bg-video" class="bg-video" autoplay loop muted playsinline>
        <source src="/start-bg.mp4" type="video/mp4">
      </video>
      <div class="menu-overlay"></div>
      <div class="volume-control" id="btn-volume" title="开启/关闭声音">🔇</div>
      <button class="clear-cache-btn" id="btn-clear-cache">恢复默认数据</button>
      <div class="menu-super-title">🧧 红包雨3.0 🧧</div>
      <div class="menu-title">🎉 新春派对大富翁 🎉</div>
      <div class="menu-subtitle">🧧 恭喜发财 · 万事如意 🧧</div>
      <div class="menu-buttons">
        ${hasSave ? `
        <button class="menu-btn continue" data-action="continue">
          <span class="menu-btn-icon">▶️</span>
          继续游戏
          <span class="continue-detail">第 ${savedState.currentRound}/${savedState.totalRounds} 轮 · ${savedState.players.length} 位玩家</span>
        </button>
        ` : ''}
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
          <span class="menu-btn-icon">❗</span>
          随机事件编辑
        </button>
        <button class="menu-btn" data-action="npc-event-editor">
          <span class="menu-btn-icon">👥</span>
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
      if (action === 'continue') {
        const saved = store.getGameProgress()
        if (saved) {
          navigate('game', { rounds: saved.totalRounds, diceMode: saved.diceMode, savedState: saved })
        }
      } else if (action === 'start') {
        navigate('round-setup')
      } else {
        navigate(action)
      }
    })
  })

  // 音量控制
  const video = document.getElementById('bg-video')
  const volBtn = document.getElementById('btn-volume')
  if (video && volBtn) {
    // 尝试从 localStorage 读取之前的静音状态，但在自动播放策略下，默认还是先 mute 比较安全，
    // 这里我们只在用户点击时切换
    volBtn.addEventListener('click', () => {
      video.muted = !video.muted
      volBtn.textContent = video.muted ? '🔇' : '🔊'
    })
  }

  const clearBtn = document.getElementById('btn-clear-cache')
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('确定要恢复所有默认数据吗？')) {
        if (confirm('再次确认：此操作会将所有设置恢复为默认值，自定义修改和游戏进度都将丢失！')) {
          store.resetAll()
          location.reload()
        }
      }
    })
  }
}

// ===== 轮数设置 =====
function showRoundSetup() {
  app.innerHTML = `
    <div class="round-setup">
      <video id="bg-video" class="bg-video" autoplay loop muted playsinline>
        <source src="/start-bg.mp4" type="video/mp4">
      </video>
      <div class="volume-control" id="btn-volume" title="开启/关闭声音">🔇</div>
      <div class="round-setup-card">
        <h2>🎲 设置游戏轮数</h2>
        <input type="number" id="round-input" min="1" max="50" value="10" />
        <div class="dice-mode-selector">
          <div class="dice-mode-label">🎲 骰子模式</div>
          <div class="dice-mode-options">
            <button class="dice-mode-btn active" data-mode="auto" id="mode-auto">
              <span class="mode-icon">🤖</span>
              <span class="mode-text">自动摇骰子</span>
              <span class="mode-desc">系统随机摇出点数</span>
            </button>
            <button class="dice-mode-btn" data-mode="external" id="mode-external">
              <span class="mode-icon">🎯</span>
              <span class="mode-text">场外摇骰子</span>
              <span class="mode-desc">手动输入骰子点数</span>
            </button>
          </div>
        </div>
        <button class="btn-start" id="btn-start-game">开始游戏 🎉</button>
        <button class="btn-back" style="margin-top:15px" id="btn-back-menu">返回菜单</button>
      </div>
    </div>
  `

  let diceMode = 'auto'
  const modeButtons = app.querySelectorAll('.dice-mode-btn')
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      diceMode = btn.dataset.mode
    })
  })

  document.getElementById('btn-start-game').addEventListener('click', () => {
    const rounds = parseInt(document.getElementById('round-input').value) || 10
    if (rounds < 1 || rounds > 50) {
      alert('请输入1-50之间的轮数')
      return
    }
    store.clearGameProgress()  // 开始新游戏时清除旧存档
    navigate('game', { rounds, diceMode })
  })

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    navigate('menu')
  })

  // 音量控制
  const video = document.getElementById('bg-video')
  const volBtn = document.getElementById('btn-volume')
  if (video && volBtn) {
    volBtn.addEventListener('click', () => {
      video.muted = !video.muted
      volBtn.textContent = video.muted ? '🔇' : '🔊'
    })
  }
}

// ===== 结果界面 =====
function showResults(params = {}) {
  const { players = [], bonusRedPacket = 0 } = params
  const prize = store.getFinalPrize()

  // 排序: 星星多的在前，星星相同金币多的在前
  const sorted = [...players].sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars
    return b.coins - a.coins
  })

  // 构建每个角色的事件记录HTML
  function buildEventLogHTML(player) {
    const log = player.eventLog || []
    if (log.length === 0) return '<div class="event-log-empty">本局没有触发事件</div>'
    const rewards = log.filter(e => e.type === 'reward')
    const punishments = log.filter(e => e.type === 'punishment')
    let html = ''
    const formatTag = (e, cls) => {
      const label = e.category === 'npc' && e.npcName ? `从${e.npcName}获取「${e.name}」` : e.name
      return `<span class="event-log-tag ${cls}"><img src="${e.icon}" class="event-log-icon"/>${label}</span>`
    }
    if (rewards.length > 0) {
      html += `<div class="event-log-section"><div class="event-log-label reward">✨ 奖励</div><div class="event-log-items">${rewards.map(e => formatTag(e, 'reward')).join('')}</div></div>`
    }
    if (punishments.length > 0) {
      html += `<div class="event-log-section"><div class="event-log-label punishment">😤 惩罚</div><div class="event-log-items">${punishments.map(e => formatTag(e, 'punishment')).join('')}</div></div>`
    }
    return html
  }

  app.innerHTML = `
    <div class="result-screen">
      <video class="bg-video" autoplay loop muted playsinline>
        <source src="/ed-bg.mp4" type="video/mp4">
      </video>
      <div class="result-content">
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
              ${i === 0 ? `<div class="result-prize"><img src="${prize.icon}" title="${prize.name}"/><div style="font-size:0.75em;color:#ffd700;margin-top:4px">${prize.name}${bonusRedPacket > 0 ? `<br/><span style="color:#ff6b6b;font-size:1.1em">+ ${bonusRedPacket}元加码红包 🧧</span>` : ''}</div></div>` : ''}
            </div>
            <div class="result-event-log">${buildEventLogHTML(p)}</div>
          `).join('')}
        </div>
        <button class="btn-home" id="btn-go-home">返回主菜单</button>
      </div>
    </div>
  `

  // 解析 idb: 图片引用
  resolveAllImages(app)

  document.getElementById('btn-go-home').addEventListener('click', () => {
    navigate('menu')
  })
}

// 启动应用
navigate('menu')
