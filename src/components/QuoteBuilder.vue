<script setup>
/**
 * QuoteBuilder.vue —— 报价单生成
 * 算钱逻辑全在前端，输出是可打印 / 可存 PDF 的报价单。
 */
import { ref, computed, onMounted, watch } from 'vue'

const STORAGE_KEY = 'lanps:quote:draft'

// 常见页面类型的默认单价（可手动改）
const PAGE_PRESETS = [
  { type: '首页', price: 1500 },
  { type: '内页', price: 600 },
  { type: '落地页', price: 900 },
  { type: '工具 / 交互页', price: 1200 },
  { type: '后台页面', price: 1500 }
]

const EXTRAS_LIBRARY = [
  { id: 'responsive', name: '三端响应式适配', amount: 0, enabled: true, note: '含手机 / 平板 / 桌面' },
  { id: 'seo', name: '基础 SEO 与性能优化', amount: 400, enabled: true, note: '语义化结构、图片优化、元信息' },
  { id: 'cms', name: '内容后台 / 数据接口', amount: 1200, enabled: false, note: '需要服务端配合' },
  { id: 'ai', name: 'AI 能力接入', amount: 800, enabled: false, note: '文案 / 客服 / 图像处理' },
  { id: 'rush', name: '加急交付（压缩 50% 工期）', amount: 600, enabled: false, note: '' }
]

const meta = ref({
  client: '',
  project: '',
  date: new Date().toISOString().slice(0, 10),
  author: '梁皓钧',
  contact: '15629919878',
  validDays: 14
})

const items = ref([{ id: Date.now(), type: '首页', price: 1500, qty: 1, note: '' }])
const extras = ref(EXTRAS_LIBRARY.map((e) => ({ ...e })))
const discount = ref(0) // 百分比
const deposit = ref(50) // 百分比

/* ---------- 计算 ---------- */
const subtotal = computed(() =>
  items.value.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
)

const extrasTotal = computed(() =>
  extras.value.filter((e) => e.enabled).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const gross = computed(() => subtotal.value + extrasTotal.value)

const discountAmount = computed(() =>
  Math.round(gross.value * ((Number(discount.value) || 0) / 100))
)

const total = computed(() => Math.max(gross.value - discountAmount.value, 0))

const depositAmount = computed(() =>
  Math.round(total.value * ((Number(deposit.value) || 0) / 100))
)

const balance = computed(() => total.value - depositAmount.value)

const money = (n) => '¥' + (Number(n) || 0).toLocaleString('zh-CN')

/* ---------- 操作 ---------- */
function addItem() {
  items.value.push({ id: Date.now() + Math.random(), type: '内页', price: 600, qty: 1, note: '' })
}

function removeItem(id) {
  if (items.value.length === 1) {
    items.value = [{ id: Date.now(), type: '首页', price: 1500, qty: 1, note: '' }]
    return
  }
  items.value = items.value.filter((i) => i.id !== id)
}

function applyPreset(item) {
  const preset = PAGE_PRESETS.find((p) => p.type === item.type)
  if (preset) item.price = preset.price
}

function print() {
  window.print()
}

function reset() {
  meta.value = {
    client: '',
    project: '',
    date: new Date().toISOString().slice(0, 10),
    author: '梁皓钧',
    contact: '15629919878',
    validDays: 14
  }
  items.value = [{ id: Date.now(), type: '首页', price: 1500, qty: 1, note: '' }]
  extras.value = EXTRAS_LIBRARY.map((e) => ({ ...e }))
  discount.value = 0
  deposit.value = 50
}

/* ---------- 草稿持久化 ---------- */
function save() {
  const data = {
    meta: meta.value,
    items: items.value,
    extras: extras.value,
    discount: discount.value,
    deposit: deposit.value
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    saved.value = true
    setTimeout(() => (saved.value = false), 1600)
  } catch {
    /* 忽略 */
  }
}

const saved = ref(false)

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data.meta) meta.value = data.meta
    if (Array.isArray(data.items) && data.items.length) items.value = data.items
    if (Array.isArray(data.extras) && data.extras.length) extras.value = data.extras
    if (typeof data.discount === 'number') discount.value = data.discount
    if (typeof data.deposit === 'number') deposit.value = data.deposit
  } catch {
    /* 忽略 */
  }
})

// 改了就自动存草稿（防手滑刷新丢数据）
let timer = null
watch(
  [meta, items, extras, discount, deposit],
  () => {
    clearTimeout(timer)
    timer = setTimeout(save, 900)
  },
  { deep: true }
)
</script>

