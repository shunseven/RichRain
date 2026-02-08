// ===== 数据存储模块 =====
import { AVATAR_DEFAULT, generateAvatar, GAME_ICONS, EVENT_ICONS, NPC_EVENT_ICONS, SYSTEM_ICONS, CHARACTER_COLORS, NPC_COLORS } from './icons.js'

let uid = Date.now()
const genId = () => `id_${uid++}`

// ===== 默认数据 =====
const DEFAULT_CHARACTERS = [
  { id: genId(), name: '琪琪', avatar: '/roles/qi.png', color: '#e74c3c' },
  { id: genId(), name: '涵涵', avatar: '/roles/han.png', color: '#3498db' },
  { id: genId(), name: '滢滢', avatar: '/roles/ying.png', color: '#2ecc71' },
]

const DEFAULT_NPCS = [
  { id: genId(), name: '爷爷', avatar: '/roles/biao.png', color: '#636e72' },
  { id: genId(), name: '奶奶', avatar: '/roles/ling.png', color: '#b2bec3' },
  { id: genId(), name: '广文', avatar: '/roles/guang.png', color: '#a29bfe' },
  { id: genId(), name: '亦文', avatar: '/roles/yi.png', color: '#fdcb6e' },
  { id: genId(), name: '秋平', avatar: '/roles/ping.png', color: '#e17055' },
  { id: genId(), name: '顺文', avatar: '/roles/shun.png', color: '#00b894' },
  { id: genId(), name: '淑娟', avatar: '/roles/juen.png', color: '#74b9ff' },

]

const DEFAULT_MINIGAMES = [
  { id: genId(), name: '红包雨', icon: GAME_ICONS.hongbaoyu, probability: 100, maxCount: 1, remainingCount: 1, winCondition: '拿到最多钱的人获胜', guaranteeFirst: false, hasTriggered: false },
  { id: genId(), name: '石头剪刀布', icon: GAME_ICONS.shitoujiandaobu, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '最终胜者获胜', guaranteeFirst: false, hasTriggered: false },
  { id: genId(), name: '抽卡比大小', icon: GAME_ICONS.bidaxiao, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '抽到最大数字的人获胜', guaranteeFirst: false, hasTriggered: false },
  { id: genId(), name: '保龄球', icon: GAME_ICONS.baolingqiu, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '倒下最多的赢（三次机会）', guaranteeFirst: true, hasTriggered: false },
  { id: genId(), name: '射击比赛', icon: GAME_ICONS.sheji, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '分数最高的赢（三次机会）', guaranteeFirst: true, hasTriggered: false },
  { id: genId(), name: '海盗插剑', icon: GAME_ICONS.haidao, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '插中机关的输', guaranteeFirst: true, hasTriggered: false },
  { id: genId(), name: '咬手鳄鱼', icon: GAME_ICONS.eyu, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '咬中的输', guaranteeFirst: true, hasTriggered: false },
  { id: genId(), name: '抢保龄球', icon: GAME_ICONS.baolingqiu, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '谁先抢到谁，谁赢', guaranteeFirst: false, hasTriggered: false },
  { id: genId(), name: '零食雨', icon: GAME_ICONS.lingshiyu, probability: 100, maxCount: 1, remainingCount: 1, winCondition: '谁抢得多 谁赢', guaranteeFirst: false, hasTriggered: false },
  { id: genId(), name: '摇骰子比大小', icon: GAME_ICONS.bidaxiao, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '摇骰子最大数字的人获胜', guaranteeFirst: false, hasTriggered: false },
]

