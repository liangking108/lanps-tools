<script setup>
/**
 * ImageCompressor.vue —— 图片批量压缩
 * 全程在浏览器本地用 Canvas 处理，图片不会上传到任何服务器。
 */
import { ref, computed, onUnmounted } from 'vue'

const MAX_WIDTH_OPTIONS = [
  { label: '不限宽', value: 0 },
  { label: '1920px', value: 1920 },
  { label: '1600px', value: 1600 },
  { label: '1200px', value: 1200 },
  { label: '800px', value: 800 }
]

const settings = ref({
  maxWidth: 1600,
  quality: 0.82,
  format: 'image/webp'
})

const items = ref([]) // { id, file, name, before, after, ratio, url, outUrl, outName, w, h, outW, outH, status }
const dragging = ref(false)
const working = ref(false)

const totalBefore = computed(() => items.value.reduce((sum, i) => sum + (i.before || 0), 0))
const totalAfter = computed(() => items.value.reduce((sum, i) => sum + (i.after || 0), 0))
const savedPercent = computed(() => {
  if (!totalBefore.value) return 0
  return Math.round((1 - totalAfter.value / totalBefore.value) * 100)
})

/* ---------- 工具函数 ---------- */
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function extOf(mime) {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg') return 'jpg'
  return 'png'
}

/** 读取图片尺寸并绘制到 canvas，再导出 Blob */
async function compress(item) {
  const { file } = item
  const { maxWidth, quality, format } = settings.value

  // createImageBitmap 比 new Image() 更快，且不占用 DOM
  const bitmap = await createImageBitmap(file)
  const srcW = bitmap.width
  const srcH = bitmap.height

  let targetW = srcW
  let targetH = srcH
  if (maxWidth && srcW > maxWidth) {
    targetW = maxWidth
    targetH = Math.round((srcH * maxWidth) / srcW)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  // 白底：JPEG 不支持透明，透明区会变黑
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality))
  if (!blob) throw new Error('导出失败')

  // 重新压缩时先释放上一次的 Blob URL，否则每改一次参数就漏一份内存
  if (item.outUrl) URL.revokeObjectURL(item.outUrl)

  item.after = blob.size
  item.w = srcW
  item.h = srcH
  item.outW = targetW
  item.outH = targetH
  item.ratio = Math.round((1 - blob.size / file.size) * 100)
  item.outUrl = URL.createObjectURL(blob)
  item.outName = file.name.replace(/\.[^.]+$/, '') + '.' + extOf(format)
  item.status = 'done'
}

/* ---------- 添加文件 ---------- */
function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
  if (!files.length) return

  const next = files.map((file) => ({
    id: Math.random().toString(36).slice(2),
    file,
    name: file.name,
    before: file.size,
    after: null,
    ratio: 0,
    url: URL.createObjectURL(file),
    outUrl: '',
    outName: '',
    w: 0,
    h: 0,
    outW: 0,
    outH: 0,
    status: 'pending',
    error: ''
  }))

  items.value = [...items.value, ...next]
  runAll()
}

/** 把还没处理的 / 需要重算的全部跑一遍 */
async function runAll() {
  working.value = true
  for (const item of items.value) {
    item.status = 'pending'
    item.error = ''
    try {
      await compress(item)
    } catch (e) {
      item.status = 'error'
      item.error = e.message || '处理失败'
    }
  }
  working.value = false
}

function onDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer?.files || [])
}

function onPick(e) {
  addFiles(e.target.files || [])
  e.target.value = '' // 允许重复选同一张
}

