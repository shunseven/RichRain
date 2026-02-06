// ===== 所有编辑器界面 =====
import { store, genId, generateAvatar, CHARACTER_COLORS, NPC_COLORS } from './store.js'
import { saveImage, getImage, resolveAllImages, fileToBase64, genImageId, isIdbSrc } from './imageDB.js'

// ===== 通用编辑器框架 =====
function createEditorLayout(container, title, onBack) {
  container.innerHTML = `
    <div class="editor-screen">
      <div class="editor-header">
        <button class="btn-back" id="btn-back">← 返回</button>
        <h2>${title}</h2>
        <button class="btn-add" id="btn-add">+ 新增</button>
      </div>
      <div class="editor-body">
        <div class="item-grid" id="item-grid"></div>
      </div>
    </div>
  `
  container.querySelector('#btn-back').addEventListener('click', () => onBack('menu'))
  return {
    grid: container.querySelector('#item-grid'),
    addBtn: container.querySelector('#btn-add'),
  }
}

// 通用弹窗
function showModal(container, title, fields, data, onSave, onCancel) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'

  const fieldsHtml = fields.map(f => {
    const val = data[f.key] || f.default || ''
    if (f.type === 'select') {
      return `<div class="form-group"><label>${f.label}</label><select name="${f.key}">${f.options.map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`
    }
    if (f.type === 'textarea') {
      return `<div class="form-group"><label>${f.label}</label><textarea name="${f.key}">${val}</textarea></div>`
    }
    if (f.type === 'number') {
      return `<div class="form-group"><label>${f.label}</label><input type="number" name="${f.key}" value="${val}" min="${f.min || 0}" max="${f.max || 9999}"/></div>`
    }
    if (f.type === 'color') {
      return `<div class="form-group"><label>${f.label}</label><div style="display:flex;gap:8px;flex-wrap:wrap">${f.colors.map(c => `<div class="color-opt" data-color="${c}" style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${val === c ? '#ffd700' : 'transparent'};transition:all 0.2s"></div>`).join('')}</div><input type="hidden" name="${f.key}" value="${val}"/></div>`
    }
    if (f.type === 'icon-url') {
      return `<div class="form-group"><label>${f.label}</label><div class="icon-selector"><div class="icon-preview-small" id="icon-preview-${f.key}"><img src="${val}" alt="图标"/></div><input type="text" name="${f.key}" value="${val}" placeholder="输入图片URL 或点击上传" style="flex:1"/><label class="btn-upload" for="upload-${f.key}">📁 上传</label><input type="file" id="upload-${f.key}" data-field="${f.key}" data-preview="icon-preview-${f.key}" class="file-upload-input" accept="image/*" style="display:none"/></div></div>`
    }
    if (f.type === 'avatar-upload') {
      return `<div class="form-group"><label>${f.label}</label><div class="avatar-upload-area"><div class="icon-preview-small" id="icon-preview-${f.key}"><img src="${val}" alt="头像"/></div><div class="avatar-upload-btns"><label class="btn-upload" for="upload-${f.key}">📁 上传头像</label><button type="button" class="btn-avatar-reset" data-field="${f.key}">🔄 恢复默认</button></div><input type="file" id="upload-${f.key}" data-field="${f.key}" data-preview="icon-preview-${f.key}" class="file-upload-input" accept="image/*" style="display:none"/><input type="hidden" name="${f.key}" value="${val}"/></div></div>`
    }
    return `<div class="form-group"><label>${f.label}</label><input type="text" name="${f.key}" value="${val}"/></div>`
  }).join('')

  overlay.innerHTML = `
    <div class="modal">
      <h3>${title}</h3>
      ${fieldsHtml}
      <div class="form-actions">
        <button class="btn-cancel" id="modal-cancel">取消</button>
        <button class="btn-save" id="modal-save">保存</button>
      </div>
    </div>
  `

  container.appendChild(overlay)

  // 颜色选择器逻辑
  overlay.querySelectorAll('.color-opt').forEach(el => {
    el.addEventListener('click', () => {
      const inputName = el.parentElement.parentElement.querySelector('input[type=hidden]').name
      overlay.querySelectorAll(`.color-opt`).forEach(o => o.style.border = '3px solid transparent')
      el.style.border = '3px solid #ffd700'
      overlay.querySelector(`input[name="${inputName}"]`).value = el.dataset.color
    })
  })

  // 图标/图片URL实时预览（支持所有 icon-url 类型字段）
  overlay.querySelectorAll('.icon-selector input[type="text"]').forEach(input => {
    input.addEventListener('input', () => {
      const fieldKey = input.name
      const preview = overlay.querySelector(`#icon-preview-${fieldKey} img`)
      if (preview) {
        const val = input.value
        if (isIdbSrc(val)) {
          getImage(val.slice(4)).then(imgData => { if (imgData) preview.src = imgData })
        } else {
          preview.src = val
        }
      }
    })
  })

  // 文件上传处理（icon-url 和 avatar-upload 共用）
  overlay.querySelectorAll('.file-upload-input').forEach(fileInput => {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const base64 = await fileToBase64(file)
        const imageId = genImageId()
        await saveImage(imageId, base64)
        const fieldKey = fileInput.dataset.field
        // 更新文本输入或隐藏输入
        const textInput = overlay.querySelector(`input[name="${fieldKey}"]`)
        if (textInput) textInput.value = `idb:${imageId}`
        // 更新预览
        const previewId = fileInput.dataset.preview
        const preview = overlay.querySelector(`#${previewId} img`)
        if (preview) preview.src = base64
      } catch (err) {
        console.error('图片上传失败:', err)
        alert('图片上传失败，请重试')
      }
    })
  })

  // 头像恢复默认按钮处理
  overlay.querySelectorAll('.btn-avatar-reset').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldKey = btn.dataset.field
      const hiddenInput = overlay.querySelector(`input[name="${fieldKey}"]`)
      if (hiddenInput) hiddenInput.value = ''
      const preview = overlay.querySelector(`#icon-preview-${fieldKey} img`)
      if (preview) preview.src = ''
    })
  })

  // 解析弹窗内的 idb: 图片
  resolveAllImages(overlay)

  overlay.querySelector('#modal-cancel').addEventListener('click', () => {
    overlay.remove()
    if (onCancel) onCancel()
  })

  overlay.querySelector('#modal-save').addEventListener('click', () => {
    const formData = {}
    fields.forEach(f => {
      const el = overlay.querySelector(`[name="${f.key}"]`)
      if (el) {
        formData[f.key] = f.type === 'number' ? parseInt(el.value) || 0 : el.value
      }
    })
    overlay.remove()
    onSave(formData)
  })

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove()
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)
}

