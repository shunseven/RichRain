// ===== 音效管理模块 - 基于 Web Audio API =====
// 为大富翁游戏的各种节点和事件生成独特的音效

let audioCtx = null
let bgmGain = null
let sfxGain = null
let bgmPlaying = false
let bgmNodes = []
let drumBufs = null  // 缓存鼓组噪声Buffer，避免重复创建

// 延迟初始化 AudioContext（需要用户交互后才能使用）
function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    bgmGain = audioCtx.createGain()
    bgmGain.gain.value = 0.18  // 背景音乐音量偏低
    bgmGain.connect(audioCtx.destination)
    sfxGain = audioCtx.createGain()
    sfxGain.gain.value = 0.35  // 音效音量
    sfxGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// ===== 工具函数 =====
function playTone(freq, duration, type = 'sine', gainVal = 0.3, delay = 0) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime + delay)
  gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  osc.connect(gain)
  gain.connect(sfxGain)
  osc.start(ctx.currentTime + delay)
  osc.stop(ctx.currentTime + delay + duration)
}

function playNoise(duration, gainVal = 0.1, delay = 0) {
  const ctx = getCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(gainVal, ctx.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  // 带通滤波器使噪音更好听
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3000
  filter.Q.value = 0.5
  source.connect(filter)
  filter.connect(gain)
  gain.connect(sfxGain)
  source.start(ctx.currentTime + delay)
  source.stop(ctx.currentTime + delay + duration)
}

// =============================================
// 各种游戏音效
// =============================================

// 🎲 骰子摇动音效 - 快速咔嗒声
export function playDiceRoll() {
  for (let i = 0; i < 12; i++) {
    const freq = 800 + Math.random() * 1200
    playTone(freq, 0.04, 'square', 0.08, i * 0.06)
    playNoise(0.03, 0.06, i * 0.06)
  }
}

// 🎲 骰子结果音效 - 最终结果揭示
export function playDiceResult() {
  playTone(523, 0.15, 'triangle', 0.25)
  playTone(659, 0.15, 'triangle', 0.25, 0.1)
  playTone(784, 0.3, 'triangle', 0.3, 0.2)
}

// 👟 角色移动一步 - 轻快的踏步声
export function playStep() {
  const freq = 300 + Math.random() * 100
  playTone(freq, 0.08, 'square', 0.1)
  playNoise(0.05, 0.04)
}

// 💰 获得金币 - 清脆的叮当声
export function playCoinGain() {
  const notes = [1047, 1319, 1568, 2093]
  notes.forEach((f, i) => {
    playTone(f, 0.2, 'sine', 0.2, i * 0.08)
    playTone(f * 1.5, 0.15, 'sine', 0.06, i * 0.08)  // 泛音
  })
}

// 💸 失去金币 - 低沉下降音
export function playCoinLoss() {
  const notes = [523, 440, 349, 262]
  notes.forEach((f, i) => {
    playTone(f, 0.2, 'sawtooth', 0.1, i * 0.12)
  })
}

// ⭐ 获得星星 - 华丽的上升音阶 + 闪烁
export function playStarCollect() {
  // 五声音阶上升
  const notes = [523, 659, 784, 1047, 1319, 1568, 2093]
  notes.forEach((f, i) => {
    playTone(f, 0.3, 'sine', 0.2, i * 0.07)
    playTone(f * 2, 0.2, 'sine', 0.08, i * 0.07 + 0.03)  // 八度泛音
  })
  // 闪烁结尾
  for (let i = 0; i < 6; i++) {
    playTone(2093 + Math.random() * 500, 0.1, 'sine', 0.1, 0.5 + i * 0.05)
  }
}

// ❗ 随机事件触发 - 神秘的揭示音
export function playEventTrigger() {
  playTone(330, 0.3, 'triangle', 0.2)
  playTone(415, 0.3, 'triangle', 0.2, 0.15)
  playTone(523, 0.4, 'triangle', 0.25, 0.3)
  playTone(659, 0.5, 'sine', 0.15, 0.45)
}

// ✨ 奖励事件结果 - 欢快上升的铃声 + 撒花感
export function playRewardEvent() {
  // 欢快的上升三和弦
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => {
    playTone(f, 0.25, 'triangle', 0.2, i * 0.1)
    playTone(f * 1.5, 0.2, 'sine', 0.07, i * 0.1 + 0.03)  // 五度泛音
  })
  // 欢快的装饰音闪烁（像撒花/彩带）
  for (let i = 0; i < 8; i++) {
    const sparkle = 1200 + Math.random() * 1200
    playTone(sparkle, 0.1, 'sine', 0.08, 0.45 + i * 0.06)
  }
  // 结尾明亮和弦
  playTone(1047, 0.4, 'triangle', 0.12, 0.9)
  playTone(1319, 0.4, 'sine', 0.08, 0.9)
  playTone(1568, 0.4, 'sine', 0.06, 0.9)
}

