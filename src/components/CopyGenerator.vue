<script setup>
/**
 * CopyGenerator.vue —— 文案生成
 * 有 Key：走 AI；没 Key：走本地模板。
 * 两种结果都会明确标注来源，不把模板当 AI。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAI } from '../composables/useAI'
import { buildLocalCopy } from '../utils/copyTemplates'

const { hasKey, loading, error, chat, parseJSON } = useAI()

const HISTORY_KEY = 'lanps:copy:history'

const form = ref({
  name: '',
  industry: '本地实体店',
  points: '',
  tone: '亲切',
  count: 3
})

const tones = ['专业', '亲切', '犀利', '文艺']
const result = ref(null)
const copied = ref('')
const history = ref([])

const canGenerate = computed(() => form.value.name.trim().length > 0)

/* ---------- 生成 ---------- */
async function generate() {
  if (!canGenerate.value) return
  error.value = ''
  result.value = null

  if (!hasKey.value) {
    // 示例模式：本地模板，同步生成
    await new Promise((resolve) => setTimeout(resolve, 320)) // 留一点等待感，避免闪屏
    result.value = buildLocalCopy(form.value)
    saveHistory()
    return
  }

  loading.value = true
  try {
    const payload = await chat(
      [
        { role: 'system', content: '你是中文商业文案写手，输出严格遵循 JSON，不写任何解释。' },
        { role: 'user', content: buildPrompt(form.value) }
      ],
      { temperature: 0.85 }
    )

    const parsed = parseJSON(payload)
    if (parsed && Array.isArray(parsed.titles)) {
      result.value = {
        titles: parsed.titles.slice(0, form.value.count),
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
        description: parsed.description || '',
        mode: 'ai'
      }
    } else {
      // 模型没按格式给 JSON：把原文塞进 description，至少不丢内容
      result.value = {
        titles: [],
        bullets: [],
        description: payload.trim(),
        mode: 'ai'
      }
    }
    saveHistory()
  } catch (e) {
    error.value = e.message || '生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function buildPrompt(input) {
  return `请为下面这个产品写推广文案。

产品名：${input.name}
行业 / 使用场景：${input.industry}
核心卖点（用户提供）：${input.points || '未提供，请根据产品名合理推断'}
语气风格：${input.tone}
标题数量：${input.count}

只输出如下 JSON，不要代码块、不要解释：
{"titles":["标题1","标题2"],"bullets":["卖点1","卖点2"],"description":"详情页文案"}

要求：
- 每条标题不超过 22 个字，风格统一
- bullets 写 4–5 条，每条 15–30 字，说人话，不要堆形容词
- description 写 2–3 段，可直接贴到详情页`
}

/* ---------- 复制 ---------- */
async function copy(text, tag) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 老浏览器 / 非 https 环境兜底
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = tag
  setTimeout(() => {
    if (copied.value === tag) copied.value = ''
  }, 1600)
}

function copyAll() {
  if (!result.value) return
  const { titles, bullets, description } = result.value
  const text = [
    titles.length ? '【标题】\n' + titles.map((t, i) => `${i + 1}. ${t}`).join('\n') : '',
    bullets.length ? '\n【卖点】\n' + bullets.map((b) => `· ${b}`).join('\n') : '',
    description ? '\n【详情页文案】\n' + description : ''
  ]
    .filter(Boolean)
    .join('\n')
  copy(text, 'all')
}

/* ---------- 历史记录（localStorage 持久化） ---------- */
function saveHistory() {
  const entry = {
    id: Date.now(),
    name: form.value.name,
    industry: form.value.industry,
    result: result.value,
    time: new Date().toLocaleString('zh-CN', { hour12: false })
  }
  history.value = [entry, ...history.value].slice(0, 5)
  persist()
}

function persist() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
  } catch {
    /* 忽略 */
  }
}

function restore(entry) {
  result.value = entry.result
}

function clearHistory() {
  history.value = []
  persist()
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) history.value = JSON.parse(raw)
  } catch {
    /* 忽略 */
  }

  // 演示参数：?demo=1 时自动填入示例并生成，方便别人（和面试官）一眼看到效果
  if (new URLSearchParams(location.search).has('demo')) fillDemo()
})

/** 一键填入示例：省得访客对着空表单发呆 */
function fillDemo() {
  form.value = {
    name: '巷子里咖啡',
    industry: '独立咖啡店',
    points: '手冲咖啡、当天现烤、楼下就能坐一下午',
    tone: '亲切',
    count: 3
  }
  generate()
}

// 切换来源（保存/清空 Key）时清掉旧结果，避免误以为是新生成的
watch(hasKey, () => {
  result.value = null
})
</script>

