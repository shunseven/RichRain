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
// 🎵 背景音乐 - 恭喜发财 欢乐Pop风格（高效版 + 变调升Key）
// 架构：8分音符网格，长持续Pad，缓存Buffer，自动清理
// =============================================
export function startBGM() {
  if (bgmPlaying) return
  bgmPlaying = true

  const ctx = getCtx()
  const BPM = 130
  const beat = 60 / BPM
  const eighth = beat / 2

  // 缓存鼓组Buffer
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

  // ===== 恭喜发财标志性变调升Key！D → E → F → D 循环 =====
  const KEY_SHIFTS = [
    1.0, 1.0, 1.0, 1.0,          // D调
    1.0, 1.0, 1.0, 1.0,          // D调
    1.122, 1.122, 1.122, 1.122,  // E调（升了！）
    1.122, 1.122, 1.122, 1.122,  // E调
    1.260, 1.260, 1.260, 1.260,  // F调（再升！高潮！）
    1.260, 1.260, 1.260, 1.260,  // F调
    1.0, 1.0, 1.0, 1.0,          // 回到D调
    1.0, 1.0, 1.0, 1.0,          // D调
  ]

  // ===== D大调和弦 I-IV-V-I 进行（欢乐感！）=====
  const CHORDS = [
    [293.7, 370.0, 440.0],   // D大调 (I)
    [392.0, 493.9, 587.3],   // G大调 (IV)
    [440.0, 554.4, 659.3],   // A大调 (V)
    [293.7, 370.0, 440.0],   // D大调 (I)
  ]

  // 低音根音（D大调进行根音）
  const BASS = [146.8, 196.0, 220.0, 146.8]

  // ===== 恭喜发财旋律 - D大调五声音阶 =====
  // D5=587 E5=659 F#5=740 A5=880 B5=988 D6=1175
  // 8分音符 x 8 = 1小节, 0=休止
  const MELODY = [
    // === A段: "恭喜你发财" Hook ===
    [587, 587, 0, 740, 740, 0, 587, 740],      // "恭-喜-你-发" 上行hook
    [880, 988, 0, 0, 988, 0, 0, 0],             // "财~~" 延续
    [587, 587, 0, 740, 740, 0, 587, 880],       // "恭-喜-你-精" 变化
    [988, 1175, 0, 0, 988, 0, 0, 0],            // "彩~~" 更高

    // === B段: 副歌展开 ===
    [1175, 0, 988, 880, 0, 740, 880, 988],      // "最好的请过来" 下行
    [880, 0, 740, 587, 0, 740, 587, 0],         // "不好的请走开"
    [880, 880, 0, 988, 988, 0, 1175, 0],        // 高音展开
    [1175, 988, 880, 740, 880, 0, 0, 0],         // 华丽收束

    // === C段: 高潮变奏 ===
    [988, 988, 0, 1175, 1175, 0, 988, 880],     // 高音hook加强
    [1175, 0, 988, 0, 880, 740, 880, 0],        // 快速穿梭
    [587, 740, 0, 880, 988, 0, 1175, 988],      // 上行冲刺
    [880, 0, 0, 0, 880, 0, 0, 0],               // 呼吸

    // === D段: 间奏律动 ===
    [880, 0, 880, 0, 988, 0, 880, 740],         // 节奏感
    [880, 0, 880, 0, 740, 0, 587, 740],         // 回落
    [587, 0, 740, 0, 880, 0, 988, 0],           // 阶梯上行
    [988, 1175, 988, 880, 740, 0, 0, 0],        // 快速下行收束
  ]

  // ===== Pop/Funk 鼓组（8分音符网格）=====
  // K=底鼓 S=军鼓 H=踩镲 O=开放镲 .=休止
  const DRUMS = [
    'K.H.S.HO',   // 基本groove
    'K.H.S.KH',   // 变化
    'K.HHS.H.',   // 密集镲
    'K.H.SKHO',   // 加花
  ]

  // ===== 铜管Stab节奏（每小节哪几个8分音符位置触发）=====
  const STAB_PATTERNS = [
    [0, 4],           // 拍1和拍3
    [0, 3],           // 拍1和切分
    [0, 4, 6],        // 拍1、3、4 (高能)
    [0, 2, 4],        // 密集stab
  ]

  let barCount = 0

  // --- 高效单音节点（带滤波 + 自动清理）---
  function fNote(f, dur, type, vol, startTime, filterMul) {
    if (f <= 0) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const flt = ctx.createBiquadFilter()
    o.type = type
    o.frequency.value = f
    flt.type = 'lowpass'
    flt.frequency.value = f * (filterMul || 3)
    flt.Q.value = 1
    g.gain.setValueAtTime(0, startTime)
    g.gain.linearRampToValueAtTime(vol, startTime + 0.01)
    g.gain.setValueAtTime(vol * 0.7, startTime + dur * 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur)
    o.connect(flt); flt.connect(g); g.connect(bgmGain)
    o.start(startTime); o.stop(startTime + dur + 0.02)
    o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
    bgmNodes.push(o)
  }

  function scheduleBar() {
    if (!bgmPlaying) return

    // 每2小节清理旧节点引用
    if (barCount > 0 && barCount % 2 === 0) {
      const iid = bgmNodes._intervalId
      bgmNodes = []
      bgmNodes._intervalId = iid
    }

    const now = ctx.currentTime + 0.05
    const shift = KEY_SHIFTS[barCount % KEY_SHIFTS.length]
    const ci = barCount % CHORDS.length
    const chord = CHORDS[ci]
    const bassF = BASS[ci]
    const melody = MELODY[barCount % MELODY.length]
    const drumPat = DRUMS[barCount % DRUMS.length]
    const stabPat = STAB_PATTERNS[barCount % STAB_PATTERNS.length]

    // ===== 1) 明亮和弦Pad（持续整小节，带stab式起音 = 恭喜感！）=====
    // triangle波 → 明亮温暖的大调和弦，高滤波截止 = 欢乐感
    chord.forEach(f => {
      const sf = f * shift
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const flt = ctx.createBiquadFilter()
      o.type = 'triangle'
      o.frequency.value = sf
      flt.type = 'lowpass'
      flt.frequency.value = sf * 4  // 高截止 = 明亮！
      flt.Q.value = 0.7
      // 快速起音(stab感) → 持续pad → 淡出
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(0.065, now + 0.015)
      g.gain.setValueAtTime(0.04, now + beat * 0.3)
      g.gain.setValueAtTime(0.035, now + beat * 3)
      g.gain.exponentialRampToValueAtTime(0.001, now + beat * 4 + 0.05)
      o.connect(flt); flt.connect(g); g.connect(bgmGain)
      o.start(now); o.stop(now + beat * 4 + 0.1)
      o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
      bgmNodes.push(o)
    })

    // ===== 2) Funky弹性Bass（每小节3次弹跳）=====
    const bassTimes = [0, beat * 2, beat * 3]  // 拍1、3、4 → 弹跳律动
    const bassVols = [0.13, 0.11, 0.09]
    bassTimes.forEach((offset, bi) => {
      const t = now + offset
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const flt = ctx.createBiquadFilter()
      o.type = 'sawtooth'
      o.frequency.value = bassF * shift
      flt.type = 'lowpass'
      flt.frequency.value = 350
      flt.Q.value = 3
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(bassVols[bi], t + 0.01)
      g.gain.setValueAtTime(bassVols[bi] * 0.7, t + beat * 0.4)
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.5)
      o.connect(flt); flt.connect(g); g.connect(bgmGain)
      o.start(t); o.stop(t + beat * 1.6)
      o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
      bgmNodes.push(o)
    })

    // ===== 3) 恭喜发财旋律（唢呐/笛子感 - square波明亮音色）=====
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth
      const f = melody[i]
      if (f > 0) {
        const sf = f * shift
        // 主旋律（square + 高滤波 = 明亮唢呐感）
        fNote(sf, eighth * 1.5, 'square', 0.08, t, 4)
        // 柔和衬底（sine低八度）
        fNote(sf * 0.5, eighth * 1.2, 'sine', 0.02, t, 6)
      }
    }

    // ===== 4) 铜管Stab（恭喜发财标志！短促和弦重音）=====
    stabPat.forEach(pos => {
      const t = now + pos * eighth
      chord.forEach(f => {
        const sf = f * shift * 2  // 高八度stab更明亮
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        const flt = ctx.createBiquadFilter()
        o.type = 'square'
        o.frequency.value = sf
        flt.type = 'lowpass'
        flt.frequency.value = sf * 2.5
        flt.Q.value = 1
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.055, t + 0.008)
        g.gain.setValueAtTime(0.045, t + 0.03)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
        o.connect(flt); flt.connect(g); g.connect(bgmGain)
        o.start(t); o.stop(t + 0.12)
        o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
        bgmNodes.push(o)
      })
    })

    // ===== 5) Pop鼓组（轻快groove，使用缓存Buffer）=====
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth
      const d = drumPat[i]
      if (d === 'K') {
        const kick = ctx.createOscillator()
        const kGain = ctx.createGain()
        kick.type = 'sine'
        kick.frequency.setValueAtTime(150, t)
        kick.frequency.exponentialRampToValueAtTime(40, t + 0.1)
        kGain.gain.setValueAtTime(0.25, t)
        kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
        kick.connect(kGain); kGain.connect(bgmGain)
        kick.start(t); kick.stop(t + 0.18)
        kick.onended = () => { kick.disconnect(); kGain.disconnect() }
        bgmNodes.push(kick)
      } else if (d === 'S') {
        const src = ctx.createBufferSource()
        src.buffer = drumBufs.snareBuf
        const sg = ctx.createGain()
        const sf = ctx.createBiquadFilter()
        sf.type = 'bandpass'; sf.frequency.value = 1200; sf.Q.value = 0.8
        sg.gain.setValueAtTime(0.16, t)
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
        src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
        src.start(t); src.stop(t + 0.12)
        src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
        bgmNodes.push(src)
      } else if (d === 'H') {
        const src = ctx.createBufferSource()
        src.buffer = drumBufs.chBuf
        const sg = ctx.createGain()
        const sf = ctx.createBiquadFilter()
        sf.type = 'highpass'; sf.frequency.value = 7000; sf.Q.value = 0.5
        sg.gain.setValueAtTime(0.07, t)
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
        src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
        src.start(t); src.stop(t + 0.05)
        src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
        bgmNodes.push(src)
      } else if (d === 'O') {
        const src = ctx.createBufferSource()
        src.buffer = drumBufs.ohBuf
        const sg = ctx.createGain()
        const sf = ctx.createBiquadFilter()
        sf.type = 'highpass'; sf.frequency.value = 5000; sf.Q.value = 0.3
        sg.gain.setValueAtTime(0.06, t)
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
        src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
        src.start(t); src.stop(t + 0.12)
        src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
        bgmNodes.push(src)
      }
    }

    // ===== 6) 喜庆铃铛闪烁（每4小节一次高音点缀）=====
    if (barCount % 4 === 0) {
      const bellNotes = [1175, 1480, 1760]
      bellNotes.forEach((f, i) => {
        const t = now + beat * 3.5 + i * 0.08
        const sf = f * shift
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = sf
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.04, t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        o.connect(g); g.connect(bgmGain)
        o.start(t); o.stop(t + 0.22)
        o.onended = () => { o.disconnect(); g.disconnect() }
        bgmNodes.push(o)
      })
    }

    barCount++
  }

  // 每小节调度一次（4拍）
  const barMs = beat * 4 * 1000
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

