# LaNPs 工具台

> 梁皓钧 / 2026 届 · 产品设计 → 前端
> Vue 3 + Vite · 纯前端 · 无后端依赖

三个自己日常真会用的工具，打包成一个站：

| 工具 | 解决什么问题 | 技术点 |
|---|---|---|
| **文案生成** | 接单/副业要给产品写标题、卖点、详情页，从零想太慢 | AI 接口接入、JSON 结构化输出、降级兜底、localStorage 历史 |
| **图片压缩** | 上线前素材动辄几 MB，拖慢加载 | Canvas 重绘、`toBlob` 导出 WebP、批量队列、Blob URL 生命周期管理 |
| **报价单** | 对外报价全靠嘴估，容易报亏或报高 | `computed` 派生金额、打印样式、草稿自动保存 |

演示链接（带自动填充）：`https://你的域名/?demo=1`

---

## 一、本地跑起来

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
npm run preview  # 本地预览生产包
```

Node 18+ 即可（开发时用的是 Node 22）。

---

## 二、AI 部分怎么配

打开右上角 **AI 设置**，填三样东西：

| 项 | 说明 |
|---|---|
| 接口地址 | OpenAI 格式的 base url，如 `https://api.openai.com/v1` |
| 模型 | 如 `gpt-4o-mini` / `deepseek-chat` |
| API Key | 只存 `localStorage`，不经过任何服务器 |

内置了 4 个快捷预设：OpenAI、DeepSeek、Moonshot、本地 Ollama。

**不填也能用**：文案生成会退到 `src/utils/copyTemplates.js` 的本地模板，界面会标「示例模式」。
这是刻意设计的降级——**工具在零配置状态下必须能演示**，否则作品集链接发出去，对方打开是一片报错。

### 关于 Key 安全的实话

纯前端 = Key 存在用户浏览器里。自己用完全够，但**不能直接给别人用**（等于把 Key 发出去）。
要给别人用，得加一层服务端代理：前端调自己的接口 → 接口带 Key 转发给模型。这条写在 README 里，面试被问到就这么答，比假装安全强。

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
3. Framework Preset 会自动识别成 **Vite**
   - Build Command：`npm run build`
   - Output Directory：`dist`
4. Deploy

已按**独立子域 `tools.LaNPswork.com`** 部署，`base` 保持默认 `'/'` 即可。
若以后想改成子路径 `LaNPswork.com/tools/`，把 `vite.config.js` 的 `base` 改成 `'/tools/'`，并在主站投影（Vercel）里加 rewrite 转发。

---

## 五、面试可讲的点（每条都能落到代码）

1. **动态组件 + KeepAlive**（`App.vue`）：切标签时组件不被销毁，输入内容还在。讲清楚「为什么不用 v-if」——v-if 卸载组件，状态会丢。
2. **composable 抽公共逻辑**（`useAI.js`）：配置、请求、超时、错误处理只写一遍；状态放模块作用域 → 天然全局单例，不用 Pinia 也能共享。
3. **computed 而不是 watch 算金额**（`QuoteBuilder.vue`）：金额是「派生状态」，用 computed 自动缓存 + 依赖追踪；用 watch 手动同步会写出一堆 bug。
4. **降级设计**（`copyTemplates.js` + `CopyGenerator.vue`）：没 Key 不走死路，退本地模板并明确标注来源。这体现的是产品思维，不只是技术。
5. **Canvas 压缩原理**（`ImageCompressor.vue`）：`createImageBitmap` 解码 → 按最大宽度等比缩放 → `drawImage` 重绘 → `toBlob` 指定格式与质量。顺带讲为什么要给 JPEG 铺白底（透明会变黑）。
6. **内存管理**（`ImageCompressor.vue`）：`URL.createObjectURL` 创建的地址不释放会一直占内存；重新压缩前 `revokeObjectURL`，组件卸载时统一清理。
7. **AI 输出不可靠，要容错**（`useAI.js#parseJSON`）：模型会给 ```json 代码块、会夹解释文字。做了两级解析兜底，解析失败就把原文显示出来，不吞内容。
8. **打印即导出**（`QuoteBuilder.vue`）：`@media print` + `@page` 控制边距，把编辑器 `.no-print` 隐藏，只留报价单。零依赖实现 PDF 导出。

---

## 六、已知取舍（诚实清单）

- **语音/多轮**：没做，工具定位是「一次性产出」，不需要对话
- **账号体系**：没有，数据全在本地。要多人用就得有后端，那是另一个项目
- **图片压缩的 EXIF 方向**：`createImageBitmap` 默认会按 EXIF 纠正方向，但老 Safari 行为不一致，没做兜底
- **全部下载**：浏览器会拦连续多次下载，现在是 260ms 间隔逐个触发，体验一般；正解是打 zip（要引第三方库，暂时没加）

---

*版本 v1.0 · 2026-11-23 · 与 `lanps-work`（作品集站）配套*
