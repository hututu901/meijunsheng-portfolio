export const accessCode = '4784';

export const assetPath = (path: string) =>
  /^(data:|blob:|https?:)/i.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
export const profile = {
  name: '梅俊生',
  headline: 'AI视觉内容 / AIGC视觉创作 / 内容运营',
  statement: '我关注AI如何参与视觉内容创作，从产品信息拆解、画面构思、提示词编写，到生成效果验证和多轮迭代，探索产品视觉表达的更多可能。',
  intro:
    '具备3年以上内容运营、新媒体运营与活动策划经验，熟悉从选题、脚本、拍摄、剪辑到发布复盘的内容生产流程。持续实践AI视觉内容创作，使用即梦、豆包、ChatGPT、WorkBuddy、Codex、扣子和ComfyUI完成产品视觉、详情页画面及双语生图提示词练习。',
  proofs: ['3年+ 内容经验', '20+ 账号运营', '100+ 爆款内容'],
};

export const aboutNotes = [
  { title: 'AI视觉策划', text: '把产品信息拆解为画面方向、内容结构和可执行的视觉任务。' },
  { title: '提示词设计', text: '围绕产品展示和电商详情页编写提示词，并根据生成效果持续调整。' },
  { title: '内容生产', text: '连接产品信息、AI视觉素材、文案包装和平台发布需求。' },
];

export const experience = [
  {
    company: '深圳三特摩尔科技有限公司',
    role: '新媒体运营主管',
    period: '2024.11 - 2026.07',
    keyword: '产品视觉表达 / 内容生产流程',
    summary:
      '负责品牌账号内容运营，覆盖抖音、小红书、视频号和公众号，参与选题、脚本、拍摄、剪辑、发布及投放协作。具备产品内容拆解和视觉表达经验，能够将产品卖点转化为画面方向、文案信息和内容需求；参与直播间设备采购、流程搭建及多平台同步开播执行。',
  },
  {
    company: '深圳嘉佳盛实业有限公司',
    role: '新媒体运营',
    period: '2023.10 - 2024.09',
    keyword: 'AI辅助视觉内容 / 产品表达',
    summary:
      '负责小红书、抖音账号内容制作，涵盖文案策划、拍摄剪辑、图文内容和推广投放。围绕商品特点和用户场景进行视觉内容练习，使用AI工具辅助画面构思、提示词编写和素材迭代，并根据内容要求调整视觉方向、信息层级和表达方式。',
  },
  {
    company: '武汉恒世宏信文化传媒有限公司',
    role: '活动策划运营',
    period: '2020.05 - 2023.09',
    keyword: '需求理解 / 内容策划 / 传播执行',
    summary:
      '负责品牌活动、营销活动及线上媒体宣发，参与活动方案、传播内容和现场执行；协同供应商和执行团队推进活动落地，累计参与活动100+场，积累从需求理解、内容策划到传播执行的项目基础。',
  },
];

export const works: Array<{ title: string; category: string; description: string; src?: string; previewSrc?: string; cover?: string }> = [];

export const cloudLink = 'https://pan.baidu.com/s/1eKn2DwjtR7o2XwmrK3_6tQ?pwd=sey4';

export const aiPortfolio = {
  detailImages: [],
  promptFile: '',
  articleImage: '',
  promptPreview: [],
} as const;
export const skillMatrix = [
  { label: 'AI视觉创作', x: 28, y: 18, bodyX: 56, bodyY: 15, axis: '头脑 / 构思', detail: '围绕产品特点构思画面、风格、场景和信息表达方式。' },
  { label: '提示词设计', x: 62, y: 24, bodyX: 42, bodyY: 23, axis: '眼睛 / 判断', detail: '编写产品展示和双语生图提示词，并根据生成效果进行调整。' },
  { label: 'ComfyUI实践', x: 38, y: 42, bodyX: 26, bodyY: 46, axis: '流程 / 实践', detail: '使用ComfyUI进行个人工作流实践和生成流程调整。' },
  { label: '扣子自动化', x: 42, y: 58, bodyX: 74, bodyY: 48, axis: '流程 / 自动化', detail: '使用扣子探索内容生成步骤的流程化和自动化实践。' },
  { label: '产品视觉表达', x: 62, y: 34, bodyX: 58, bodyY: 38, axis: '中枢 / 表达', detail: '将产品卖点转化为详情页画面、图文内容和视觉方向。' },
  { label: '内容生产流程', x: 52, y: 48, bodyX: 50, bodyY: 54, axis: '现场 / 执行', detail: '连接产品信息、提示词、视觉素材、文案包装和平台发布。' },
  { label: '新媒体运营', x: 78, y: 70, bodyX: 67, bodyY: 76, axis: '平台 / 运营', detail: '熟悉抖音、小红书、视频号和公众号的内容表达与发布节奏。' },
  { label: '效果迭代', x: 63, y: 82, bodyX: 35, bodyY: 78, axis: '脚步 / 复盘', detail: '根据生成效果和内容要求修改提示词，优化画面方向和信息层级。' },
] as const;