// =============================================
// 🔥 决战BGM - 最后三轮紧张对决风格（中国风小调）
// 设计思路：用更少的音频节点 + 更长的持续音，彻底避免卡顿
// =============================================
function startFinalBGM() {
  if (bgmPlaying) return
  bgmPlaying = true

  const ctx = getCtx()
  const BPM = 138
  const beat = 60 / BPM
  const eighth = beat / 2

  // 确保鼓组Buffer已缓存
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

  // ===== A小调五声音阶 - 中国风决战 =====
  // 和弦进行: Am → Dm → Em → Am → Am → F → G → Am（8小节循环）
  const CHORDS = [
    [220, 261.6, 329.6],   // Am
    [293.7, 349.2, 440],   // Dm
    [329.6, 392, 493.9],   // Em
    [220, 261.6, 329.6],   // Am
    [220, 261.6, 329.6],   // Am
    [349.2, 440, 523.3],   // F
    [392, 493.9, 587.3],   // G
    [220, 261.6, 329.6],   // Am
  ]

  // 低音根音
  const BASS = [110, 146.8, 164.8, 110, 110, 174.6, 196, 110]

  // ===== 旋律 - 中国风戏曲/武侠决战感 =====
  // A小调五声: A(440/880) C(523/1047) D(587) E(659) G(784)
  // 8分音符 x 8 = 1小节, 0=休止
  const MELODY = [
    [659, 659, 587, 523, 587, 659, 784, 0],     // 气势开场
    [880, 0, 784, 659, 587, 0, 659, 0],          // 高音回应
    [523, 587, 659, 784, 880, 0, 784, 659],      // 英雄上行
    [587, 0, 659, 0, 0, 0, 0, 0],                // 蓄力停顿
    [880, 0, 880, 784, 659, 784, 880, 0],        // 再起冲锋
    [1047, 0, 880, 784, 880, 0, 784, 0],         // 高潮！最高音
    [659, 784, 880, 784, 659, 587, 659, 0],      // 穿梭下行
    [587, 523, 587, 659, 0, 0, 0, 0],            // 收束呼吸
  ]

  // ===== 战鼓节奏 =====
  // K=底鼓 S=军鼓 H=踩镲 T=重音鼓 .=休止
  const DRUMS = [
    'K.HSK.HS',  // 基本战鼓
    'K.HSKK.H',  // 双踢变化
    'KKH.S.HS',  // 密集开头
    'K.HSKSHT',  // 加花收尾
  ]

  let barCount = 0

  // --- 单音节点（高效版，带自动清理）---
  function fNote(f, dur, type, vol, startTime) {
    if (f <= 0) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const flt = ctx.createBiquadFilter()
    o.type = type
    o.frequency.value = f
    flt.type = 'lowpass'
    flt.frequency.value = f * 3
    flt.Q.value = 1
    g.gain.setValueAtTime(0, startTime)
    g.gain.linearRampToValueAtTime(vol, startTime + 0.01)
    g.gain.setValueAtTime(vol * 0.7, startTime + dur * 0.4)
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur)
    o.connect(flt); flt.connect(g); g.connect(bgmGain)
    o.start(startTime); o.stop(startTime + dur + 0.02)
    o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
    bgmNodes.push(o)
  }

  function scheduleBar() {
    if (!bgmPlaying) return

    // 每2小节清理旧节点引用
    if (barCount > 0 && barCount % 2 === 0) {
      const iid = bgmNodes._intervalId
      bgmNodes = []
      bgmNodes._intervalId = iid
    }

    const now = ctx.currentTime + 0.05
    const ci = barCount % CHORDS.length
    const chord = CHORDS[ci]
    const bassF = BASS[ci]
    const melody = MELODY[barCount % MELODY.length]
    const drumPat = DRUMS[barCount % DRUMS.length]

    // ===== 1) 暗色弦乐Pad（持续整小节，仅3个振荡器！）=====
    chord.forEach(f => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const flt = ctx.createBiquadFilter()
      o.type = 'sawtooth'
      o.frequency.value = f
      flt.type = 'lowpass'
      flt.frequency.value = f * 2
      flt.Q.value = 0.5
      // 缓慢起音 → 持续 → 淡出 = 弦乐质感
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(0.045, now + beat * 0.5)
      g.gain.setValueAtTime(0.04, now + beat * 3)
      g.gain.exponentialRampToValueAtTime(0.001, now + beat * 4 + 0.05)
      o.connect(flt); flt.connect(g); g.connect(bgmGain)
      o.start(now); o.stop(now + beat * 4 + 0.1)
      o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
      bgmNodes.push(o)
    })

    // ===== 2) 沉重低音（每小节2次重击）=====
    for (let b = 0; b < 2; b++) {
      const t = now + b * beat * 2
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const flt = ctx.createBiquadFilter()
      o.type = 'sawtooth'
      o.frequency.value = bassF
      flt.type = 'lowpass'
      flt.frequency.value = 200
      flt.Q.value = 4
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.15, t + 0.01)
      g.gain.setValueAtTime(0.1, t + beat * 0.5)
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.8)
      o.connect(flt); flt.connect(g); g.connect(bgmGain)
      o.start(t); o.stop(t + beat * 2)
      o.onended = () => { o.disconnect(); flt.disconnect(); g.disconnect() }
      bgmNodes.push(o)
    }

    // ===== 3) 决战旋律（二胡/笛子感 - square波 + 滤波）=====
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth
      const f = melody[i]
      if (f > 0) {
        // 主旋律
        fNote(f, eighth * 1.5, 'square', 0.08, t)
        // 柔和衬底（低八度 sine）
        fNote(f * 0.5, eighth * 1.2, 'sine', 0.025, t)
      }
    }

    // ===== 4) 战鼓（使用缓存Buffer，高效！）=====
    for (let i = 0; i < 8; i++) {
      const t = now + i * eighth
      const d = drumPat[i]
      if (d === 'K' || d === 'T') {
        // 底鼓 / 重音鼓
        const kick = ctx.createOscillator()
        const kGain = ctx.createGain()
        kick.type = 'sine'
        kick.frequency.setValueAtTime(d === 'T' ? 120 : 180, t)
        kick.frequency.exponentialRampToValueAtTime(35, t + 0.15)
        kGain.gain.setValueAtTime(d === 'T' ? 0.35 : 0.3, t)
        kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        kick.connect(kGain); kGain.connect(bgmGain)
        kick.start(t); kick.stop(t + 0.22)
        kick.onended = () => { kick.disconnect(); kGain.disconnect() }
        bgmNodes.push(kick)
      } else if (d === 'S') {
        // 军鼓
        const src = ctx.createBufferSource()
        src.buffer = drumBufs.snareBuf
        const sg = ctx.createGain()
        const sf = ctx.createBiquadFilter()
        sf.type = 'bandpass'; sf.frequency.value = 1500; sf.Q.value = 0.8
        sg.gain.setValueAtTime(0.22, t)
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
        src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
        src.start(t); src.stop(t + 0.14)
        src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
        bgmNodes.push(src)
      } else if (d === 'H') {
        // 踩镲
        const src = ctx.createBufferSource()
        src.buffer = drumBufs.chBuf
        const sg = ctx.createGain()
        const sf = ctx.createBiquadFilter()
        sf.type = 'highpass'; sf.frequency.value = 8000; sf.Q.value = 0.5
        sg.gain.setValueAtTime(0.06, t)
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
        src.connect(sf); sf.connect(sg); sg.connect(bgmGain)
        src.start(t); src.stop(t + 0.05)
        src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect() }
        bgmNodes.push(src)
      }
    }

    // ===== 5) 紧张上升音效（每4小节第4小节加入）=====
    if (barCount % 4 === 3) {
      const riser = ctx.createOscillator()
      const rGain = ctx.createGain()
      riser.type = 'sawtooth'
      riser.frequency.setValueAtTime(200, now + beat * 2)
      riser.frequency.exponentialRampToValueAtTime(800, now + beat * 4)
      rGain.gain.setValueAtTime(0, now + beat * 2)
      rGain.gain.linearRampToValueAtTime(0.03, now + beat * 3)
      rGain.gain.exponentialRampToValueAtTime(0.001, now + beat * 4 + 0.05)
      riser.connect(rGain); rGain.connect(bgmGain)
      riser.start(now + beat * 2); riser.stop(now + beat * 4 + 0.1)
      riser.onended = () => { riser.disconnect(); rGain.disconnect() }
      bgmNodes.push(riser)
    }

    // ===== 6) 心跳低频脉冲（增加紧迫感）=====
    if (barCount % 2 === 0) {
      for (let p = 0; p < 4; p++) {
        const t = now + p * beat
        const hb = ctx.createOscillator()
        const hbG = ctx.createGain()
        hb.type = 'sine'
        hb.frequency.value = 45
        hbG.gain.setValueAtTime(0, t)
        hbG.gain.linearRampToValueAtTime(0.06, t + 0.02)
        hbG.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
        hb.connect(hbG); hbG.connect(bgmGain)
        hb.start(t); hb.stop(t + 0.18)
        hb.onended = () => { hb.disconnect(); hbG.disconnect() }
        bgmNodes.push(hb)
      }
    }

    barCount++
  }

  // 每小节调度一次（4拍）
  const barMs = beat * 4 * 1000
  scheduleBar()
  const intervalId = setInterval(scheduleBar, barMs)
  bgmNodes._intervalId = intervalId
}

// 切换到决战BGM（最后三轮使用）
export function speedUpBGM() {
  stopBGM()
  // 短暂延迟确保干净切换
  setTimeout(() => startFinalBGM(), 100)
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
