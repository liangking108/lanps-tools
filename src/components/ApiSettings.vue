<script setup>
/**
 * ApiSettings.vue —— AI 配置弹层
 * 说明：Key 只存在浏览器 localStorage，不会上传到任何服务器（本工具没有后端）。
 *       面试被问「Key 安全吗」，如实说：纯前端方案只适合自己用，给别人用要加一层代理。
 */
import { computed, ref, watch } from 'vue'
import { useAI } from '../composables/useAI'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['update:open'])

const { config, saveConfig, resetConfig } = useAI()

// 草稿：改完点「保存」才生效，避免边打字边污染全局配置
const draft = ref({ baseUrl: '', model: '', apiKey: '' })

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) draft.value = { ...config.value }
  },
  { immediate: true }
)

const presets = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'Moonshot', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' }
]

const canSave = computed(() => draft.value.baseUrl.trim() && draft.value.model.trim())

function applyPreset(preset) {
  draft.value.baseUrl = preset.baseUrl
  draft.value.model = preset.model
}

function close() {
  emit('update:open', false)
}

function save() {
  if (!canSave.value) return
  saveConfig({
    baseUrl: draft.value.baseUrl.trim(),
    model: draft.value.model.trim(),
    apiKey: draft.value.apiKey.trim()
  })
  close()
}

function clearKey() {
  resetConfig()
  draft.value = { ...config.value }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="overlay" @click.self="close">
        <div class="dialog panel" role="dialog" aria-modal="true" aria-label="AI 接口设置">
          <div class="spread dialog__head">
            <h3>AI 接口设置</h3>
            <button class="close" aria-label="关闭" @click="close">×</button>
          </div>

          <p class="hint">
            走 OpenAI 格式的 <code>/chat/completions</code> 接口，填谁都行。
            Key 只保存在你这台机器的浏览器里，本工具没有后端。
          </p>

          <div class="field">
            <span class="label">快速填充</span>
            <div class="presets">
              <button
                v-for="preset in presets"
                :key="preset.name"
                class="btn btn--sm"
                type="button"
                @click="applyPreset(preset)"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>

          <div class="field">
            <label class="label" for="baseUrl">接口地址</label>
            <input id="baseUrl" v-model="draft.baseUrl" class="input" placeholder="https://api.openai.com/v1" />
          </div>

          <div class="field">
            <label class="label" for="model">模型</label>
            <input id="model" v-model="draft.model" class="input" placeholder="gpt-4o-mini" />
          </div>

          <div class="field">
            <label class="label" for="apiKey">API Key</label>
            <input
              id="apiKey"
              v-model="draft.apiKey"
              class="input"
              type="password"
              autocomplete="off"
              placeholder="sk-..."
            />
          </div>

          <div class="notice notice--warn">
            不填也能用：文案生成会退回到本地模板（示例模式），结果一样可复制，只是不如 AI 灵活。
          </div>

          <div class="dialog__foot">
            <button class="btn btn--ghost" type="button" @click="clearKey">清空 Key</button>
            <div class="dialog__foot-right">
              <button class="btn" type="button" @click="close">取消</button>
              <button class="btn btn--primary" type="button" :disabled="!canSave" @click="save">保存</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(5, 6, 5, 0.72);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  overflow-y: auto;
}

.dialog {
  width: 100%;
  max-width: 460px;
  background: var(--ink-2);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.dialog__head h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
}

.close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  font-size: 17px;
  line-height: 1;
  transition: color 0.2s, border-color 0.2s;
}

.close:hover {
  color: var(--paper);
  border-color: var(--paper);
}

.hint {
  margin: 10px 0 18px;
}

.hint code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--ink-4);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 22px;
}

.dialog__foot-right {
  display: flex;
  gap: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s var(--ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
