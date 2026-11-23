/**
 * 本地文案模板引擎
 * ------------------------------------------------------------
 * 用途：未配置 API Key 时的兜底方案，保证工具在「零配置」状态下也能跑出结果。
 * 说明：这是模板拼装，不是 AI 生成——界面上会明确标注「示例模式」，
 *       面试时也照实讲，不夸大成 AI 能力。
 */

const TONE_TITLES = {
  专业: [
    (n, p) => `${n}：以${p}为核心的可靠方案`,
    (n, p) => `${n} — 把${p}做成标准动作`,
    (n, p) => `选择${n}，就是选择${p}`
  ],
  亲切: [
    (n, p) => `${n}，让${p}这件事轻松一点`,
    (n, p) => `关于${n}，我们只认真做好一件事：${p}`,
    (n, p) => `想试试${p}？先认识一下${n}`
  ],
  犀利: [
    (n, p) => `别再将就了，${n}把${p}做到位`,
    (n, p) => `${p}这件事，${n}直接给答案`,
    (n, p) => `省掉试错成本，${n}负责${p}`
  ],
  文艺: [
    (n, p) => `${n}｜把${p}，慢慢做好`,
    (n, p) => `关于${p}，${n}有另一种答案`,
    (n, p) => `${n}，藏在细节里的${p}`
  ]
}

const TONE_LEADS = {
  专业: (n, i) => `${n}面向${i}场景，把复杂流程拆成可执行的步骤。`,
  亲切: (n, i) => `${n}的出发点很简单：在${i}这件事上，让人省点心。`,
  犀利: (n, i) => `${i}不缺选择，缺的是把细节做对的那一个。`,
  文艺: (n, i) => `${n}相信，${i}也可以有克制的表达。`
}

// 卖点的第二种说法，轮流取，避免每条都是同一句
const POINT_TAILS = [
  '这是底线，不是卖点。',
  '说起来简单，做起来才知道难。',
  '每天都做，不挑客人。',
  '我们没打算把它做成加分项。'
]

/** 把用户输入的卖点拆成条目 */
function splitPoints(raw) {
  return String(raw || '')
    .split(/[、,，;；\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 生成文案
 * @param {{ name: string, industry: string, points: string, tone: string, count: number }} input
 */
export function buildLocalCopy(input) {
  const name = input.name?.trim() || '你的产品'
  const industry = input.industry?.trim() || '本地服务'
  const tone = TONE_TITLES[input.tone] ? input.tone : '专业'
  const points = splitPoints(input.points)
  const mainPoint = points[0] || '把细节做到位'
  const count = Math.min(Math.max(Number(input.count) || 3, 1), 6)

  // 1. 标题候选
  // 统一用主卖点套不同句式：比轮着塞不同卖点更通顺（"想试试手冲咖啡？"能读，
  // "想试试楼下就能坐一下午？"就读不通了）
  const titlePool = TONE_TITLES[tone]
  const titles = []
  for (let i = 0; i < count; i += 1) {
    const fn = titlePool[i % titlePool.length]
    titles.push(fn(name, mainPoint))
  }

  // 2. 卖点条目
  const bullets = []
  bullets.push(`${mainPoint}——${name}最在意的一件事。`)
  points.slice(1).forEach((p, i) => {
    bullets.push(`${p}，${POINT_TAILS[i % POINT_TAILS.length]}`)
  })
  bullets.push(`${industry}里用得上的，才留下。`)
  bullets.push('出了问题能找到人，不是扔给你一份说明书。')

  // 3. 详情页文案
  const description = [
    TONE_LEADS[tone](name, industry),
    `${name}围绕「${mainPoint}」展开${
      points.length > 1 ? `，同时兼顾${points.slice(1).join('、')}` : '，把一件事做透'
    }。`,
    `如果你也在${industry}里，欢迎来看看${name}。`
  ].join('\n\n')

  return {
    titles: titles.slice(0, count),
    bullets,
    description,
    mode: 'local'
  }
}