// 😤 惩罚事件结果 - 低沉下降 + 失落感
export function playPunishmentEvent() {
  const ctx = getCtx()
  // 不祥的低音下行
  const notes = [440, 370, 330, 262, 220]
  notes.forEach((f, i) => {
    playTone(f, 0.3, 'sawtooth', 0.1, i * 0.14)
    playTone(f * 0.5, 0.25, 'sine', 0.06, i * 0.14)  // 低八度加重
  })
  // 滑稽的 "哇哇" 音效（像失败的号角）
  const wah = ctx.createOscillator()
  const wahGain = ctx.createGain()
  const wahFilter = ctx.createBiquadFilter()
  wah.type = 'sawtooth'
  wah.frequency.setValueAtTime(250, ctx.currentTime + 0.7)
  wah.frequency.linearRampToValueAtTime(180, ctx.currentTime + 1.0)
  wah.frequency.linearRampToValueAtTime(220, ctx.currentTime + 1.15)
  wah.frequency.linearRampToValueAtTime(140, ctx.currentTime + 1.5)
  wahFilter.type = 'lowpass'
  wahFilter.frequency.setValueAtTime(800, ctx.currentTime + 0.7)
  wahFilter.frequency.linearRampToValueAtTime(300, ctx.currentTime + 1.5)
  wahFilter.Q.value = 3
  wahGain.gain.setValueAtTime(0, ctx.currentTime + 0.7)
  wahGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.75)
  wahGain.gain.setValueAtTime(0.12, ctx.currentTime + 1.2)
  wahGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6)
  wah.connect(wahFilter)
  wahFilter.connect(wahGain)
  wahGain.connect(sfxGain)
  wah.start(ctx.currentTime + 0.7)
  wah.stop(ctx.currentTime + 1.7)
}

// ⚡ 系统事件触发 - 电子 whoosh 音效
export function playSystemEvent() {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2)
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5)
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
  osc.connect(gain)
  gain.connect(sfxGain)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.6)
  // 点缀音
  playTone(880, 0.1, 'sine', 0.15, 0.1)
  playTone(1760, 0.15, 'sine', 0.1, 0.2)
}

// 👥 NPC 遭遇 - 对话/问候音
export function playNpcEncounter() {
  // 两段式问候音（像对话框弹出）
  const melody = [392, 523, 440, 587]
  melody.forEach((f, i) => {
    playTone(f, 0.15, 'triangle', 0.18, i * 0.12)
  })
  // 小铃铛点缀
  playTone(1568, 0.1, 'sine', 0.06, 0.1)
  playTone(2093, 0.1, 'sine', 0.04, 0.25)
}

// 🎮 小游戏开始 - 欢快的开场 jingle
export function playMiniGameStart() {
  // 经典游戏开始音效
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]
  notes.forEach((f, i) => {
    playTone(f, 0.18, 'square', 0.12, i * 0.1)
    playTone(f / 2, 0.15, 'triangle', 0.06, i * 0.1)  // 低音衬托
  })
}

