<script setup>
/**
 * App.vue —— 应用外壳
 * 负责：顶部栏、工具切换标签、当前工具渲染、AI 配置弹层、页脚
 */
import { ref, computed, shallowRef, watch, onMounted } from 'vue'
import CopyGenerator from './components/CopyGenerator.vue'
import ImageCompressor from './components/ImageCompressor.vue'
import QuoteBuilder from './components/QuoteBuilder.vue'
import ApiSettings from './components/ApiSettings.vue'
import { useAI } from './composables/useAI'

// 用 shallowRef 存组件对象：Vue 不需要把它变成响应式代理（组件本身是对象，深层响应式没意义）
const tools = shallowRef([
  { key: 'copy', label: '文案生成', hint: '标题 · 卖点 · 详情', component: CopyGenerator },
  { key: 'image', label: '图片压缩', hint: '批量 · 本地处理', component: ImageCompressor },
  { key: 'quote', label: '报价单', hint: '拆价 · 可打印', component: QuoteBuilder }
])

const activeKey = ref('copy')
const activeTool = computed(() => tools.value.find((t) => t.key === activeKey.value))

const settingsOpen = ref(false)
const { hasKey } = useAI()

// 把当前工具同步到地址栏 hash：刷新不丢、链接可分享
onMounted(() => {
  const fromHash = location.hash.replace('#', '')
  if (tools.value.some((t) => t.key === fromHash)) activeKey.value = fromHash
})

watch(activeKey, (key) => {
  history.replaceState(null, '', '#' + key)
})
</script>

<template>
  <div class="app">
    <!-- 顶部栏 -->
    <header class="topbar">
      <div class="shell topbar__inner">
        <a class="brand" href="https://LaNPswork.com" target="_blank" rel="noopener">
          <span class="brand__mark">N</span>
          <span class="brand__text">
            <strong>LaNPs 工具台</strong>
            <em>自己用的三个小工具</em>
          </span>
        </a>

        <div class="topbar__actions">
          <span class="tag" :class="hasKey ? 'tag--ok' : 'tag--warn'">
            {{ hasKey ? 'AI 已就绪' : '示例模式' }}
          </span>
          <button class="btn btn--sm" @click="settingsOpen = true">AI 设置</button>
        </div>
      </div>
    </header>

    <!-- 工具切换 -->
    <nav class="tabs">
      <div class="shell tabs__inner" role="tablist" aria-label="工具切换">
        <button
          v-for="tool in tools"
          :key="tool.key"
          class="tab"
          :class="{ 'is-active': activeKey === tool.key }"
          role="tab"
          :aria-selected="activeKey === tool.key"
          @click="activeKey = tool.key"
        >
          <span class="tab__label">{{ tool.label }}</span>
          <span class="tab__hint">{{ tool.hint }}</span>
        </button>
      </div>
    </nav>

    <!-- 当前工具 -->
    <main class="shell main">
      <!--
        KeepAlive 让组件在切换标签时不被销毁 —— 切回来输入内容还在。
        这是动态组件最实用的一招，面试可以讲。
      -->
      <KeepAlive>
        <component :is="activeTool.component" :key="activeTool.key" />
      </KeepAlive>
    </main>

    <footer class="footer">
      <div class="shell footer__inner">
        <span>© {{ new Date().getFullYear() }} 梁皓钧 / LaNPs</span>
        <span class="footer__note">Vue 3 + Vite · 纯前端，数据不出本机</span>
      </div>
    </footer>

    <ApiSettings v-model:open="settingsOpen" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ---------- 顶部栏 ---------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(14, 15, 14, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 62px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand__text strong {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.brand__text em {
  font-style: normal;
  font-size: 11.5px;
  color: var(--dim);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ---------- 标签 ---------- */
.tabs {
  border-bottom: 1px solid var(--line);
  background: var(--ink-2);
}

.tabs__inner {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs__inner::-webkit-scrollbar {
  display: none;
}

.tab {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 15px 18px 13px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  text-align: left;
  transition: color 0.2s var(--ease), border-color 0.2s var(--ease);
  white-space: nowrap;
}

.tab:hover {
  color: var(--paper);
}

.tab.is-active {
  color: var(--paper);
  border-bottom-color: var(--accent);
}

.tab__label {
  font-size: 14px;
  font-weight: 500;
}

.tab__hint {
  font-size: 11px;
  color: var(--dim);
}

/* ---------- 主体 ---------- */
.main {
  flex: 1;
  padding: 26px 24px 60px;
}

/* ---------- 页脚 ---------- */
.footer {
  border-top: 1px solid var(--line);
  padding: 20px 0;
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dim);
}

@media (max-width: 720px) {
  .brand__text em {
    display: none;
  }
  .main {
    padding: 18px 16px 48px;
  }
}
</style>
