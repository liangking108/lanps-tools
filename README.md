# LaNPs 工具台

> 梁皓钧 / 产品设计出身的开发者 / 贵阳
> Vue 3 + Vite · 纯前端 · 无后端依赖

三个日常会用到的工具，打包成一个站：

| 工具 | 解决什么问题 | 技术点 |
|---|---|---|
| **文案生成** | 给产品写标题、卖点、详情页，从零想太慢 | AI 接口接入、JSON 结构化输出、降级兜底、localStorage 历史 |
| **图片压缩** | 上线前素材动辄几 MB，拖慢加载 | Canvas 重绘、`toBlob` 导出 WebP、批量队列、Blob URL 生命周期管理 |
| **报价单** | 对外报价靠估，容易报亏或报高 | `computed` 派生金额、打印样式、草稿自动保存 |

---

## 一、本地跑起来

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
npm run preview  # 本地预览生产包
```

Node 18+ 即可。

---

## 二、AI 部分怎么配

打开右上角 **AI 设置**，填三样东西：

| 项 | 说明 |
|---|---|
| 接口地址 | OpenAI 格式的 base url，如 `https://api.openai.com/v1` |
| 模型 | 如 `gpt-4o-mini` / `deepseek-chat` |
| API Key | 只存 `localStorage`，不经过任何服务器 |

内置 4 个快捷预设：OpenAI、DeepSeek、Moonshot、本地 Ollama。

不填也能用：文案生成会退到 `src/utils/copyTemplates.js` 的本地模板，界面会标「示例模式」。这是刻意设计的降级，保证工具在零配置状态下也能演示。

### 关于 Key 安全

纯前端 = Key 存在用户浏览器里，自己用完全够。若要对多人提供服务，需加一层服务端代理：前端调自己的接口 → 接口带 Key 转发给模型，避免把 Key 暴露出去。

---

## 三、目录结构

```
lanps-tools/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js                     # 入口：createApp().mount()
    ├── App.vue                     # 外壳：顶部栏 / 标签切换 / KeepAlive
    ├── styles/
    │   └── base.css                # 设计变量 + 通用组件类 + 打印样式
    ├── composables/
    │   └── useAI.js                # AI 调用（模块级单例状态）
    ├── utils/
    │   └── copyTemplates.js        # 本地文案模板（无 Key 时兜底）
    └── components/
        ├── ApiSettings.vue         # AI 配置弹层（Teleport + Transition）
        ├── CopyGenerator.vue       # 工具 1
        ├── ImageCompressor.vue     # 工具 2
        └── QuoteBuilder.vue        # 工具 3
```

---

## 四、部署（Vercel）

1. 推到 GitHub
2. Vercel → **Add New → Project** → 选仓库
3. Framework Preset 自动识别为 **Vite**
   - Build Command：`npm run build`
   - Output Directory：`dist`
4. Deploy

已部署到独立域名 `lanps-tools.vercel.app`，`base` 保持默认 `'/'`。
若改为子路径 `lanps-work.vercel.app/tools/`，把 `vite.config.js` 的 `base` 改成 `'/tools/'`，并在主站加 rewrite 转发。

---

*站点：lanps-work.vercel.app · 作品集站仓库：lanps-work*