// 🎮✨ 小游戏揭晓 - 欢快的 "当当当当~" 揭示音
export function playMiniGameReveal() {
  // 经典的 "Ta-Da!" 揭示感（快速上行 + 大和弦展开）
  const fanfare = [392, 494, 587, 659, 784]
  fanfare.forEach((f, i) => {
    playTone(f, 0.12, 'square', 0.15, i * 0.07)
    playTone(f * 1.5, 0.1, 'triangle', 0.06, i * 0.07)
  })
  // 高潮大和弦 "当~当~!"
  const t = 0.4
  playTone(784, 0.5, 'triangle', 0.18, t)
  playTone(988, 0.5, 'triangle', 0.14, t)
  playTone(1175, 0.5, 'sine', 0.1, t)
  playTone(1568, 0.4, 'sine', 0.06, t)
  // 第二下重音
  playTone(1047, 0.6, 'triangle', 0.2, t + 0.25)
  playTone(1319, 0.6, 'triangle', 0.15, t + 0.25)
  playTone(1568, 0.6, 'sine', 0.1, t + 0.25)
  playTone(2093, 0.5, 'sine', 0.06, t + 0.25)
  // 闪烁彩花
  for (let i = 0; i < 10; i++) {
    playTone(1500 + Math.random() * 1500, 0.08, 'sine', 0.05, t + 0.5 + i * 0.04)
  }
}

// 🏆 小游戏胜利 - 胜利号角
export function playVictory() {
  // 号角式上升
  const notes = [523, 523, 659, 784, 659, 784, 1047]
  const durations = [0.12, 0.12, 0.12, 0.25, 0.12, 0.12, 0.5]
  let t = 0
  notes.forEach((f, i) => {
    playTone(f, durations[i] + 0.1, 'triangle', 0.2, t)
    playTone(f * 1.5, durations[i], 'sine', 0.08, t)
    t += durations[i]
  })
}

// 🎉 游戏结束 - 盛大的结局音乐
export function playGameOver() {
  // 宏大的和弦
  const chords = [
    [523, 659, 784],     // C major
    [587, 740, 880],     // D major
    [392, 494, 587],     // G major
    [523, 659, 784, 1047], // C major (加八度)
  ]
  let t = 0
  chords.forEach((chord, ci) => {
    chord.forEach(f => {
      playTone(f, 0.6, 'triangle', 0.12, t)
      playTone(f, 0.6, 'sine', 0.06, t)
    })
    t += ci === chords.length - 1 ? 0.8 : 0.4
  })
  // 结尾闪烁
  for (let i = 0; i < 8; i++) {
    playTone(1047 + Math.random() * 1000, 0.15, 'sine', 0.06, t + i * 0.06)
  }
}

// 🚀 前进特效 - 加速上升音
export function playForwardBoost() {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(300, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.5)
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
  osc.connect(gain)
  gain.connect(sfxGain)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.6)
}

// 🐢 后退特效 - 减速下降音
export function playBackwardSlow() {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(1500, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6)
  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
  osc.connect(gain)
  gain.connect(sfxGain)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.7)
}

// 🔄 交换位置 - 嗖嗖声
export function playSwap() {
  const ctx = getCtx()
  // 上升
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(300, ctx.currentTime)
  osc1.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.2)
  gain1.gain.setValueAtTime(0.15, ctx.currentTime)
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  osc1.connect(gain1); gain1.connect(sfxGain)
  osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.3)
  // 下降
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1500, ctx.currentTime + 0.2)
  osc2.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.4)
  gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.2)
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  osc2.connect(gain2); gain2.connect(sfxGain)
  osc2.start(ctx.currentTime + 0.2); osc2.stop(ctx.currentTime + 0.5)
}

