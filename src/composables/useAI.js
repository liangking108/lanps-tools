/**
 * useAI —— AI 调用组合式函数（composable）
 * ------------------------------------------------------------
 * 为什么单独抽出来：
 *   1. 配置读写、请求、错误处理、超时这些逻辑只写一遍，多个组件都能用
 *   2. 把「状态」放在模块作用域，天然是全局单例（任何组件拿到的是同一份配置）
 *
 * 兼容性：走 OpenAI 格式的 /chat/completions 接口，
 *   所以 OpenAI、DeepSeek、Moonshot、通义（兼容模式）等都能直接用。
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'lanps:ai:config'

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: ''
}

/** 从 localStorage 读取配置（读不到就用默认值） */
function readConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

// 模块级状态：整个应用共享一份
const config = ref(readConfig())
const loading = ref(false)
const error = ref('')

export function useAI() {
  /** 是否已配置 Key —— 组件用它决定走 AI 还是本地模板 */
  const hasKey = computed(() => Boolean(config.value.apiKey?.trim()))

  /** 保存配置到 localStorage */
  function saveConfig(next) {
    config.value = { ...config.value, ...next }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
    } catch {
      // 隐私模式下 localStorage 可能不可用，忽略即可
    }
  }

  function resetConfig() {
    config.value = { ...DEFAULT_CONFIG }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
  }

  /**
   * 发起一次对话请求
   * @param {Array<{role: string, content: string}>} messages
   * @param {{ temperature?: number, timeout?: number }} options
   * @returns {Promise<string>} 模型返回的文本
   */
  async function chat(messages, options = {}) {
    const { temperature = 0.8, timeout = 45000 } = options

    if (!hasKey.value) throw new Error('未配置 API Key')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const base = config.value.baseUrl.replace(/\/+$/, '')
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.value.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: config.value.model,
          messages,
          temperature
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        // 尽量把服务端的错误信息带出来，方便定位（Key 错？额度用完？模型名写错？）
        let detail = ''
        try {
          const data = await res.json()
          detail = data?.error?.message || JSON.stringify(data).slice(0, 180)
        } catch {
          detail = await res.text().catch(() => '')
        }
        throw new Error(`接口返回 ${res.status}${detail ? '：' + detail : ''}`)
      }

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) throw new Error('接口没有返回内容')
      return content
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('请求超时，请检查网络或接口地址')
      throw e
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * 从模型输出里抠出 JSON
   * 模型有时会包 ```json 代码块，或前后带解释文字，这里做容错
   */
  function parseJSON(text) {
    if (!text) return null
    const cleaned = String(text)
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim()

    try {
      return JSON.parse(cleaned)
    } catch {
      // 再试一次：截取第一个 { 到最后一个 }
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1))
        } catch {
          return null
        }
      }
      return null
    }
  }

  return {
    config,
    loading,
    error,
    hasKey,
    saveConfig,
    resetConfig,
    chat,
    parseJSON
  }
}