const DEFAULT_EVENTS = [
  { id: genId(), name: '火鸡面', icon: EVENT_ICONS.huojimian, type: 'reward', description: '获得一包火鸡面' },
  { id: genId(), name: '辣条', icon: EVENT_ICONS.latiao, type: 'reward', description: '获得一包辣条' },
  { id: genId(), name: '薯片', icon: EVENT_ICONS.shupian, type: 'reward', description: '获得一包薯片' },
  { id: genId(), name: '抽零食', icon: EVENT_ICONS.choulingshi, type: 'reward', description: '从零食箱抽一个零食' },
  { id: genId(), name: '获得一个10元红包', icon: EVENT_ICONS.hongbao10, type: 'reward', description: '运气不错！' },
  { id: genId(), name: '获得一个20元红包', icon: EVENT_ICONS.hongbao20, type: 'reward', description: '运气真好！' },
  { id: genId(), name: '获得一个5元红包', icon: EVENT_ICONS.hongbao5, type: 'reward', description: '小赚一笔！'},
  { id: genId(), name: '获得一个50元红包', icon: EVENT_ICONS.hongbao50, type: 'reward', description: '超级大红包！' },
  { id: genId(), name: '洗碗一次', icon: EVENT_ICONS.xiwan, type: 'punishment', description: '需要洗碗一次' },
  { id: genId(), name: '扫地一次', icon: EVENT_ICONS.saodi, type: 'punishment', description: '需要扫地一次' },
  { id: genId(), name: '洗碗两次', icon: EVENT_ICONS.xiwan, type: 'punishment', description: '需要洗碗两次' },
  { id: genId(), name: '扫地两次', icon: EVENT_ICONS.saodi, type: 'punishment', description: '需要扫地两次' },
  { id: genId(), name: '洗碗三次', icon: EVENT_ICONS.xiwan, type: 'punishment', description: '需要洗碗三次' },
  { id: genId(), name: '扫地三次', icon: EVENT_ICONS.saodi, type: 'punishment', description: '需要扫地三次' },
  { id: genId(), name: '唱一首歌', icon: EVENT_ICONS.sing, type: 'punishment', description: '为大家唱一首歌' },
  { id: genId(), name: '选一个多肉零食', icon: EVENT_ICONS.duoroulingshi, type: 'reward', description: '从多肉零食中选一个自己喜欢的' },
]

const DEFAULT_NPC_EVENTS = [
  { id: genId(), name: '捶背', icon: NPC_EVENT_ICONS.chuibei, type: 'reward', description: '帮长辈捶背' },
  { id: genId(), name: '一起跳舞', icon: NPC_EVENT_ICONS.dance, type: 'reward', description: '和NPC一起跳舞' },
  { id: genId(), name: '讨红包', icon: NPC_EVENT_ICONS.taohongbao, type: 'reward', description: '向NPC讨红包' },
  { id: genId(), name: '给NPC红包', icon: NPC_EVENT_ICONS.geihongbao, type: 'punishment', description: '给NPC发红包' },
  { id: genId(), name: '小游戏代玩', icon: NPC_EVENT_ICONS.daiwan, type: 'reward', description: '请求下一次小游戏由NPC代玩' },
  { id: genId(), name: '送寒假练习题', icon: NPC_EVENT_ICONS.lianxiti, type: 'reward', description: '送一本寒假练习题' },
  { id: genId(), name: '要指定零食', icon: NPC_EVENT_ICONS.yaolingshi, type: 'reward', description: '向NPC要一个指定的零食' },
  { id: genId(), name: '请求加码最终大奖', icon: NPC_EVENT_ICONS.jiamadajiang, type: 'reward', description: '请求NPC为最终赢家加红包、玩具或零食' },
  { id: genId(), name: '帮忙再摇一次', icon: SYSTEM_ICONS.dice, type: 'npc_system', description: 'NPC帮你再摇一次骰子' },
]

const DEFAULT_FINAL_PRIZE = {
  name: '新春大奖',
  icon: SYSTEM_ICONS.finalPrize,
}

// ===== Store 类 =====
class Store {
  constructor() {
    this._init()
  }

