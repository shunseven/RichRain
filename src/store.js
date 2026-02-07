// ===== 数据存储模块 =====
import { AVATAR_DEFAULT, generateAvatar, GAME_ICONS, EVENT_ICONS, NPC_EVENT_ICONS, SYSTEM_ICONS, CHARACTER_COLORS, NPC_COLORS } from './icons.js'

let uid = Date.now()
const genId = () => `id_${uid++}`

// ===== 默认数据 =====
const DEFAULT_CHARACTERS = [
  { id: genId(), name: '琪琪', avatar: generateAvatar('琪', '#e74c3c'), color: '#e74c3c' },
  { id: genId(), name: '涵涵', avatar: generateAvatar('涵', '#3498db'), color: '#3498db' },
  { id: genId(), name: '莹莹', avatar: generateAvatar('莹', '#2ecc71'), color: '#2ecc71' },
]

const DEFAULT_NPCS = [
  { id: genId(), name: '爷爷', avatar: generateAvatar('爷', '#636e72'), color: '#636e72' },
  { id: genId(), name: '奶奶', avatar: generateAvatar('奶', '#b2bec3'), color: '#b2bec3' },
  { id: genId(), name: '顺文', avatar: generateAvatar('顺', '#00b894'), color: '#00b894' },
  { id: genId(), name: '亦文', avatar: generateAvatar('亦', '#fdcb6e'), color: '#fdcb6e' },
  { id: genId(), name: '秋平', avatar: generateAvatar('秋', '#e17055'), color: '#e17055' },
  { id: genId(), name: '淑娟', avatar: generateAvatar('淑', '#74b9ff'), color: '#74b9ff' },
  { id: genId(), name: '广文', avatar: generateAvatar('广', '#a29bfe'), color: '#a29bfe' },
]

const DEFAULT_MINIGAMES = [
  { id: genId(), name: '红包雨', icon: GAME_ICONS.hongbaoyu, probability: 100, maxCount: 1, remainingCount: 1, winCondition: '拿到最多钱的人获胜' },
  { id: genId(), name: '石头剪刀布', icon: GAME_ICONS.shitoujiandaobu, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '最终胜者获胜' },
  { id: genId(), name: '猜数字', icon: GAME_ICONS.caishuzi, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '最先猜中数字的人获胜' },
  { id: genId(), name: '抢凳子', icon: GAME_ICONS.qiangdengzi, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '最后留在凳子上的人获胜' },
  { id: genId(), name: '记忆翻牌', icon: GAME_ICONS.jiyifanpai, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '找到最多配对的人获胜' },
  { id: genId(), name: '比大小', icon: GAME_ICONS.bidaxiao, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '抽到最大数字的人获胜' },
  { id: genId(), name: '接水果', icon: GAME_ICONS.jieshuiguo, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '接到最多水果的人获胜' },
  { id: genId(), name: '跳绳计数', icon: GAME_ICONS.tiaosheng, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '跳绳次数最多的人获胜' },
  { id: genId(), name: '快速计算', icon: GAME_ICONS.kuaisujisuan, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '最快算出正确答案的人获胜' },
  { id: genId(), name: '猜拳大师', icon: GAME_ICONS.caiquandashi, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '猜拳连胜最多的人获胜' },
  { id: genId(), name: '传话游戏', icon: GAME_ICONS.chuanhua, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '传话最准确的队伍获胜' },
  { id: genId(), name: '手速比拼', icon: GAME_ICONS.shousubi, probability: 50, maxCount: 100, remainingCount: 100, winCondition: '点击速度最快的人获胜' },
]

const DEFAULT_EVENTS = [
  { id: genId(), name: '小零食', icon: EVENT_ICONS.xiaolingshi, type: 'reward', description: '获得美味小零食' },
  { id: genId(), name: '红包', icon: EVENT_ICONS.hongbao, type: 'reward', description: '收到一个红包' },
  { id: genId(), name: '洗碗一次', icon: EVENT_ICONS.xiwan, type: 'punishment', description: '需要洗碗一次' },
  { id: genId(), name: '扫地一次', icon: EVENT_ICONS.saodi, type: 'punishment', description: '需要扫地一次' },
  { id: genId(), name: '贴春联', icon: EVENT_ICONS.tiechunlian, type: 'reward', description: '帮忙贴春联' },
  { id: genId(), name: '放鞭炮', icon: EVENT_ICONS.fangbianpao, type: 'reward', description: '放鞭炮庆祝新年' },
  { id: genId(), name: '包饺子', icon: EVENT_ICONS.baojiaozi, type: 'reward', description: '一起包饺子，其乐融融' },
  { id: genId(), name: '拜年', icon: EVENT_ICONS.bainian, type: 'reward', description: '给长辈拜年' },
  { id: genId(), name: '守岁', icon: EVENT_ICONS.shousui, type: 'reward', description: '坚持守岁到凌晨' },
  { id: genId(), name: '看春晚', icon: EVENT_ICONS.kanchunwan, type: 'reward', description: '一起看春晚' },
  { id: genId(), name: '穿新衣', icon: EVENT_ICONS.chuanxinyi, type: 'reward', description: '穿上新衣服真开心' },
  { id: genId(), name: '发压岁钱', icon: EVENT_ICONS.fayasuiqian, type: 'punishment', description: '给小朋友发压岁钱' },
]

const DEFAULT_NPC_EVENTS = [
  { id: genId(), name: '捶背', icon: NPC_EVENT_ICONS.chuibei, type: 'reward', description: '帮长辈捶背' },
  { id: genId(), name: '讨红包', icon: NPC_EVENT_ICONS.taohongbao, type: 'reward', description: '向NPC讨红包' },
  { id: genId(), name: '给红包', icon: NPC_EVENT_ICONS.geihongbao, type: 'punishment', description: '给NPC发红包' },
  { id: genId(), name: '扫一次地', icon: NPC_EVENT_ICONS.saodi, type: 'punishment', description: '需要扫一次地' },
  { id: genId(), name: '洗一次碗', icon: NPC_EVENT_ICONS.xiwan, type: 'punishment', description: '需要洗一次碗' },
  { id: genId(), name: '小游戏代玩', icon: NPC_EVENT_ICONS.daiwan, type: 'reward', description: '请求下一次小游戏由NPC代玩' },
  { id: genId(), name: '送寒假练习题', icon: NPC_EVENT_ICONS.lianxiti, type: 'reward', description: '送一本寒假练习题' },
  { id: genId(), name: '要指定零食', icon: NPC_EVENT_ICONS.yaolingshi, type: 'reward', description: '向NPC要一个指定的零食' },
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
    }
    if (!localStorage.getItem('rr_events')) {
      this.saveEvents(DEFAULT_EVENTS)
    }
    if (!localStorage.getItem('rr_npcevents')) {
      this.saveNpcEvents(DEFAULT_NPC_EVENTS)
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
    this._init()
  }

  // 重置小游戏剩余次数(游戏开始时)
  resetMiniGameCounts() {
    const games = this.getMiniGames().map(g => ({ ...g, remainingCount: g.maxCount }))
    this.saveMiniGames(games)
    return games
  }
}

export const store = new Store()
export { genId, AVATAR_DEFAULT, generateAvatar, CHARACTER_COLORS, NPC_COLORS, SYSTEM_ICONS }