<template>
  <div class="copy">
    <div class="grid">
      <!-- 左：输入 -->
      <section class="panel">
        <div class="panel__title">
          <span>输入</span>
          <span class="panel__hint">{{ hasKey ? 'AI 生成' : '本地模板' }}</span>
        </div>

        <div class="field">
          <label class="label" for="name">产品 / 服务名 *</label>
          <input id="name" v-model="form.name" class="input" placeholder="例：巷子里咖啡" />
        </div>

        <div class="row-2">
          <div class="field">
            <label class="label" for="tone">语气</label>
            <select id="tone" v-model="form.tone" class="select">
              <option v-for="t in tones" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="count">标题数量</label>
            <select id="count" v-model.number="form.count" class="select">
              <option :value="3">3 条</option>
              <option :value="5">5 条</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label" for="industry">行业 / 场景</label>
          <input id="industry" v-model="form.industry" class="input" placeholder="例：独立咖啡店" />
        </div>

        <div class="field">
          <label class="label" for="points">核心卖点（逗号分隔）</label>
          <textarea
            id="points"
            v-model="form.points"
            class="textarea"
            placeholder="例：手冲咖啡、当天现烤、楼下就能坐一下午"
            @keydown.enter.exact.prevent="generate"
          />
        </div>

        <div class="actions">
          <button class="btn btn--primary" :disabled="!canGenerate || loading" @click="generate">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            {{ loading ? '生成中…' : '生成文案' }}
          </button>
          <button class="btn" :disabled="loading" @click="fillDemo">填入示例</button>
          <button v-if="result" class="btn btn--ghost" @click="result = null">清空结果</button>
        </div>

        <p class="hint bottom-hint">
          按 <kbd>Enter</kbd> 生成 · <kbd>Shift + Enter</kbd> 换行
        </p>
      </section>

      <!-- 右：结果 -->
      <section class="panel">
        <div class="panel__title">
          <span>结果</span>
          <span v-if="result" class="tag" :class="result.mode === 'ai' ? 'tag--ok' : 'tag--warn'">
            {{ result.mode === 'ai' ? 'AI 生成' : '示例模式（本地模板）' }}
          </span>
        </div>

        <div v-if="error" class="notice notice--err">{{ error }}</div>

        <div v-else-if="loading" class="skeleton">
          <div class="skeleton__line" v-for="i in 6" :key="i" :style="{ width: 40 + ((i * 13) % 50) + '%' }" />
        </div>

        <div v-else-if="!result" class="empty">
          填好左边，点「生成文案」<br />
          <span class="hint">没有 API Key 也能用，会走本地模板</span>
        </div>

        <div v-else class="result stack">
          <div v-if="result.titles.length" class="block">
            <h4 class="block__title">标题候选</h4>
            <ul class="titles">
              <li v-for="(t, i) in result.titles" :key="i" class="title-item">
                <span class="title-item__text">{{ t }}</span>
                <button class="copy-btn" @click="copy(t, 't' + i)">
                  {{ copied === 't' + i ? '已复制' : '复制' }}
                </button>
              </li>
            </ul>
          </div>

          <div v-if="result.bullets.length" class="block">
            <h4 class="block__title">卖点</h4>
            <ul class="bullets">
              <li v-for="(b, i) in result.bullets" :key="i">{{ b }}</li>
            </ul>
          </div>

          <div v-if="result.description" class="block">
            <h4 class="block__title">详情页文案</h4>
            <p class="desc">{{ result.description }}</p>
          </div>

          <div class="result__foot">
            <button class="btn btn--sm" @click="copyAll">{{ copied === 'all' ? '已复制全部' : '复制全部' }}</button>
            <span class="hint">{{ form.name }} · {{ form.tone }} · {{ form.industry }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- 历史 -->
    <section v-if="history.length" class="panel history">
      <div class="panel__title">
        <span>最近生成</span>
        <button class="btn btn--sm btn--ghost" @click="clearHistory">清空</button>
      </div>
      <ul class="history__list">
        <li v-for="entry in history" :key="entry.id">
          <button class="history__item" @click="restore(entry)">
            <span class="history__name">{{ entry.name }}</span>
            <span class="history__time">{{ entry.time }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 16px;
  align-items: start;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.bottom-hint {
  margin-top: 12px;
}

kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
}

/* ---------- 结果 ---------- */
.result {
  gap: 20px;
}

.block__title {
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim);
  margin-bottom: 10px;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line-soft);
  border-radius: 9px;
  background: var(--ink);
  transition: border-color 0.2s var(--ease);
}

.title-item:hover {
  border-color: rgba(241, 238, 231, 0.25);
}

.title-item__text {
  font-size: 14px;
  line-height: 1.6;
}

.copy-btn {
  flex: none;
  font-size: 11.5px;
  color: var(--muted);
  background: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 10px;
  transition: color 0.2s, border-color 0.2s;
}

.copy-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.bullets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bullets li {
  position: relative;
  padding-left: 16px;
  font-size: 13.5px;
  color: #cfcbc2;
  line-height: 1.75;
}

.bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.desc {
  font-size: 13.5px;
  line-height: 1.85;
  color: #cfcbc2;
  white-space: pre-wrap;
  padding: 14px;
  border-radius: 10px;
  background: var(--ink);
  border: 1px solid var(--line-soft);
}

.result__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
  flex-wrap: wrap;
}

/* ---------- 骨架屏 ---------- */
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 0;
}

.skeleton__line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--ink-3), var(--ink-4), var(--ink-3));
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  to { background-position: -200% 0; }
}

/* ---------- 历史 ---------- */
.history {
  margin-top: 16px;
}

.history__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.history__item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 13px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--ink);
  text-align: left;
  transition: border-color 0.2s;
}

.history__item:hover {
  border-color: var(--accent);
}

.history__name {
  font-size: 13px;
}

.history__time {
  font-size: 10.5px;
  color: var(--dim);
}

@media (max-width: 860px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