  _init() {
    if (!localStorage.getItem('rr_characters')) {
      this.saveCharacters(DEFAULT_CHARACTERS)
    }
    if (!localStorage.getItem('rr_npcs')) {
      this.saveNpcs(DEFAULT_NPCS)
    }
    if (!localStorage.getItem('rr_minigames')) {
      this.saveMiniGames(DEFAULT_MINIGAMES)
    } else {
      // 迁移：为已有小游戏添加 guaranteeFirst 和 hasTriggered 字段
      let currentGames = this.getMiniGames()
      let gamesChanged = false
      const guaranteeFirstNames = ['保龄球', '射击比赛', '海盗插剑', '咬手鳄鱼']
      currentGames.forEach(g => {
        if (g.guaranteeFirst === undefined) {
          g.guaranteeFirst = guaranteeFirstNames.includes(g.name)
          gamesChanged = true
        }
        if (g.hasTriggered === undefined) {
          g.hasTriggered = false
          gamesChanged = true
        }
      })
      if (gamesChanged) this.saveMiniGames(currentGames)
    }
    if (!localStorage.getItem('rr_events')) {
      this.saveEvents(DEFAULT_EVENTS)
    } else {
      // 检查是否需要更新事件列表（例如替换旧的红包事件）
      let current = this.getEvents()
      let changed = false
      
      // 更新现有事件的图标
      DEFAULT_EVENTS.forEach(def => {
        const existing = current.find(e => e.name === def.name)
        if (existing) {
          if (existing.icon !== def.icon) {
             existing.icon = def.icon
             changed = true
          }
        }
      })

      // 移除旧的通用"红包"事件
      const oldRedPacketIdx = current.findIndex(e => e.name === '红包')
      if (oldRedPacketIdx !== -1) {
        current.splice(oldRedPacketIdx, 1)
        changed = true
      }

      // 移除旧的"小零食"事件
      const oldSnackIdx = current.findIndex(e => e.name === '小零食')
      if (oldSnackIdx !== -1) {
        current.splice(oldSnackIdx, 1)
        changed = true
      }

      // 添加新的零食事件（如果不存在）
      const newSnacks = DEFAULT_EVENTS.filter(def => ['火鸡面', '辣条', '薯片', '抽零食', '选一个多肉零食'].includes(def.name))
      newSnacks.forEach(def => {
        if (!current.find(e => e.name === def.name)) {
          current.push(def)
          changed = true
        }
      })

      // 添加新的红包事件（如果不存在）
      const newEvents = DEFAULT_EVENTS.filter(def => def.name.includes('元红包'))
      newEvents.forEach(def => {
        if (!current.find(e => e.name === def.name)) {
          current.push(def)
          changed = true
        }
      })

      // 添加新的惩罚事件（如果不存在）
      const newPunishments = DEFAULT_EVENTS.filter(def => ['喝一次歌'].includes(def.name))
      newPunishments.forEach(def => {
        if (!current.find(e => e.name === def.name)) {
          current.push(def)
          changed = true
        }
      })

      if (changed) this.saveEvents(current)
    }
    if (!localStorage.getItem('rr_npcevents')) {
      this.saveNpcEvents(DEFAULT_NPC_EVENTS)
    } else {
      // 检查 NPC 事件更新
      let current = this.getNpcEvents()
      let changed = false
      
      // 更新现有事件的图标或添加新事件
      DEFAULT_NPC_EVENTS.forEach(def => {
        const existing = current.find(e => e.name === def.name)
        if (existing) {
          if (existing.icon !== def.icon) {
             existing.icon = def.icon
             changed = true
          }
        } else {
             // 添加新事件（例如：一起跳舞）
             current.push(def)
             changed = true
        }
      })

      if (changed) this.saveNpcEvents(current)
    }
    if (!localStorage.getItem('rr_finalprize')) {
      this.saveFinalPrize(DEFAULT_FINAL_PRIZE)
    }
  }

  // 角色
  getCharacters() { return JSON.parse(localStorage.getItem('rr_characters') || '[]') }
  saveCharacters(data) { localStorage.setItem('rr_characters', JSON.stringify(data)) }
  addCharacter(char) { const chars = this.getCharacters(); chars.push({ ...char, id: genId() }); this.saveCharacters(chars); return chars }
  updateCharacter(id, data) { const chars = this.getCharacters().map(c => c.id === id ? { ...c, ...data } : c); this.saveCharacters(chars); return chars }
  deleteCharacter(id) { const chars = this.getCharacters().filter(c => c.id !== id); this.saveCharacters(chars); return chars }