// ===== 角色编辑器 =====
export function showCharacterEditor(container, navigate) {
  const { grid, addBtn } = createEditorLayout(container, '👤 角色编辑', navigate)

  function render() {
    const chars = store.getCharacters()
    grid.innerHTML = chars.map(c => `
      <div class="item-card">
        <div class="icon-preview"><img src="${c.avatar}" alt="${c.name}"/></div>
        <div class="item-name">${c.name}</div>
        <div class="item-info" style="color:${c.color}">● ${c.color}</div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${c.id}">编辑</button>
          <button class="btn-delete" data-id="${c.id}">删除</button>
        </div>
      </div>
    `).join('')

    // 解析 idb: 图片
    resolveAllImages(grid)

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = chars.find(c => c.id === btn.dataset.id)
        if (!char) return
        showCharModal(char, (data) => {
          // 如果没有自定义头像，则自动生成
          if (!data.avatar || !data.avatar.trim()) {
            data.avatar = generateAvatar(data.name, data.color)
          }
          store.updateCharacter(char.id, data)
          render()
        })
      })
    })

    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定要删除这个角色吗？')) {
          store.deleteCharacter(btn.dataset.id)
          render()
        }
      })
    })
  }

  function showCharModal(data = {}, onSave) {
    showModal(container, data.id ? '编辑角色' : '新增角色', [
      { key: 'name', label: '角色名称', type: 'text' },
      { key: 'color', label: '角色颜色', type: 'color', colors: CHARACTER_COLORS },
      { key: 'avatar', label: '自定义头像 (可选，不填则自动生成)', type: 'avatar-upload' },
    ], data, onSave)
  }

  addBtn.addEventListener('click', () => {
    showCharModal({ color: CHARACTER_COLORS[0] }, (data) => {
      if (!data.name) { alert('请输入角色名称'); return }
      // 如果没有自定义头像，则自动生成
      if (!data.avatar || !data.avatar.trim()) {
        data.avatar = generateAvatar(data.name, data.color)
      }
      store.addCharacter(data)
      render()
    })
  })

  render()
}