// 🌠 传送音效 - 魔法传送门
export function playTeleport() {
  const ctx = getCtx()
  for (let i = 0; i < 8; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    const f = 400 + i * 200
    osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.05)
    osc.frequency.exponentialRampToValueAtTime(f * 2, ctx.currentTime + i * 0.05 + 0.1)
    gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.15)
    osc.connect(gain); gain.connect(sfxGain)
    osc.start(ctx.currentTime + i * 0.05)
    osc.stop(ctx.currentTime + i * 0.05 + 0.15)
  }
}

// 🎰 滚动器/转盘 音效 - 快速翻转然后减速
export function playRollerSpin() {
  for (let i = 0; i < 20; i++) {
    const delay = i * (0.04 + i * 0.008) // 逐渐减速
    const freq = 600 + (i % 3) * 200
    playTone(freq, 0.05, 'square', 0.06, delay)
  }
}

// 🎰 滚动器停止 - 最终选定
export function playRollerStop() {
  playTone(784, 0.15, 'triangle', 0.2)
  playTone(1047, 0.15, 'triangle', 0.25, 0.1)
  playTone(1568, 0.4, 'sine', 0.2, 0.2)
}

// 按钮点击音
export function playClick() {
  playTone(800, 0.06, 'square', 0.08)
}