  // NPC
  getNpcs() { return JSON.parse(localStorage.getItem('rr_npcs') || '[]') }
  saveNpcs(data) { localStorage.setItem('rr_npcs', JSON.stringify(data)) }
  addNpc(npc) { const npcs = this.getNpcs(); npcs.push({ ...npc, id: genId() }); this.saveNpcs(npcs); return npcs }
  updateNpc(id, data) { const npcs = this.getNpcs().map(n => n.id === id ? { ...n, ...data } : n); this.saveNpcs(npcs); return npcs }
  deleteNpc(id) { const npcs = this.getNpcs().filter(n => n.id !== id); this.saveNpcs(npcs); return npcs }

  // 小游戏
  getMiniGames() { return JSON.parse(localStorage.getItem('rr_minigames') || '[]') }
  saveMiniGames(data) { localStorage.setItem('rr_minigames', JSON.stringify(data)) }
  addMiniGame(game) { const gs = this.getMiniGames(); gs.push({ ...game, id: genId() }); this.saveMiniGames(gs); return gs }
  updateMiniGame(id, data) { const gs = this.getMiniGames().map(g => g.id === id ? { ...g, ...data } : g); this.saveMiniGames(gs); return gs }
  deleteMiniGame(id) { const gs = this.getMiniGames().filter(g => g.id !== id); this.saveMiniGames(gs); return gs }

  // 随机事件
  getEvents() { return JSON.parse(localStorage.getItem('rr_events') || '[]') }
  saveEvents(data) { localStorage.setItem('rr_events', JSON.stringify(data)) }
  addEvent(ev) { const evs = this.getEvents(); evs.push({ ...ev, id: genId() }); this.saveEvents(evs); return evs }
  updateEvent(id, data) { const evs = this.getEvents().map(e => e.id === id ? { ...e, ...data } : e); this.saveEvents(evs); return evs }
  deleteEvent(id) { const evs = this.getEvents().filter(e => e.id !== id); this.saveEvents(evs); return evs }

  // NPC事件
  getNpcEvents() { return JSON.parse(localStorage.getItem('rr_npcevents') || '[]') }
  saveNpcEvents(data) { localStorage.setItem('rr_npcevents', JSON.stringify(data)) }
  addNpcEvent(ev) { const evs = this.getNpcEvents(); evs.push({ ...ev, id: genId() }); this.saveNpcEvents(evs); return evs }
  updateNpcEvent(id, data) { const evs = this.getNpcEvents().map(e => e.id === id ? { ...e, ...data } : e); this.saveNpcEvents(evs); return evs }
  deleteNpcEvent(id) { const evs = this.getNpcEvents().filter(e => e.id !== id); this.saveNpcEvents(evs); return evs }

  // 最终大奖
  getFinalPrize() { return JSON.parse(localStorage.getItem('rr_finalprize') || '{}') }
  saveFinalPrize(data) { localStorage.setItem('rr_finalprize', JSON.stringify(data)) }

  // 重置所有数据
  resetAll() {
    localStorage.removeItem('rr_characters')
    localStorage.removeItem('rr_npcs')
    localStorage.removeItem('rr_minigames')
    localStorage.removeItem('rr_events')
    localStorage.removeItem('rr_npcevents')
    localStorage.removeItem('rr_finalprize')
    localStorage.removeItem('rr_game_progress')
    this._init()
  }

  // 重置小游戏剩余次数(游戏开始时)
  resetMiniGameCounts() {
    const games = this.getMiniGames().map(g => ({ ...g, remainingCount: g.maxCount, hasTriggered: false }))
    this.saveMiniGames(games)
    return games
  }

  // 游戏进度存档
  saveGameProgress(state) { localStorage.setItem('rr_game_progress', JSON.stringify(state)) }
  getGameProgress() {
    const data = localStorage.getItem('rr_game_progress')
    return data ? JSON.parse(data) : null
  }
  clearGameProgress() { localStorage.removeItem('rr_game_progress') }
  hasGameProgress() { return !!localStorage.getItem('rr_game_progress') }
}

export const store = new Store()
export { genId, AVATAR_DEFAULT, generateAvatar, CHARACTER_COLORS, NPC_COLORS, SYSTEM_ICONS }