// ===== NPC编辑器 =====
export function showNpcEditor(container, navigate) {
  const { grid, addBtn } = createEditorLayout(container, '🧓 NPC编辑', navigate)

  function render() {
    const npcs = store.getNpcs()
    grid.innerHTML = npcs.map(n => `
      <div class="item-card">
        <div class="icon-preview"><img src="${n.avatar}" alt="${n.name}"/></div>
        <div class="item-name">${n.name}</div>
        <div class="item-info" style="color:${n.color}">● ${n.color}</div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${n.id}">编辑</button>
          <button class="btn-delete" data-id="${n.id}">删除</button>
        </div>
      </div>
    `).join('')

    // 解析 idb: 图片
    resolveAllImages(grid)

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const npc = npcs.find(n => n.id === btn.dataset.id)
        if (!npc) return
        showModal(container, '编辑NPC', [
          { key: 'name', label: 'NPC名称', type: 'text' },
          { key: 'color', label: 'NPC颜色', type: 'color', colors: NPC_COLORS },
          { key: 'avatar', label: '自定义头像 (可选，不填则自动生成)', type: 'avatar-upload' },
        ], npc, (data) => {
          if (!data.avatar || !data.avatar.trim()) {
            data.avatar = generateAvatar(data.name, data.color)
          }
          store.updateNpc(npc.id, data)
          render()
        })
      })
    })

    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定要删除这个NPC吗？')) {
          store.deleteNpc(btn.dataset.id)
          render()
        }
      })
    })
  }

  addBtn.addEventListener('click', () => {
    showModal(container, '新增NPC', [
      { key: 'name', label: 'NPC名称', type: 'text' },
      { key: 'color', label: 'NPC颜色', type: 'color', colors: NPC_COLORS },
      { key: 'avatar', label: '自定义头像 (可选，不填则自动生成)', type: 'avatar-upload' },
    ], { color: NPC_COLORS[0] }, (data) => {
      if (!data.name) { alert('请输入NPC名称'); return }
      if (!data.avatar || !data.avatar.trim()) {
        data.avatar = generateAvatar(data.name, data.color)
      }
      store.addNpc(data)
      render()
    })
  })

  render()
}