<template>
  <div class="quote">
    <div class="layout">
      <!-- 左：编辑（打印时隐藏） -->
      <div class="editor no-print">
        <section class="panel">
          <div class="panel__title">
            <span>项目信息</span>
            <span class="panel__hint">自动存草稿</span>
          </div>

          <div class="field">
            <label class="label" for="client">客户名称</label>
            <input id="client" v-model="meta.client" class="input" placeholder="例：巷子里咖啡" />
          </div>

          <div class="field">
            <label class="label" for="project">项目名称</label>
            <input id="project" v-model="meta.project" class="input" placeholder="例：品牌官网建设" />
          </div>

          <div class="row-2">
            <div class="field">
              <label class="label" for="date">报价日期</label>
              <input id="date" v-model="meta.date" class="input" type="date" />
            </div>
            <div class="field">
              <label class="label" for="valid">有效期（天）</label>
              <input id="valid" v-model.number="meta.validDays" class="input" type="number" min="1" />
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__title">
            <span>明细</span>
            <button class="btn btn--sm" @click="addItem">+ 加一行</button>
          </div>

          <ul class="rows">
            <li v-for="item in items" :key="item.id" class="row">
              <select v-model="item.type" class="select row__type" @change="applyPreset(item)">
                <option v-for="p in PAGE_PRESETS" :key="p.type" :value="p.type">{{ p.type }}</option>
              </select>

              <input v-model.number="item.qty" class="input row__qty" type="number" min="1" aria-label="数量" />

              <div class="row__price">
                <span class="unit">¥</span>
                <input v-model.number="item.price" class="input" type="number" min="0" step="50" aria-label="单价" />
              </div>

              <span class="row__sum mono">{{ money(item.price * item.qty) }}</span>

              <button class="icon-btn" aria-label="删除该行" @click="removeItem(item.id)">×</button>
            </li>
          </ul>
          <p class="hint rows__hint">数量 × 单价 = 小计。单价可以自己改，别被预设绑住。</p>
        </section>

        <section class="panel">
          <div class="panel__title"><span>附加项</span></div>
          <ul class="extras">
            <li v-for="extra in extras" :key="extra.id" class="extra" :class="{ 'is-on': extra.enabled }">
              <label class="extra__label">
                <input v-model="extra.enabled" type="checkbox" />
                <span class="extra__name">{{ extra.name }}</span>
              </label>
              <span class="extra__amount mono">{{ money(extra.amount) }}</span>
              <span v-if="extra.note" class="extra__note">{{ extra.note }}</span>
            </li>
          </ul>
        </section>

        <section class="panel">
          <div class="row-2">
            <div class="field">
              <label class="label">折扣（%）</label>
              <input v-model.number="discount" class="input" type="number" min="0" max="90" />
              <input v-model.number="discount" type="range" min="0" max="50" step="5" />
            </div>
            <div class="field">
              <label class="label">预付比例（%）</label>
              <input v-model.number="deposit" class="input" type="number" min="0" max="100" />
              <input v-model.number="deposit" type="range" min="0" max="100" step="10" />
            </div>
          </div>
        </section>

        <div class="editor__actions">
          <button class="btn btn--primary" @click="print">导出 / 打印 PDF</button>
          <button class="btn" :class="{ 'btn--ok': saved }" @click="save">{{ saved ? '已保存' : '保存草稿' }}</button>
          <button class="btn btn--ghost" @click="reset">重置</button>
        </div>
      </div>

      <!-- 右：报价单预览（打印时只留这个） -->
      <div class="preview">
        <div class="sheet print-sheet">
          <header class="sheet__head">
            <div>
              <p class="sheet__brand">LaNPs<span>.</span></p>
              <p class="sheet__sub">网站设计与开发</p>
            </div>
            <div class="sheet__meta">
              <p>{{ meta.date }}</p>
              <p>有效期 {{ meta.validDays }} 天</p>
            </div>
          </header>

          <h2 class="sheet__title">报价单</h2>
          <p class="sheet__to">
            客户：<strong>{{ meta.client || '—' }}</strong>
            <span class="dot">·</span>
            项目：<strong>{{ meta.project || '—' }}</strong>
          </p>

          <table class="sheet__table">
            <thead>
              <tr>
                <th>项目</th>
                <th class="num">数量</th>
                <th class="num">单价</th>
                <th class="num">小计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.type }}</td>
                <td class="num">{{ item.qty }}</td>
                <td class="num">{{ money(item.price) }}</td>
                <td class="num">{{ money(item.price * item.qty) }}</td>
              </tr>
              <tr v-for="extra in extras.filter((e) => e.enabled && e.amount > 0)" :key="'e' + extra.id" class="extra-row">
                <td>{{ extra.name }}</td>
                <td class="num">1</td>
                <td class="num">{{ money(extra.amount) }}</td>
                <td class="num">{{ money(extra.amount) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="sheet__totals">
            <div class="line">
              <span>小计</span>
              <span class="mono">{{ money(gross) }}</span>
            </div>
            <div v-if="discountAmount > 0" class="line">
              <span>折扣（−{{ discount }}%）</span>
              <span class="mono">−{{ money(discountAmount) }}</span>
            </div>
            <div class="line line--total">
              <span>合计</span>
              <span class="mono">{{ money(total) }}</span>
            </div>
            <div class="line line--muted">
              <span>预付 {{ deposit }}%</span>
              <span class="mono">{{ money(depositAmount) }}</span>
            </div>
            <div class="line line--muted">
              <span>交付后付清</span>
              <span class="mono">{{ money(balance) }}</span>
            </div>
          </div>

          <ul class="sheet__terms">
            <li>报价含页面设计、前端开发与上线部署。</li>
            <li>需求变更导致的工作量增加，另行报价。</li>
            <li>预付到账后开始计入工期，工期按页面数量协商。</li>
            <li>本报价自出具之日起 {{ meta.validDays }} 天内有效。</li>
          </ul>

          <footer class="sheet__foot">
            <span>{{ meta.author }}</span>
            <span class="mono">{{ meta.contact }}</span>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
  gap: 16px;
  align-items: start;
}

/* ---------- 明细行 ---------- */
.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: 1.1fr 62px 1fr 78px 28px;
  gap: 8px;
  align-items: center;
}