/* ---------- 下载 ---------- */
function download(item) {
  if (!item.outUrl) return
  const a = document.createElement('a')
  a.href = item.outUrl
  a.download = item.outName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadAll() {
  items.value.filter((i) => i.outUrl).forEach((item, index) => {
    // 连续触发浏览器可能拦，给一点间隔
    setTimeout(() => download(item), index * 260)
  })
}

function removeItem(id) {
  const item = items.value.find((i) => i.id === id)
  if (item) {
    URL.revokeObjectURL(item.url)
    if (item.outUrl) URL.revokeObjectURL(item.outUrl)
  }
  items.value = items.value.filter((i) => i.id !== id)
}

function clearAll() {
  items.value.forEach((item) => {
    URL.revokeObjectURL(item.url)
    if (item.outUrl) URL.revokeObjectURL(item.outUrl)
  })
  items.value = []
}

// 组件卸载时释放 objectURL，避免内存泄漏
onUnmounted(clearAll)
</script>

<template>
  <div class="img">
    <!-- 设置 -->
    <section class="panel">
      <div class="panel__title">
        <span>压缩设置</span>
        <span class="panel__hint">本地 Canvas 处理，不上传</span>
      </div>

      <div class="settings">
        <div class="field">
          <label class="label">最大宽度</label>
          <select v-model.number="settings.maxWidth" class="select" @change="runAll">
            <option v-for="opt in MAX_WIDTH_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="label">输出格式</label>
          <select v-model="settings.format" class="select" @change="runAll">
            <option value="image/webp">WebP（推荐）</option>
            <option value="image/jpeg">JPEG</option>
          </select>
        </div>

        <div class="field">
          <label class="label">
            质量
            <span class="value">{{ Math.round(settings.quality * 100) }}</span>
          </label>
          <input
            v-model.number="settings.quality"
            type="range"
            min="0.4"
            max="0.95"
            step="0.01"
            @change="runAll"
          />
          <span class="hint">低于 60 会明显糊；80 左右基本看不出差别</span>
        </div>
      </div>
    </section>

    <!-- 拖拽区 -->
    <label
      class="drop"
      :class="{ 'is-dragging': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input type="file" accept="image/*" multiple hidden @change="onPick" />
      <span class="drop__icon" aria-hidden="true">↓</span>
      <span class="drop__text">把图片拖进来，或点击选择</span>
      <span class="hint">支持批量 · JPG / PNG / WebP</span>
    </label>

    <!-- 汇总 -->
    <section v-if="items.length" class="panel summary">
      <div class="stat">
        <span class="stat__label">张数</span>
        <span class="stat__value">{{ items.length }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">原始</span>
        <span class="stat__value">{{ formatSize(totalBefore) }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">压缩后</span>
        <span class="stat__value">{{ formatSize(totalAfter) }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">减少</span>
        <span class="stat__value accent">{{ savedPercent }}%</span>
      </div>
      <div class="summary__actions">
        <button class="btn btn--sm btn--primary" :disabled="!totalAfter" @click="downloadAll">全部下载</button>
        <button class="btn btn--sm btn--ghost" @click="clearAll">清空</button>
      </div>
    </section>

    <!-- 列表 -->
    <section v-if="items.length" class="list">
      <article v-for="item in items" :key="item.id" class="item panel">
        <img class="item__thumb" :src="item.outUrl || item.url" :alt="item.name" loading="lazy" />

        <div class="item__info">
          <h4 class="item__name" :title="item.name">{{ item.name }}</h4>
          <p class="item__meta mono">
            <template v-if="item.status === 'done'">
              {{ item.w }}×{{ item.h }} → {{ item.outW }}×{{ item.outH }}
            </template>
            <template v-else-if="item.status === 'error'">{{ item.error }}</template>
            <template v-else>处理中…</template>
          </p>
        </div>

        <div class="item__size">
          <span class="mono">{{ formatSize(item.before) }}</span>
          <span class="arrow" aria-hidden="true">→</span>
          <span class="mono strong">{{ formatSize(item.after) }}</span>
        </div>

        <span v-if="item.status === 'done'" class="item__ratio" :class="{ good: item.ratio >= 40 }">
          −{{ Math.max(item.ratio, 0) }}%
        </span>

        <div class="item__actions">
          <button class="btn btn--sm" :disabled="!item.outUrl" @click="download(item)">下载</button>
          <button class="icon-btn" aria-label="移除" @click="removeItem(item.id)">×</button>
        </div>
      </article>
    </section>

    <div v-else class="hint empty-hint">还没有图片 —— 拖几张进来，或点上面的区域选择文件。</div>

    <p v-if="working" class="hint working">正在处理，请稍候…</p>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.value {
  color: var(--accent);
  font-family: var(--font-mono);
  margin-left: 6px;
}

/* ---------- 拖拽区 ---------- */
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  padding: 38px 20px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
  background: var(--ink-2);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.25s var(--ease), background 0.25s var(--ease);
}

.drop:hover,
.drop.is-dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.drop__icon {
  font-size: 20px;
  color: var(--accent);
}

.drop__text {
  font-size: 14px;
}

/* ---------- 汇总 ---------- */
.summary {
  display: flex;
  align-items: center;
  gap: 26px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat__label {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--dim);
  text-transform: uppercase;
}

.stat__value {
  font-family: var(--font-mono);
  font-size: 15px;
}

.accent {
  color: var(--accent);
}

.summary__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* ---------- 列表 ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
}

.item__thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  flex: none;
  background: var(--ink-3);
}

.item__info {
  min-width: 0;
  flex: 1;
}

.item__name {
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item__meta {
  color: var(--dim);
}

.item__size {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
  flex: none;
}

.strong {
  color: var(--paper);
}

.arrow {
  color: var(--dim);
}

.item__ratio {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--muted);
  border: 1px solid var(--line);
  flex: none;
}

.item__ratio.good {
  color: var(--ok);
  border-color: rgba(111, 207, 151, 0.35);
  background: rgba(111, 207, 151, 0.08);
}

.item__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  line-height: 1;
  transition: color 0.2s, border-color 0.2s;
}

.icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.working {
  margin-top: 10px;
}

.empty-hint {
  margin-top: 14px;
  text-align: center;
}

@media (max-width: 780px) {
  .settings {
    grid-template-columns: 1fr;
  }

  .item {
    flex-wrap: wrap;
  }

  .item__info {
    flex: 1 1 120px;
  }

  .item__size {
    order: 4;
  }

  .summary__actions {
    margin-left: 0;
    width: 100%;
  }
}
</style>