// =============================================
// 🎵 背景音乐 - 恭喜发财 Funky Pop 风格（带变调升Key）
// =============================================
export function startBGM(bpm) {
  if (bgmPlaying) return
  bgmPlaying = true

  const ctx = getCtx()
  const BPM = bpm || 130  // 恭喜发财原曲节奏感（可传入加速BPM）
  const beat = 60 / BPM
  const eighth = beat / 2
  const sixteenth = beat / 4

  // ===== 基础频率 - D大调五声音阶 =====
  // 用频率比率表示，后面乘以 keyShift 实现变调
  const BASE = [
    146.8, 165.0, 185.0, 220.0, 246.9,   // 0-4:  低音 D E F# A B
    293.7, 330.0, 370.0, 440.0, 493.9,   // 5-9:  中音 D E F# A B
    587.3, 659.3, 740.0, 880.0, 987.8,   // 10-14: 高音 D E F# A B
    1174.7, 1318.5, 1480.0, 1760.0,      // 15-18: 超高 D E F# A
  ]

  // ===== 变调系数（核心！恭喜发财标志性升Key）=====
  // 每个段落对应一个调: D → D → E → E → F → F → D（循环）
  const KEY_SHIFTS = [
    1.0,    // D调 (原调)
    1.0,    // D调
    1.0,    // D调
    1.0,    // D调
    1.122,  // E调 (升一个全音！变调来了！)
    1.122,  // E调
    1.122,  // E调
    1.122,  // E调
    1.260,  // F调 (再升！高潮感拉满！)
    1.260,  // F调
    1.260,  // F调
    1.260,  // F调
    1.0,    // 回到D调（循环）
    1.0,    // D调
    1.0,    // D调
    1.0,    // D调
  ]

  // 获取变调后频率
  function freq(noteIdx, shift) {
    if (noteIdx < 0) return 0
    return BASE[noteIdx] * shift
  }

  // ===== 旋律 - 恭喜发财风格 Hook =====
  // 模仿 "恭喜你发财 恭喜你精彩" 的旋律走向
  // 16个十六分音符 = 1小节, -1=休止
  const melodyPhrases = [
    // === A段: "恭喜你发财" Hook（重复洗脑！）===
    // "恭-喜-你-发-财~" 上行 hook
    [5, 5, -1, 7, 7, -1, 5, 7,   9, 10, -1, -1, 10, -1, -1, -1],
    // "恭-喜-你-精-彩~" 变化
    [5, 5, -1, 7, 7, -1, 5, 9,   10, 12, -1, -1, 10, -1, -1, -1],
    // "最好的请过来" 下行回应
    [12, -1, 10, 9, -1, 7, 9, 10,  9, -1, 7, 5, -1, -1, 5, -1],
    // "不好的请走开~" 收束
    [12, -1, 10, 9, -1, 7, 5, 7,   5, -1, -1, -1, 5, -1, -1, -1],

    // === B段: 副歌变奏（更高能量）===
    // "恭~喜~发~财~" 每个字拉长 + 高音
    [10, 10, -1, 12, 12, -1, 14, -1,  14, 12, -1, 10, -1, 10, -1, -1],
    // 高音展开
    [10, 12, -1, 14, 14, -1, 15, -1,  15, 14, -1, 12, -1, 10, -1, -1],
    // 回落
    [14, -1, 12, 10, -1, 9, 10, 12,   10, -1, 9, 7, -1, -1, 5, -1],
    // 收束句 (为变调做铺垫)
    [9, 10, -1, 12, 10, -1, 9, 7,    9, -1, 10, -1, -1, -1, -1, -1],

    // === C段: 高潮（变调后更激昂）===
    [10, 10, 12, 12, 14, -1, 15, 14,  12, 10, -1, 12, 14, -1, -1, -1],
    [15, -1, 14, 12, 14, -1, 15, -1,  15, 14, 12, 10, -1, 10, -1, -1],
    [5, 7, -1, 9, 10, -1, 12, 10,   9, 7, -1, 5, 7, -1, 9, -1],
    [10, -1, 12, 14, 15, -1, 14, 12,  10, -1, -1, -1, 10, -1, -1, -1],

    // === D段: 间奏律动 ===
    [10, -1, 10, -1, 12, -1, 10, 9,   10, -1, 10, -1, 12, -1, 14, -1],
    [10, -1, 10, -1, 9, -1, 7, 9,    10, -1, 10, -1, 12, -1, 10, -1],
    [5, -1, 7, -1, 9, -1, 10, -1,    12, -1, 10, -1, 9, -1, 7, -1],
    [10, 12, 14, 12, 10, 9, 10, -1,   -1, -1, -1, -1, -1, -1, -1, -1],
  ]

  // ===== Funky 鼓组 - Pop/Funk 四四拍 =====
  // K=底鼓 S=军鼓 H=闭合踩镲 O=开放踩镲 .=休止
  const drumPatterns = [
    // 基本 Funk Beat
    'K.H.S.H.K.HOS.H.',
    'K.H.S.HHK.H.S.HO',
    // 加花变化
    'K.HHS.H.KKH.S.H.',
    'K.H.S.HOK.HHS.HH',
    // 密集律动（高潮段用）
    'KKHHS.HHKKH.S.HO',
    'K.HHS.HOKKHHS.HH',
    // 间奏轻量
    'K.H.S.H.K.H.S.H.',
    'K.H.S.H.K.H.S.HO',
  ]

  // ===== Funky Bass（律动感重！切分音！）=====
  // Funk bass = 根音跳动 + 八度 + 五度 + 切分
  const bassLines = [
    // Funk 切分 bass (D根音)
    [5, -1, -1, 5, -1, -1, 0, -1,   5, -1, -1, 5, -1, 7, -1, -1],
    [5, -1, -1, 5, -1, 7, -1, 5,    -1, -1, 4, -1, 5, -1, -1, -1],
    // 变化 bass
    [5, -1, 0, -1, 5, -1, -1, 7,    -1, 5, -1, -1, 4, -1, 5, -1],
    [0, -1, -1, 5, -1, -1, 7, -1,    5, -1, -1, 4, -1, 5, -1, -1],
    // 高能 bass（密集）
    [5, -1, 5, 7, -1, 5, 0, -1,     5, -1, 5, 7, -1, 9, 5, -1],
    [5, 0, -1, 5, 7, -1, 5, -1,     4, -1, 5, -1, 7, 5, -1, -1],
  ]

  // ===== 和弦 Stab（铜管短促和弦 - 恭喜发财标志！）=====
  // 每组 = 一小节内的和弦时机, [拍位, 和弦音数组]
  const chordStabs = [
    // "恭喜" 风格短促铜管 stab
    [[0, [5,7,10]], [4, [5,7,10]], [10, [7,9,12]]],
    [[0, [5,9,12]], [4, [5,9,12]], [10, [5,7,10]]],
    // 高能 stab
    [[0, [5,7,10]], [2, [5,7,10]], [4, [7,9,12]], [8, [5,9,12]], [12, [5,7,10]]],
    [[0, [7,9,12]], [4, [5,7,10]], [8, [7,9,12]], [12, [9,12,14]]],
    // 轻量
    [[0, [5,7,10]], [8, [7,9,12]]],
    [[0, [5,9,12]], [8, [5,7,10]]],
  ]

  let barCount = 0  // 总小节计数器（用于变调）
  let melodyIdx = 0
  let drumIdx = 0
  let bassIdx = 0
  let stabIdx = 0

  // --- 缓存鼓组噪声Buffer（只创建一次）---
  if (!drumBufs) {
    const kickLen = Math.floor(ctx.sampleRate * 0.02)
    const kickBuf = ctx.createBuffer(1, kickLen, ctx.sampleRate)
    const kd = kickBuf.getChannelData(0)
    for (let i = 0; i < kickLen; i++) kd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (kickLen * 0.15))

    const snareLen = Math.floor(ctx.sampleRate * 0.1)
    const snareBuf = ctx.createBuffer(1, snareLen, ctx.sampleRate)
    const sd = snareBuf.getChannelData(0)
    for (let i = 0; i < snareLen; i++) sd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snareLen * 0.2))

    const chLen = Math.floor(ctx.sampleRate * 0.03)
    const chBuf = ctx.createBuffer(1, chLen, ctx.sampleRate)
    const cd = chBuf.getChannelData(0)
    for (let i = 0; i < chLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (chLen * 0.2))

    const ohLen = Math.floor(ctx.sampleRate * 0.12)
    const ohBuf = ctx.createBuffer(1, ohLen, ctx.sampleRate)
    const od = ohBuf.getChannelData(0)
    for (let i = 0; i < ohLen; i++) od[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ohLen * 0.4))

    drumBufs = { kickBuf, snareBuf, chBuf, ohBuf }
  }

  // --- 播放合成音（带变调）---
  function note(f, dur, type, vol, startTime) {
    if (f <= 0) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    g.gain.setValueAtTime(0, startTime)
    g.gain.linearRampToValueAtTime(vol, startTime + 0.008)
    g.gain.setValueAtTime(vol * 0.7, startTime + dur * 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur)
    o.connect(g)
    g.connect(bgmGain)
    o.start(startTime)
    o.stop(startTime + dur + 0.02)
    o.onended = () => { o.disconnect(); g.disconnect() }
    bgmNodes.push(o)
  }

  // --- Funky brass stab（短促铜管）---
  function brassStab(freqs, startTime) {
    freqs.forEach(f => {
      // square wave + 滤波 = 铜管质感
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const flt = ctx.createBiquadFilter()
      o.type = 'square'
      o.frequency.value = f
      flt.type = 'lowpass'
      flt.frequency.value = f * 3
      flt.Q.value = 1
      g.gain.setValueAtTime(0, startTime)
      g.gain.linearRampToValueAtTime(0.07, startTime + 0.01)
      g.gain.setValueAtTime(0.06, startTime + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)
      o.connect(flt)
      flt.connect(g)
      g.connect(bgmGain)
      o.start(startTime)
      o.stop(startTime + 0.15)
      o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
      bgmNodes.push(o)
    })
  }

  // --- Pop 鼓组（使用缓存Buffer）---
  function drum(type, startTime) {
    if (type === 'K') {
      // 底鼓 - 有力的 Kick
      const kick = ctx.createOscillator()
      const kGain = ctx.createGain()
      kick.type = 'sine'
      kick.frequency.setValueAtTime(160, startTime)
      kick.frequency.exponentialRampToValueAtTime(35, startTime + 0.12)
      kGain.gain.setValueAtTime(0.28, startTime)
      kGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)
      kick.connect(kGain)
      kGain.connect(bgmGain)
      kick.start(startTime)
      kick.stop(startTime + 0.18)
      kick.onended = () => { kick.disconnect(); kGain.disconnect() }
      bgmNodes.push(kick)
      // 底鼓 click 层（使用缓存Buffer）
      const src = ctx.createBufferSource()
      src.buffer = drumBufs.kickBuf
      const sg = ctx.createGain()
      const sf = ctx.createBiquadFilter()
      sf.type = 'highpass'; sf.frequency.value = 2000
      sg.gain.setValueAtTime(0.08, startTime)
      sg.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03)
      src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
      src.start(startTime); src.stop(startTime + 0.05)
      src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
      bgmNodes.push(src)
    } else if (type === 'S') {
      // 军鼓 - Pop snare（使用缓存Buffer）
      const src = ctx.createBufferSource()
      src.buffer = drumBufs.snareBuf
      const sg = ctx.createGain()
      const sf = ctx.createBiquadFilter()
      sf.type = 'bandpass'; sf.frequency.value = 1200; sf.Q.value = 0.8
      sg.gain.setValueAtTime(0.18, startTime)
      sg.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)
      src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
      src.start(startTime); src.stop(startTime + 0.12)
      src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
      bgmNodes.push(src)
      // snare body
      const so = ctx.createOscillator()
      const soG = ctx.createGain()
      so.type = 'triangle'; so.frequency.value = 200
      soG.gain.setValueAtTime(0.1, startTime)
      soG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06)
      so.connect(soG); soG.connect(bgmGain)
      so.start(startTime); so.stop(startTime + 0.08)
      so.onended = () => { so.disconnect(); soG.disconnect() }
      bgmNodes.push(so)
    } else if (type === 'H') {
      // 闭合踩镲（使用缓存Buffer）
      const src = ctx.createBufferSource()
      src.buffer = drumBufs.chBuf
      const sg = ctx.createGain()
      const sf = ctx.createBiquadFilter()
      sf.type = 'highpass'; sf.frequency.value = 7000; sf.Q.value = 0.5
      sg.gain.setValueAtTime(0.08, startTime)
      sg.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03)
      src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
      src.start(startTime); src.stop(startTime + 0.05)
      src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
      bgmNodes.push(src)
    } else if (type === 'O') {
      // 开放踩镲（使用缓存Buffer）
      const src = ctx.createBufferSource()
      src.buffer = drumBufs.ohBuf
      const sg = ctx.createGain()
      const sf = ctx.createBiquadFilter()
      sf.type = 'highpass'; sf.frequency.value = 5000; sf.Q.value = 0.3
      sg.gain.setValueAtTime(0.07, startTime)
      sg.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)
      src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
      src.start(startTime); src.stop(startTime + 0.15)
      src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
      bgmNodes.push(src)
    }
  }

  // ===== 调度一小节 =====
  function scheduleBar() {
    if (!bgmPlaying) return

    // 每2小节清理已停止的旧节点引用，防止数组无限增长导致卡顿
    if (barCount > 0 && barCount % 2 === 0) {
      const intervalId = bgmNodes._intervalId
      bgmNodes = []
      bgmNodes._intervalId = intervalId
    }

    const now = ctx.currentTime + 0.05
    const shift = KEY_SHIFTS[barCount % KEY_SHIFTS.length]

    for (let i = 0; i < 16; i++) {
      const t = now + i * sixteenth

      // 1) 主旋律 - 模拟恭喜发财人声/唢呐
      const melody = melodyPhrases[melodyIdx % melodyPhrases.length]
      const mNoteIdx = melody[i]
      if (mNoteIdx >= 0) {
        const f = freq(mNoteIdx, shift)
        // 主音 - square + lowpass = 模拟明亮的人声/唢呐
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        const flt = ctx.createBiquadFilter()
        o.type = 'square'
        o.frequency.value = f
        flt.type = 'lowpass'
        flt.frequency.value = f * 4
        flt.Q.value = 1.5
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.09, t + 0.01)
        g.gain.setValueAtTime(0.07, t + sixteenth * 0.5)
        g.gain.exponentialRampToValueAtTime(0.001, t + sixteenth * 1.6)
        o.connect(flt); flt.connect(g); g.connect(bgmGain)
        o.start(t); o.stop(t + sixteenth * 1.8)
        o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
        bgmNodes.push(o)
        // 柔和衬底 sine
        note(f, sixteenth * 1.5, 'sine', 0.04, t)
        // 高八度闪亮
        note(f * 2, sixteenth * 0.8, 'sine', 0.015, t)
      }

      // 2) Funk 鼓组
      const dPat = drumPatterns[drumIdx % drumPatterns.length]
      const dChar = dPat[i % dPat.length]
      if (dChar !== '.') drum(dChar, t)

      // 3) Funky Bass（超级律动！）
      const bLine = bassLines[bassIdx % bassLines.length]
      const bNoteIdx = bLine[i]
      if (bNoteIdx >= 0) {
        const bf = freq(bNoteIdx, shift) * 0.5
        // Bass 用 sawtooth + lowpass = 厚实的 Funk bass
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        const flt = ctx.createBiquadFilter()
        o.type = 'sawtooth'
        o.frequency.value = bf
        flt.type = 'lowpass'
        flt.frequency.value = 400
        flt.Q.value = 2
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.1, t + 0.008)
        g.gain.setValueAtTime(0.08, t + sixteenth * 0.5)
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.7)
        o.connect(flt); flt.connect(g); g.connect(bgmGain)
        o.start(t); o.stop(t + beat * 0.8)
        o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
        bgmNodes.push(o)
      }

      // 4) 铜管和弦 Stab
      const stabs = chordStabs[stabIdx % chordStabs.length]
      stabs.forEach(([pos, chordNotes]) => {
        if (i === pos) {
          const shifted = chordNotes.map(n => freq(n, shift))
          brassStab(shifted, t)
        }
      })
    }

    // 切换到下一小节
    barCount++
    melodyIdx = (melodyIdx + 1) % melodyPhrases.length
    // 每 2 小节切换鼓/bass/和弦
    if (barCount % 2 === 0) {
      drumIdx = (drumIdx + 1) % drumPatterns.length
      bassIdx = (bassIdx + 1) % bassLines.length
      stabIdx = (stabIdx + 1) % chordStabs.length
    }
  }

  // 每小节调度一次
  const barMs = sixteenth * 16 * 1000
  scheduleBar()
  const intervalId = setInterval(scheduleBar, barMs)
  bgmNodes._intervalId = intervalId
}

export function stopBGM() {
  bgmPlaying = false
  if (bgmNodes._intervalId) clearInterval(bgmNodes._intervalId)
  bgmNodes.forEach(node => {
    try { node.stop(); node.disconnect() } catch (e) { /* ignore */ }
  })
  bgmNodes = []
  // 重建 bgmGain 节点，彻底断开所有孤立的中间节点（GainNode/BiquadFilterNode）
  // 这些节点在 bgmNodes 清理时可能未被引用但仍连接在音频图中
  if (bgmGain && audioCtx) {
    const vol = bgmGain.gain.value
    bgmGain.disconnect()
    bgmGain = audioCtx.createGain()
    bgmGain.gain.value = vol
    bgmGain.connect(audioCtx.destination)
  }
}

// 加速BGM（最后三轮使用）
export function speedUpBGM() {
  stopBGM()
  // 短暂延迟确保干净切换
  setTimeout(() => startBGM(165), 100)
}

// 音量控制
export function setBGMVolume(vol) {
  if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, vol))
}

export function setSFXVolume(vol) {
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, vol))
}

// 初始化（确保在用户交互时调用）
export function initAudio() {
  getCtx()
}