.row__type {
  padding-right: 26px;
}

.row__qty {
  text-align: center;
}

.row__price {
  position: relative;
}

.row__price .unit {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--dim);
  pointer-events: none;
}

.row__price .input {
  padding-left: 22px;
}

.row__sum {
  text-align: right;
  color: var(--muted);
}

.rows__hint {
  margin-top: 12px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  line-height: 1;
  justify-self: center;
}

.icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ---------- 附加项 ---------- */
.extras {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.extra {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  padding: 9px 10px;
  border-radius: 9px;
  transition: background 0.2s;
}

.extra:hover {
  background: rgba(241, 238, 231, 0.03);
}

.extra.is-on {
  background: rgba(255, 90, 43, 0.05);
}

.extra__label {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  font-size: 13.5px;
}

.extra__label input {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
}

.extra__amount {
  color: var(--muted);
}

.extra__note {
  grid-column: 1 / -1;
  font-size: 11.5px;
  color: var(--dim);
  padding-left: 24px;
}

/* ---------- 操作区 ---------- */
.editor__actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.btn--ok {
  color: var(--ok);
  border-color: rgba(111, 207, 151, 0.4);
}

/* ---------- 报价单 ---------- */
.preview {
  position: sticky;
  top: 84px;
}

.sheet {
  background: #f7f5f0;
  color: #16171a;
  border-radius: 14px;
  padding: 30px 28px;
  font-size: 13px;
  line-height: 1.65;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}

.sheet__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 2px solid #16171a;
}

.sheet__brand {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #16171a;
}

.sheet__brand span {
  color: #ff5a2b;
}

.sheet__sub {
  font-size: 11px;
  color: #6b6a63;
  letter-spacing: 0.06em;
}

.sheet__meta {
  text-align: right;
  font-size: 11.5px;
  color: #55564f;
}

.sheet__title {
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: -0.02em;
  margin: 22px 0 6px;
  color: #16171a;
}

.sheet__to {
  font-size: 12.5px;
  color: #55564f;
  margin-bottom: 18px;
}

.sheet__to strong {
  color: #16171a;
}

.dot {
  margin: 0 8px;
  color: #b0aea6;
}

.sheet__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.sheet__table th {
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b6a63;
  padding: 8px 0;
  border-bottom: 1px solid #d9d6cd;
}

.sheet__table td {
  padding: 9px 0;
  border-bottom: 1px solid #e6e3da;
}

.sheet__table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.extra-row td {
  color: #55564f;
}

.sheet__totals {
  margin-top: 16px;
  margin-left: auto;
  width: 62%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 12.5px;
  color: #55564f;
}

.line--total {
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1.5px solid #16171a;
  font-size: 15px;
  font-weight: 600;
  color: #16171a;
}

.line--muted {
  font-size: 11.5px;
}

.sheet__terms {
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid #e6e3da;
  font-size: 11px;
  color: #6b6a63;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sheet__foot {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid #e6e3da;
  font-size: 11.5px;
  color: #55564f;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .preview {
    position: static;
  }

  .row {
    grid-template-columns: 1fr 56px 1fr;
  }

  .row__sum {
    grid-column: 2 / 3;
    text-align: left;
  }
}

/* 打印：只留报价单，去掉阴影和内边距 */
@media print {
  .layout {
    display: block;
  }

  .preview {
    position: static;
  }

  .sheet {
    box-shadow: none;
    padding: 0;
    border-radius: 0;
  }

  @page {
    margin: 16mm;
  }
}
</style>
