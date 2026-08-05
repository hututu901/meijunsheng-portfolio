export const accessCode = '4784';

export const assetPath = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
export const profile = {
  name: '梅俊生',
  headline: '内容运营 / 直播运营 / 新媒体增长',
  statement: '我把选题、脚本、拍摄、剪辑、发布和复盘串成完整流程，让内容不仅好看，也能被看见、被转化、被记住。',
  intro:
    '3年以上新媒体运营与活动策划经验，熟悉抖音、小红书、视频号、公众号等平台节奏，具备账号运营、短视频制作、直播执行、电商搭建协同等综合能力。',
  proofs: ['3年+ 内容经验', '20+ 账号运营', '100+ 爆款内容'],
};

export const aboutNotes = [
  { title: '内容策划', text: '从选题判断到脚本结构，把内容拆成可执行方案。' },
  { title: '影像执行', text: '能完成拍摄、剪辑、包装和多平台发布适配。' },
  { title: '增长复盘', text: '根据数据反馈优化内容节奏、账号方向和转化路径。' },
];

export const experience = [
  {
    company: '深圳三特摩尔科技有限公司',
    role: '新媒体运营主管',
    period: '2024.11 - 2026.07',
    keyword: '品牌账号 / 直播间搭建',
    summary:
      '负责品牌账号整体运营策划，覆盖抖音、小红书、视频号、公众号等平台；统筹选题、创作、剪辑、投放与多岗位协作；参与多个直播间从设备采购到多平台同步开播的完整落地。',
  },
  {
    company: '深圳嘉佳盛实业有限公司',
    role: '新媒体运营',
    period: '2023.10 - 2024.09',
    keyword: '小红书 / 抖音内容',
    summary:
      '负责小红书、抖音账号运营，涵盖内容创作、文案策划、拍摄剪辑与推广投放；围绕礼物种草方向输出图文和短视频，参与店铺转化导向内容制作。',
  },
  {
    company: '武汉恒世宏信文化传媒有限公司',
    role: '活动策划运营',
    period: '2020.05 - 2023.09',
    keyword: '活动策划 / 线下执行',
    summary:
      '负责品牌活动策划、营销活动策划及线上媒体宣发；独立参与线下活动全案策划，统筹执行流程与供应商协同，累计参与活动100+场。',
  },
];

export const works = [
  {
    title: '产品展示',
    category: 'Product Film',
    description: '产品卖点与视觉展示短片',
    src: '/videos/%E4%BA%A7%E5%93%81%E5%B1%95%E7%A4%BA.mp4',
    cover: '/covers/cover-1.png',
  },
  {
    title: '产品展示（外贸版）',
    category: 'Export Version',
    description: '面向外贸场景的产品展示内容',
    src: '/videos/%E4%BA%A7%E5%93%81%E5%B1%95%E7%A4%BA%EF%BC%88%E5%A4%96%E8%B4%B8%E7%89%88%EF%BC%89.mp4',
    cover: '/covers/cover-2.png',
  },
  {
    title: '拜年视频',
    category: 'Festival',
    description: '节日氛围向短视频内容',
    src: '/videos/%E6%8B%9C%E5%B9%B4%E8%A7%86%E9%A2%91.mp4',
    cover: '/covers/cover-3.png',
  },
  {
    title: '新年祝福类',
    category: 'Campaign',
    description: '祝福类内容策划与成片',
    src: '/videos/%E6%96%B0%E5%B9%B4%E7%A5%9D%E7%A6%8F%E7%B1%BB.mp4',
    cover: '/covers/cover-4.png',
  },
  {
    title: '知识类博主 02',
    category: 'Knowledge',
    description: '知识口播与账号内容样片',
    src: '/videos/%E7%9F%A5%E8%AF%86%E7%B1%BB%E5%8D%9A%E4%B8%BB%20(2).mp4',
    cover: '/covers/cover-5.png',
  },
  {
    title: '知识类博主',
    category: 'Creator',
    description: '知识类短视频成片展示',
    src: '/videos/%E7%9F%A5%E8%AF%86%E7%B1%BB%E5%8D%9A%E4%B8%BB.mp4',
    cover: '/covers/cover-6.png',
  },
];

export const cloudLink = 'https://pan.baidu.com/s/1eKn2DwjtR7o2XwmrK3_6tQ?pwd=sey4';

export const aiPortfolio = {
  detailImages: [
    '/ai-portfolio/e-commerce/电商详情页-1.png',
    '/ai-portfolio/e-commerce/电商详情页-2.png',
    '/ai-portfolio/e-commerce/电商详情页-3.png',
    '/ai-portfolio/e-commerce/电商详情页-4.png',
    '/ai-portfolio/e-commerce/电商详情页-5.png',
    '/ai-portfolio/e-commerce/电商详情页-6.png',
  ],
  promptFile: '/ai-portfolio/提示词/咖啡杯提示词.docx',
  articleImage: '/ai-portfolio/article/公众号推文图.jpg',
  promptPreview: [
    '一次性咖啡杯详情页提示词审核稿 v3',
    '本版为带标题文案和副标题文案直接生图版',
    '执行原则',
    '每一屏提示词直接包含标题文案和副标题文案',
    '不再使用无字底图逻辑',
    '参考图负责风格，白底图负责产品结构锁定',
    '第 1 屏：双层加厚 热饮外带更安心',
    '第 2 屏：加厚加硬 隔热防烫',
    '第 3 屏：商用外带 多场景适用',
    '第 4 屏：简约杯型 质感在线',
    '第 5 屏：挺括不易软塌 外带更稳',
    '第 6 屏：商用热饮外带杯 常备更省心',
    '正式提示词：保持白色纸杯、黑色塑料杯盖与牛皮纸隔热杯套结构一致，延续暖棕色咖啡馆商业详情页风格，文字清晰自然，不要 logo、不要水印、不要乱码。',
  ],
} as const;
export const skillMatrix = [
  { label: '内容策划', x: 28, y: 18, bodyX: 56, bodyY: 15, axis: '头脑 / 策划', detail: '把选题、脚本、拍摄需求和发布节奏拆成可执行的内容方案。' },
  { label: '平台洞察', x: 62, y: 24, bodyX: 42, bodyY: 23, axis: '眼睛 / 判断', detail: '熟悉抖音、小红书、视频号、公众号等平台内容节奏和表达方式。' },
  { label: '短视频拍摄', x: 38, y: 42, bodyX: 26, bodyY: 46, axis: '双手 / 执行', detail: '完成短视频拍摄、口播场景、产品展示和人物出镜内容。' },
  { label: '剪辑包装', x: 42, y: 58, bodyX: 74, bodyY: 48, axis: '双手 / 成片', detail: '负责基础剪辑、节奏包装、字幕信息和平台适配。' },
  { label: '账号运营', x: 62, y: 34, bodyX: 58, bodyY: 38, axis: '中枢 / 运营', detail: '围绕账号定位、内容节奏、发布计划和数据反馈持续运营。' },
  { label: '直播执行', x: 52, y: 48, bodyX: 50, bodyY: 54, axis: '现场 / 转化', detail: '参与直播间搭建、设备协同、多平台同步开播和直播流程执行。' },
  { label: '电商协同', x: 78, y: 70, bodyX: 67, bodyY: 76, axis: '商业 / 转化', detail: '协同店铺、商品、内容和转化路径，把内容与商业目标连接起来。' },
  { label: '复盘分析', x: 63, y: 82, bodyX: 35, bodyY: 78, axis: '脚步 / 复盘', detail: '根据数据反馈判断内容方向，优化选题、发布时间和表达方式。' },
] as const;



