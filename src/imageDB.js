// ===== IndexedDB 图片存储模块 =====
const DB_NAME = 'RichRainImages'
const DB_VERSION = 1
const STORE_NAME = 'images'

let dbInstance = null

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = (e) => {
      dbInstance = e.target.result
      resolve(dbInstance)
    }
    request.onerror = (e) => reject(e.target.error)
  })
}

// 保存图片到 IndexedDB
export async function saveImage(id, base64) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id, data: base64 })
    tx.oncomplete = () => resolve(id)
    tx.onerror = (e) => reject(e.target.error)
  })
}

// 从 IndexedDB 获取图片
export async function getImage(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result?.data || null)
    request.onerror = (e) => reject(e.target.error)
  })
}

// 删除图片
export async function deleteImage(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// 判断是否为 IndexedDB 引用
export function isIdbSrc(src) {
  return typeof src === 'string' && src.startsWith('idb:')
}

// 获取 IndexedDB 图片 ID
export function getIdbId(src) {
  return src.slice(4)
}

// 解析容器内所有 idb: 图片引用，从 IndexedDB 加载真实 base64
export async function resolveAllImages(container) {
  if (!container) return
  const imgs = container.querySelectorAll('img')
  const promises = []
  imgs.forEach(img => {
    const rawSrc = img.getAttribute('src') || ''
    if (isIdbSrc(rawSrc)) {
      const id = getIdbId(rawSrc)
      promises.push(
        getImage(id).then(data => {
          if (data) {
            img.src = data
            img.removeAttribute('data-idb-pending')
          }
        }).catch(() => {})
      )
    }
  })
  if (promises.length > 0) await Promise.all(promises)
}

// 将 File 对象转为 base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 生成唯一图片 ID
let imgUid = Date.now()
export function genImageId() {
  return `img_${imgUid++}`
}