// ===== 小游戏编辑器 =====
export function showMiniGameEditor(container, navigate) {
  const { grid, addBtn } = createEditorLayout(container, '🎮 小游戏编辑', navigate)

  function render() {
    const games = store.getMiniGames()
    grid.innerHTML = games.map(g => `
      <div class="item-card">
        <div class="icon-preview"><img src="${g.icon}" alt="${g.name}"/></div>
        <div class="item-name">${g.name}</div>
        <div class="item-info">概率: ${g.probability}% | 次数: ${g.maxCount}</div>
        <div class="item-info" style="color:#00cec9">${g.winCondition}</div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${g.id}">编辑</button>
          <button class="btn-delete" data-id="${g.id}">删除</button>
        </div>
      </div>
    `).join('')

    // 解析 idb: 图片
    resolveAllImages(grid)

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = games.find(g => g.id === btn.dataset.id)
        if (!game) return
        showGameModal(game, (data) => {
          data.remainingCount = data.maxCount
          store.updateMiniGame(game.id, data)
          render()
        })
      })
    })

    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定要删除这个小游戏吗？')) {
          store.deleteMiniGame(btn.dataset.id)
          render()
        }
      })
    })
  }

  function showGameModal(data = {}, onSave) {
    showModal(container, data.id ? '编辑小游戏' : '新增小游戏', [
      { key: 'name', label: '游戏名称', type: 'text' },
      { key: 'icon', label: '游戏图标', type: 'icon-url' },
      { key: 'probability', label: '出现概率 (1-100)', type: 'number', min: 1, max: 100, default: 50 },
      { key: 'maxCount', label: '最大出现次数', type: 'number', min: 1, max: 999, default: 100 },
      { key: 'winCondition', label: '胜利条件', type: 'text' },
    ], data, onSave)
  }

  addBtn.addEventListener('click', () => {
    showGameModal({ probability: 50, maxCount: 100, icon: '' }, (data) => {
      if (!data.name) { alert('请输入游戏名称'); return }
      data.remainingCount = data.maxCount
      store.addMiniGame(data)
      render()
    })
  })

  render()
}

// ===== 随机事件编辑器 =====
export function showEventEditor(container, navigate) {
  const { grid, addBtn } = createEditorLayout(container, '🎁 随机事件编辑', navigate)

  function render() {
    const events = store.getEvents()
    grid.innerHTML = events.map(e => `
      <div class="item-card">
        <div class="icon-preview"><img src="${e.icon}" alt="${e.name}"/></div>
        <div class="item-name">${e.name}</div>
        <div class="item-info">${e.type === 'reward' ? '🎁 奖励' : '😤 惩罚'}</div>
        <div class="item-info" style="color:rgba(255,255,255,0.5)">${e.description || ''}</div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${e.id}">编辑</button>
          <button class="btn-delete" data-id="${e.id}">删除</button>
        </div>
      </div>
    `).join('')

    // 解析 idb: 图片
    resolveAllImages(grid)

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const ev = events.find(e => e.id === btn.dataset.id)
        if (!ev) return
        showEventModal(ev, (data) => {
          store.updateEvent(ev.id, data)
          render()
        })
      })
    })

    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定要删除这个事件吗？')) {
          store.deleteEvent(btn.dataset.id)
          render()
        }
      })
    })
  }

  function showEventModal(data = {}, onSave) {
    showModal(container, data.id ? '编辑事件' : '新增事件', [
      { key: 'name', label: '事件名称', type: 'text' },
      { key: 'icon', label: '事件图标', type: 'icon-url' },
      { key: 'type', label: '事件类型', type: 'select', options: [
        { value: 'reward', label: '🎁 奖励' },
        { value: 'punishment', label: '😤 惩罚' },
      ]},
      { key: 'description', label: '描述', type: 'text' },
    ], data, onSave)
  }

  addBtn.addEventListener('click', () => {
    showEventModal({ type: 'reward', icon: '' }, (data) => {
      if (!data.name) { alert('请输入事件名称'); return }
      store.addEvent(data)
      render()
    })
  })

  render()
}

// ===== NPC事件编辑器 =====
export function showNpcEventEditor(container, navigate) {
  const { grid, addBtn } = createEditorLayout(container, '🤝 NPC事件编辑', navigate)

  function render() {
    const events = store.getNpcEvents()
    grid.innerHTML = events.map(e => `
      <div class="item-card">
        <div class="icon-preview"><img src="${e.icon}" alt="${e.name}"/></div>
        <div class="item-name">${e.name}</div>
        <div class="item-info">${e.type === 'reward' ? '🎁 奖励' : '😤 惩罚'}</div>
        <div class="item-info" style="color:rgba(255,255,255,0.5)">${e.description || ''}</div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${e.id}">编辑</button>
          <button class="btn-delete" data-id="${e.id}">删除</button>
        </div>
      </div>
    `).join('')

    // 解析 idb: 图片
    resolveAllImages(grid)

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const ev = events.find(e => e.id === btn.dataset.id)
        if (!ev) return
        showEventModal(ev, (data) => {
          store.updateNpcEvent(ev.id, data)
          render()
        })
      })
    })

    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定要删除这个NPC事件吗？')) {
          store.deleteNpcEvent(btn.dataset.id)
          render()
        }
      })
    })
  }

  function showEventModal(data = {}, onSave) {
    showModal(container, data.id ? '编辑NPC事件' : '新增NPC事件', [
      { key: 'name', label: '事件名称', type: 'text' },
      { key: 'icon', label: '事件图标', type: 'icon-url' },
      { key: 'type', label: '事件类型', type: 'select', options: [
        { value: 'reward', label: '🎁 奖励' },
        { value: 'punishment', label: '😤 惩罚' },
      ]},
      { key: 'description', label: '描述', type: 'text' },
    ], data, onSave)
  }

  addBtn.addEventListener('click', () => {
    showEventModal({ type: 'reward', icon: '' }, (data) => {
      if (!data.name) { alert('请输入NPC事件名称'); return }
      store.addNpcEvent(data)
      render()
    })
  })

  render()
}

// ===== 最终大奖编辑器 =====
export function showPrizeEditor(container, navigate) {
  container.innerHTML = `
    <div class="editor-screen">
      <div class="editor-header">
        <button class="btn-back" id="btn-back">← 返回</button>
        <h2>🏆 最终大奖设定</h2>
        <div></div>
      </div>
      <div class="editor-body" style="display:flex;align-items:center;justify-content:center">
        <div id="prize-form" style="text-align:center"></div>
      </div>
    </div>
  `

  container.querySelector('#btn-back').addEventListener('click', () => navigate('menu'))

  const prize = store.getFinalPrize()
  const form = container.querySelector('#prize-form')

  form.innerHTML = `
    <div style="margin-bottom:30px">
      <div class="icon-preview" style="width:150px;height:150px;margin:0 auto 20px;border-radius:20px;border:2px solid rgba(255,215,0,0.3);background:rgba(255,255,255,0.05)">
        <img id="prize-icon-preview" src="${prize.icon}" alt="大奖" style="width:100%;height:100%"/>
      </div>
    </div>
    <div class="form-group" style="max-width:400px;margin:0 auto">
      <label>大奖名称</label>
      <input type="text" id="prize-name" value="${prize.name || ''}" />
    </div>
    <div class="form-group" style="max-width:400px;margin:15px auto 0">
      <label>图标 (输入URL 或点击上传图片)</label>
      <div class="icon-selector">
        <input type="text" id="prize-icon" value="${prize.icon || ''}" style="flex:1"/>
        <label class="btn-upload" for="prize-icon-upload">📁 上传</label>
        <input type="file" id="prize-icon-upload" accept="image/*" style="display:none"/>
      </div>
    </div>
    <button class="btn-save" id="prize-save" style="margin-top:25px;padding:12px 40px;font-size:1.1em">保存设定</button>
  `

  // 解析 idb: 图片
  resolveAllImages(form)

  const iconInput = form.querySelector('#prize-icon')
  iconInput.addEventListener('input', () => {
    const val = iconInput.value
    const preview = form.querySelector('#prize-icon-preview')
    if (isIdbSrc(val)) {
      getImage(val.slice(4)).then(imgData => { if (imgData) preview.src = imgData })
    } else {
      preview.src = val
    }
  })

  // 文件上传处理
  form.querySelector('#prize-icon-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      const imageId = genImageId()
      await saveImage(imageId, base64)
      iconInput.value = `idb:${imageId}`
      form.querySelector('#prize-icon-preview').src = base64
    } catch (err) {
      console.error('图片上传失败:', err)
      alert('图片上传失败，请重试')
    }
  })

  form.querySelector('#prize-save').addEventListener('click', () => {
    const name = form.querySelector('#prize-name').value
    const icon = form.querySelector('#prize-icon').value
    if (!name) { alert('请输入大奖名称'); return }
    store.saveFinalPrize({ name, icon })
    alert('✅ 大奖设定已保存！')
  })
}
