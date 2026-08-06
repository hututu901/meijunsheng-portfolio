import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
type SnakeDirection = 'up' | 'down' | 'left' | 'right';
type SnakeCell = { x: number; y: number };
import { ArrowUpRight, Copy, LockKeyhole, X } from 'lucide-react';
import { accessCode, aiPortfolio, assetPath, cloudLink, experience, profile, skillMatrix, works } from './data';

type AdminWork = {
  title: string;
  category: string;
  description: string;
  src: string;
  cover: string;
};

type AdminExperience = {
  company: string;
  role: string;
  period: string;
  keyword: string;
  summary: string;
};

type AdminConfig = {
  profile: {
    name: string;
    headline: string;
    statement: string;
  };
  aiSubtitle: string;
  works: AdminWork[];
  experience: AdminExperience[];
};

const adminPassword = '@m7498';
const adminStorageKey = 'meijunsheng-portfolio-admin-v1';
const defaultAdminConfig: AdminConfig = {
  profile: {
    name: profile.name,
    headline: profile.headline,
    statement: profile.statement,
  },
  aiSubtitle: '整个网页开发及内容由 Codex、ChatGPT、WorkBuddy 以及豆包共同完成',
  works: works.map(({ title, category, description, src, cover }) => ({ title, category, description, src, cover })),
  experience: experience.map(({ company, role, period, keyword, summary }) => ({ company, role, period, keyword, summary })),
};

const readAdminConfig = (): AdminConfig => {
  try {
    const saved = window.localStorage.getItem(adminStorageKey);
    if (saved) return { ...defaultAdminConfig, ...JSON.parse(saved) } as AdminConfig;
  } catch {
    // Local storage may be unavailable in private browsing.
  }
  return defaultAdminConfig;
};

const mediaPath = (path: string) => /^(data:|https?:|blob:)/i.test(path) ? path : assetPath(path);
function App() {
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [copied, setCopied] = useState(false);
  const [selectedWork, setSelectedWork] = useState<(typeof works)[number] | null>(null);
  const [activeExperience, setActiveExperience] = useState(0);
  const [activeSkill, setActiveSkill] = useState(0);
  const [activeWorkPreview, setActiveWorkPreview] = useState<number | null>(null);
  const [workPreviewLoading, setWorkPreviewLoading] = useState(false);
  const [visibleChatCount, setVisibleChatCount] = useState(0);
  const [chatIntroPlayed, setChatIntroPlayed] = useState(false);
  const [newMessageNotice, setNewMessageNotice] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [eyeTarget, setEyeTarget] = useState(0);
  const [eyeLocked, setEyeLocked] = useState(false);
  const [quickChats, setQuickChats] = useState<Array<{ id: string; question: string; answer: string; status: 'typing' | 'answered' }>>([]);
  const [snake, setSnake] = useState<SnakeCell[]>([{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]);
  const [snakeFood, setSnakeFood] = useState<SnakeCell>({ x: 11, y: 7 });
  const [snakeDirection, setSnakeDirection] = useState<SnakeDirection>('right');
  const [snakeScore, setSnakeScore] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeAiPreview, setActiveAiPreview] = useState<'detail' | 'prompt' | 'article' | null>(null);
  const [siteConfig, setSiteConfig] = useState<AdminConfig>(readAdminConfig);
  const [adminDraft, setAdminDraft] = useState<AdminConfig>(readAdminConfig);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const pageIds = ['home', 'about', 'experience', 'skills', 'works', 'ai', 'chat'];
  const specialPageIndex: Record<string, number> = { eye: 7 };
  const unlockRef = useRef<HTMLButtonElement | null>(null);
  const featuredPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const snakeBoardRef = useRef<HTMLDivElement | null>(null);
  const displayProfile = { ...profile, ...siteConfig.profile };
  const displayWorks = works.map((work, index) => ({ ...work, ...(siteConfig.works[index] ?? {}) }));
  const displayExperience = experience.map((item, index) => ({ ...item, ...(siteConfig.experience[index] ?? {}) }));
  const featuredWork = activeWorkPreview === null ? null : displayWorks[activeWorkPreview];
  const featuredSrc = featuredWork?.previewSrc ?? featuredWork?.src;

  useEffect(() => {
    if (!unlocked) return;

    let locked = false;
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      const eyeRect = document.getElementById('eye')?.getBoundingClientRect();
      if (eyeLocked || pageIndex === 7 || (eyeRect && Math.abs(eyeRect.top) < 90)) {
        event.preventDefault();
        return;
      }
      if (target?.closest('.wechat-shell, .ai-scroll-preview, .ai-preview-window')) return;
      if (Math.abs(event.deltaY) < 46 || locked || selectedWork) return;
      event.preventDefault();
      locked = true;

      setPageIndex((current) => {
        const next = Math.min(Math.max(current + (event.deltaY > 0 ? 1 : -1), 0), pageIds.length - 1);
        window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' as ScrollBehavior });
        document.getElementById(pageIds[next])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => { locked = false; }, 1180);
        return next;
      });
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [unlocked, selectedWork, pageIndex, eyeLocked]);

  useEffect(() => {
    if (!unlocked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) return;
        const nextIndex = pageIds.indexOf(visible.target.id);
        if (nextIndex >= 0) setPageIndex(nextIndex);
      },
      { threshold: [0.52, 0.68, 0.84] },
    );

    pageIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [unlocked]);

  useEffect(() => {
    const video = featuredPreviewRef.current;
    if (!featuredSrc || !video) return;

    video.muted = true;
    video.controls = false;
    video.load();
    video.currentTime = 0;
    const loadingTimer = window.setTimeout(() => setWorkPreviewLoading(false), 1400);
    void video.play()
      .then(() => setWorkPreviewLoading(false))
      .catch(() => setWorkPreviewLoading(false));
    return () => window.clearTimeout(loadingTimer);
  }, [featuredSrc]);

  useEffect(() => {
    if (pageIndex !== 6) return;

    if (chatIntroPlayed) {
      setVisibleChatCount(3);
      window.setTimeout(() => {
        const body = chatBodyRef.current;
        if (body) body.scrollTop = body.scrollHeight;
      }, 180);
      return;
    }

    setVisibleChatCount(0);
    const timers = [720, 2200, 4200].map((delay, index) =>
      window.setTimeout(() => {
        setVisibleChatCount(index + 1);
        setNewMessageNotice(true);
      }, delay),
    );
    const doneTimer = window.setTimeout(() => setChatIntroPlayed(true), 4700);
    const clearTimer = window.setTimeout(() => setNewMessageNotice(false), 5600);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
      window.clearTimeout(clearTimer);
    };
  }, [pageIndex, chatIntroPlayed]);

  useEffect(() => {
    if (pageIndex !== 6) return;
    const timer = window.setTimeout(() => {
      const body = chatBodyRef.current;
      if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [pageIndex, visibleChatCount, quickChats]);

  useEffect(() => {
    if (pageIndex !== 6 && !eyeLocked) return;

    snakeBoardRef.current?.focus({ preventScroll: true });

    const timer = window.setInterval(() => {
      setEyeTarget((current) => {
        const next = Math.floor(Math.random() * 8);
        return next === current ? (next + 3) % 8 : next;
      });
    }, 1280 + Math.floor(Math.random() * 620));
    return () => window.clearInterval(timer);
  }, [pageIndex, eyeLocked]);

  useEffect(() => {
    if (!unlocked) return;

    const isEyeVisible = () => {
      const rect = document.getElementById('eye')?.getBoundingClientRect();
      return Boolean(rect && Math.abs(rect.top) < 120);
    };

    document.documentElement.classList.toggle('is-eye-locked', eyeLocked || pageIndex === 7);

    const blockEyePointer = (event: Event) => {
      if (!isEyeVisible()) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('#eye .eye-return-home')) return;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      window.setTimeout(() => {
        document.getElementById('eye')?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
        snakeBoardRef.current?.focus({ preventScroll: true });
      }, 0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEyeVisible() && !eyeLocked) return;
      const directionMap: Record<string, SnakeDirection> = {
        ArrowUp: 'up',
        w: 'up',
        W: 'up',
        ArrowDown: 'down',
        s: 'down',
        S: 'down',
        ArrowLeft: 'left',
        a: 'left',
        A: 'left',
        ArrowRight: 'right',
        d: 'right',
        D: 'right',
      };
      const next = directionMap[event.key];
      if (!next) return;
      event.preventDefault();
      setSnakeDirection((current) => {
        if ((current === 'up' && next === 'down') || (current === 'down' && next === 'up') || (current === 'left' && next === 'right') || (current === 'right' && next === 'left')) return current;
        return next;
      });
    };

    const blockedMouseEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'] as const;
    blockedMouseEvents.forEach((eventName) => document.addEventListener(eventName, blockEyePointer, true));
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.documentElement.classList.remove('is-eye-locked');
      blockedMouseEvents.forEach((eventName) => document.removeEventListener(eventName, blockEyePointer, true));
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [unlocked, eyeLocked, pageIndex]);

  useEffect(() => {
    if (!unlocked) return;

    const boardSize = 14;
    const randomFood = () => ({ x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize) });
    const timer = window.setInterval(() => {
      setSnake((current) => {
        const head = current[0];
        const vector = snakeDirection === 'up' ? { x: 0, y: -1 } : snakeDirection === 'down' ? { x: 0, y: 1 } : snakeDirection === 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 };
        const nextHead = { x: (head.x + vector.x + boardSize) % boardSize, y: (head.y + vector.y + boardSize) % boardSize };
        if (current.some((cell, index) => index > 0 && cell.x === nextHead.x && cell.y === nextHead.y)) {
          setSnakeScore(0);
          setSnakeDirection('right');
          setSnakeFood(randomFood());
          return [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
        }
        const ateFood = nextHead.x === snakeFood.x && nextHead.y === snakeFood.y;
        if (ateFood) {
          setSnakeScore((score) => score + 1);
          setSnakeFood(randomFood());
          return [nextHead, ...current];
        }
        return [nextHead, ...current.slice(0, -1)];
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [unlocked, snakeDirection, snakeFood]);
  const verifyCode = () => {
    if (code.trim() === accessCode) {
      setStatus('success');
      setUnlocked(true);
      setPageIndex(1);
      unlockRef.current?.classList.add('is-pressed');
      window.setTimeout(() => {
        window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' as ScrollBehavior });
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
      }, 640);
      return;
    }
    setStatus('error');
  };

  const openAdmin = () => {
    setAdminOpen(true);
    setAdminUnlocked(false);
    setAdminPasswordInput('');
    setAdminNotice('');
  };

  const unlockAdmin = () => {
    if (adminPasswordInput === adminPassword) {
      setAdminUnlocked(true);
      setAdminDraft(siteConfig);
      setAdminNotice('已解锁编辑器');
    } else {
      setAdminNotice('密码不正确');
    }
  };

  const saveAdmin = () => {
    setSiteConfig(adminDraft);
    window.localStorage.setItem(adminStorageKey, JSON.stringify(adminDraft));
    setAdminNotice('已保存到当前浏览器');
  };

  const exportAdmin = () => {
    const blob = new Blob([JSON.stringify(adminDraft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meijunsheng-portfolio-config.json';
    link.click();
    URL.revokeObjectURL(url);
    setAdminNotice('配置文件已导出');
  };

  const resetAdmin = () => {
    setAdminDraft(JSON.parse(JSON.stringify(defaultAdminConfig)) as AdminConfig);
    setAdminNotice('已恢复默认内容，点击保存后生效');
  };

  const updateProfileDraft = (field: keyof AdminConfig['profile'], value: string) => {
    setAdminDraft((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  };

  const updateExperienceDraft = (index: number, field: keyof AdminExperience, value: string) => {
    setAdminDraft((current) => ({
      ...current,
      experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const updateWorkDraft = (index: number, field: keyof AdminWork, value: string) => {
    setAdminDraft((current) => ({
      ...current,
      works: current.works.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const uploadWorkCover = (index: number, file?: File) => {
    if (!file) return;
    if (file.size > 2_500_000) {
      setAdminNotice('图片建议控制在 2.5MB 以内');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateWorkDraft(index, 'cover', String(reader.result));
    reader.readAsDataURL(file);
  };

  const copyCloudLink = async () => {
    try {
      await navigator.clipboard.writeText(cloudLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 1600);
    } catch {
      setUrlCopied(false);
    }
  };

  const jumpToPage = (id: string) => {
    const nextIndex = pageIds.indexOf(id);
    const specialIndex = specialPageIndex[id];
    if (specialIndex !== undefined) {
      if (id === 'eye') setEyeLocked(true);
      setPageIndex(specialIndex);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }
    setEyeLocked(false);
    if (nextIndex >= 0) setPageIndex(nextIndex);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectWorkPreview = (index: number) => {
    if (index === activeWorkPreview) return;
    setWorkPreviewLoading(true);
    setActiveWorkPreview(index);
  };

  const playFeaturedFullscreen = async () => {
    const video = featuredPreviewRef.current;
    if (!featuredWork || !video) return;

    video.muted = false;
    video.volume = 1;
    video.controls = true;
    try {
      await video.play();
    } catch {
      return;
    }

    const fullscreenVideo = video as HTMLVideoElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const requestFullscreen = fullscreenVideo.requestFullscreen ?? fullscreenVideo.webkitRequestFullscreen;
    if (requestFullscreen) {
      await requestFullscreen.call(fullscreenVideo)?.catch?.(() => undefined);
    }
  };

  const quickReplyMap = {
    info: { question: '个人信息', answer: `${displayProfile.name}，${displayProfile.headline}。${displayProfile.intro}` },
    contact: { question: '联系方式', answer: '电话：15794454784。' },
    hobby: { question: '你的爱好', answer: '我平时喜欢观察内容趋势、拍摄剪辑、研究镜头语言，也会持续拆解优秀账号的表达方式。' },
  } as const;

  const sendQuickReply = (type: 'info' | 'contact' | 'hobby') => {
    const item = quickReplyMap[type];
    const id = `${type}-${Date.now()}`;
    setNewMessageNotice(true);
    setQuickChats((current) => [...current, { id, ...item, status: 'typing' }]);
    window.setTimeout(() => {
      setQuickChats((current) =>
        current.map((chat) => (chat.id === id ? { ...chat, status: 'answered' } : chat)),
      );
    }, 980 + item.answer.length * 18);
  };
  const activeExperienceItem = displayExperience[activeExperience];
  const activeSkillItem = skillMatrix[activeSkill];
  const experienceWaveItems = [displayExperience[2], displayExperience[1], displayExperience[0]];

  return (
    <div className={`site-shell${unlocked ? ' is-unlocked' : ''}`}>
      <main>
        <section id="home" className="page hero-page">
          <div className="hero-copy">
            <span className="folio-index">01 / WORKSPACE</span>
            <p className="micro-copy">Hello, welcome</p>
            <h1>我的工作空间</h1>
            <div className="hero-rule" aria-hidden="true" />
            <div className="gate-bar" data-state={status}>
              <input
                aria-label="验证码"
                value={code}
                inputMode="numeric"
                maxLength={4}
                placeholder="请输入验证码"
                onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                onKeyDown={(event) => { if (event.key === 'Enter') verifyCode(); }}
              />
              <button ref={unlockRef} type="button" onClick={verifyCode}>
                <LockKeyhole size={16} />
                开始探索
              </button>
            </div>
          </div>
          <div className="hero-portrait" aria-hidden="true">
            <img src={assetPath('/hero-cutout-v3-mirrored-fade.webp')} alt="" fetchPriority="high" decoding="async" />
          </div>
        </section>

        {unlocked ? (
          <div className="unlocked-pages">
            <section id="about" className={`page about-page${pageIndex === 1 ? ' is-active-page' : ''}`}>
              <div className="about-portrait" aria-hidden="true">
                <img src={assetPath('/about-portrait-2-waistfade-v2.webp')} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="about-copy">
                <p className="micro-copy">About me</p>
                <h2>{displayProfile.name}</h2>
                <p className="role-line">{displayProfile.headline}</p>
                <p className="statement">{displayProfile.statement}</p>
                <div className="about-signal-panel" aria-label="个人能力数据概览">
                  <article className="signal-main">
                    <span>Experience</span>
                    <strong>3年+</strong>
                    <p>新媒体运营与活动策划</p>
                  </article>
                  <div className="signal-bars">
                    <div className="signal-bar" style={{ '--level': '88%' } as CSSProperties}>
                      <span>内容策划</span>
                      <em>选题 / 脚本 / 发布节奏</em>
                    </div>
                    <div className="signal-bar" style={{ '--level': '82%' } as CSSProperties}>
                      <span>影像执行</span>
                      <em>拍摄 / 剪辑 / 包装适配</em>
                    </div>
                    <div className="signal-bar" style={{ '--level': '76%' } as CSSProperties}>
                      <span>增长复盘</span>
                      <em>投放 / 数据 / 转化路径</em>
                    </div>
                  </div>
                  <div className="platform-strip" aria-label="平台覆盖">
                    <span>抖音</span>
                    <span>小红书</span>
                    <span>视频号</span>
                    <span>公众号</span>
                  </div>
                </div>
              </div>
            </section>

            <section id="experience" className={`page experience-page interactive-experience-page pulse-experience-page${pageIndex === 2 ? ' is-active-page' : ''}`}>
              <div className="section-title">
                <span>Experience</span>
                <h2>工作轨迹</h2>
              </div>
              <div className="career-visual wave-career-visual" aria-label="波浪线式工作经历交互轨迹">
                <article key={activeExperienceItem.role} className="wave-career-detail">
                  <div className="wave-detail-index">
                    <span>0{activeExperience + 1}</span>
                    <em>{activeExperienceItem.period}</em>
                  </div>
                  <div className="wave-detail-main">
                    <p className="wave-detail-company">{activeExperienceItem.company}</p>
                    <h3>{activeExperienceItem.role}</h3>
                    <p>{activeExperienceItem.summary}</p>
                  </div>
                  <div className="wave-detail-keyword">
                    <span>Focus</span>
                    <strong>{activeExperienceItem.keyword}</strong>
                  </div>
                </article>

                <div className="wave-line-stage" aria-label="任职年限波浪路径">
                  <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="wave-line-svg" aria-hidden="true">
                    <path className="wave-line wave-line-base" d="M110 214 C230 116 326 220 420 160 S585 78 675 190 S808 286 908 128 S1050 62 1140 174" />
                    <path className="wave-line wave-line-active" d="M110 214 C230 116 326 220 420 160 S585 78 675 190 S808 286 908 128 S1050 62 1140 174" />
                  </svg>
                  <div className="wave-node-layer">
                    {experienceWaveItems.map((item) => {
                      const originalIndex = displayExperience.findIndex((experienceItem) => experienceItem.company === item.company);
                      const waveIndex = experienceWaveItems.findIndex((experienceItem) => experienceItem.company === item.company);
                      return (
                        <button
                          key={item.company}
                          type="button"
                          className={`wave-career-node wave-node-${waveIndex + 1}${activeExperience === originalIndex ? ' is-active' : ''}`}
                          onClick={() => setActiveExperience(originalIndex)}
                          onMouseEnter={() => setActiveExperience(originalIndex)}
                        >
                          <span className="wave-dot" />
                          <span className="wave-period">{item.period}</span>
                          <strong>{item.company}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section id="skills" className={`page skills-page interactive-skills-page body-skills-page${pageIndex === 3 ? ' is-active-page' : ''}`}>
              <div className="section-title centered">
                <span>Skill System</span>
                <h2>能力矩阵</h2>
              </div>
              <div className="matrix-wrap body-skill-wrap">
                <div className="matrix-field body-skill-field" role="group" aria-label="人物能力标签">
                  <img className="skill-silhouette" src={assetPath('/skill-person-3.webp')} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                  {skillMatrix.map((skill, index) => (
                    <button
                      key={skill.label}
                      type="button"
                      className={`matrix-point body-skill-point${activeSkill === index ? ' is-active' : ''}`}
                      style={{ left: `${skill.bodyX}%`, top: `${skill.bodyY}%` }}
                      onClick={() => setActiveSkill(index)}
                      onMouseEnter={() => setActiveSkill(index)}
                      aria-label={`${skill.label}，${skill.axis}`}
                    >
                      <span>{skill.label}</span>
                    </button>
                  ))}
                </div>
                <aside key={activeSkillItem.label} className="matrix-detail body-skill-detail">
                  <span>{activeSkillItem.axis}</span>
                  <h3>{activeSkillItem.label}</h3>
                  <p>{activeSkillItem.detail}</p>
                </aside>
              </div>
            </section>

            <section id="works" className={`page works-page film-desk-page${pageIndex === 4 ? ' is-active-page' : ''}`}>
              <div className="works-head">
                <div className="section-title">
                  <span>Selected Works</span>
                  <h2>精选作品</h2>
                  <p className="loading-network-note">加载速度与网速相关，请稍后</p>
                </div>
                <div className="cloud-actions">
                  <a href={cloudLink} target="_blank" rel="noreferrer">
                    <ArrowUpRight size={17} />
                    打开作品集
                  </a>
                  <button type="button" onClick={copyCloudLink}>
                    <Copy size={16} />
                    {copied ? '已复制' : '复制链接'}
                  </button>
                </div>
              </div>
              <div className="film-desk">
                <div className={`featured-work preview-stage${featuredWork ? ' has-selection' : ' is-empty'}${workPreviewLoading ? ' is-loading-preview' : ''}`} aria-label={featuredWork ? `静音预览${featuredWork.title}` : '预览区'}>
                  <span className="cover-placeholder" aria-hidden="true" />
                  {/* Keep the preview stage neutral until the selected video is ready. */}
                  <span className="preview-zone-label">预览区</span>
                  {featuredWork ? (
                    <>
                      <video
                        ref={featuredPreviewRef}
                        className="stage-preview-video"
                        key={featuredWork.src}
                        src={mediaPath(featuredWork.src)}
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onLoadStart={() => setWorkPreviewLoading(true)}
                        onLoadedMetadata={() => setWorkPreviewLoading(false)}
                        onLoadedData={() => setWorkPreviewLoading(false)}
                        onCanPlay={() => setWorkPreviewLoading(false)}
                        onPlay={() => setWorkPreviewLoading(false)}
                        onPlaying={() => setWorkPreviewLoading(false)}
                        onWaiting={() => setWorkPreviewLoading(true)}
                        onError={() => setWorkPreviewLoading(false)}
                      />
                      {workPreviewLoading ? <span className="preview-loading-indicator" aria-live="polite" aria-label="正在加载视频预览" /> : null}
                      <span className="film-count">Film {String((activeWorkPreview ?? 0) + 1).padStart(2, '0')} / 06</span>
                      <button className="play-dot full-watch-button" type="button" onClick={playFeaturedFullscreen} aria-label="完整观看">完整观看</button>
                      <div className="featured-copy">
                        <p>{featuredWork.category}</p>
                        <h3>{featuredWork.title}</h3>
                        <small>{featuredWork.description}</small>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="works-grid thumbnail-rail">
                  {displayWorks.map((work, index) => (
                    <button
                      className={`work-card${activeWorkPreview === index ? ' is-active' : ''}`}
                      type="button"
                      key={work.src}
                      onClick={() => selectWorkPreview(index)}
                    >
                      <span className="film-mini-index">0{index + 1}</span>
                      <span className="work-cover-title">{work.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section id="ai" className={`page ai-page${pageIndex === 5 ? ' is-active-page' : ''}`}>
              <div className="ai-page-intro">
                <div className="section-title"><span>AI Portfolio</span><h2>AI 作品集</h2></div>
                <p>从提示词到成片，把一次创作拆成可见的工作流程。</p>
                <p className="loading-network-note">加载速度与网速相关，请稍后</p>
                <p className="ai-credit-line">{siteConfig.aiSubtitle}</p>
              </div>
              <div className="ai-portfolio-layout">
                <div className="ai-preview-window" aria-live="polite">
                  <div className="ai-preview-topline"><span>PREVIEW / {activeAiPreview ? activeAiPreview.toUpperCase() : 'SELECT A WORK'}</span><i /></div>
                  {activeAiPreview === 'detail' ? (
                    <div className="ai-scroll-preview ai-image-stack" tabIndex={0} aria-label="电商详情页长图预览">{aiPortfolio.detailImages.map((src, index) => <img key={src} src={assetPath(src)} alt={`电商详情页第${index + 1}屏`} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'low'} decoding="async" />)}</div>
                  ) : activeAiPreview === 'prompt' ? (
                    <div className="ai-scroll-preview ai-prompt-preview" tabIndex={0} aria-label="产品提示词预览">{aiPortfolio.promptPreview.map((line, index) => <p key={`${line}-${index}`} className={index < 2 ? 'is-prompt-heading' : ''}>{line}</p>)}<a href={assetPath(aiPortfolio.promptFile)} download>下载完整提示词文档 <ArrowUpRight size={15} /></a></div>
                  ) : activeAiPreview === 'article' ? (
                    <div className="ai-scroll-preview ai-article-preview" tabIndex={0} aria-label="公众号推文长图预览"><img src={assetPath(aiPortfolio.articleImage)} alt="公众号推文长图" loading="eager" fetchPriority="high" decoding="async" /></div>
                  ) : <div className="ai-preview-empty"><span>悬停作品</span><strong>预览会在这里展开</strong></div>}
                </div>
                <div className="ai-work-list">
                  <button type="button" className={`ai-work-entry${activeAiPreview === 'detail' ? ' is-active' : ''}`} onMouseEnter={() => setActiveAiPreview('detail')} onFocus={() => setActiveAiPreview('detail')} onClick={() => setActiveAiPreview('detail')}><span className="ai-entry-index">01</span><span><strong>电商详情页</strong><small>6 screens / vertical story</small></span><ArrowUpRight size={18} /></button>
                  <button type="button" className={`ai-work-entry${activeAiPreview === 'prompt' ? ' is-active' : ''}`} onMouseEnter={() => setActiveAiPreview('prompt')} onFocus={() => setActiveAiPreview('prompt')} onClick={() => setActiveAiPreview('prompt')}><span className="ai-entry-index">02</span><span><strong>产品提示词</strong><small>structure / copy / visual direction</small></span><ArrowUpRight size={18} /></button>
                  <button type="button" className={`ai-work-entry${activeAiPreview === 'article' ? ' is-active' : ''}`} onMouseEnter={() => setActiveAiPreview('article')} onFocus={() => setActiveAiPreview('article')} onClick={() => setActiveAiPreview('article')}><span className="ai-entry-index">03</span><span><strong>公众号推文</strong><small>one long-form visual article</small></span><ArrowUpRight size={18} /></button>
                </div>
              </div>
            </section>
            <section id="chat" className={`page chat-page${pageIndex === 6 ? ' is-active-page' : ''}${chatIntroPlayed ? ' is-chat-settled' : ''}`}>
              <div className="wechat-shell" aria-label="微信聊天式结束页">
                <header className="wechat-header">
                  <span className="wechat-dot" />
                  <strong>梅俊生的工作空间</strong>
                  <em>{visibleChatCount >= 3 ? '在线' : '正在输入...'}</em>
                </header>
                <div className="wechat-body" ref={chatBodyRef}>
                  <div className={`chat-row incoming${visibleChatCount >= 1 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>你好，以上就是我的工作空间，感谢观看！</p>
                  </div>
                  <div className={`chat-row incoming${visibleChatCount >= 2 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>如果你还需要了解其他的，可以直接告诉我。</p>
                  </div>
                  <div className={`chat-row incoming action-message${visibleChatCount >= 3 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>
                      如点击
                      <a href={assetPath('/resume/梅俊生-简历投递版.docx')} download>查看/下载简历</a>
                      、
                      <button type="button" onClick={copyCurrentUrl}>{urlCopied ? '已复制网址' : '复制网址'}</button>
                      以及
                      <button type="button" onClick={() => jumpToPage('eye')}>缓解眼疲劳</button>
                    </p>
                  </div>
                  {quickChats.map((item) => (
                    <div className="quick-dialog" key={item.id}>
                      <div className="chat-row outgoing is-visible">
                        <p>{item.question}</p>
                        <span className="chat-avatar self-avatar">我</span>
                      </div>
                      {item.status === 'typing' ? (
                        <div className="chat-row incoming is-visible typing-row">
                          <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                          <p><span className="typing-dots"><i /><i /><i /></span>正在输入</p>
                        </div>
                      ) : (
                        <div className="chat-row incoming is-visible">
                          <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                          <p>{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {newMessageNotice ? <span className="wechat-new-message-tip">新消息</span> : null}
                </div>
                <footer className="wechat-input wechat-input-rich">
                  <div className="quick-send-bar" aria-label="快捷发送">
                    <button type="button" onClick={() => sendQuickReply('info')}>个人信息</button>
                    <button type="button" onClick={() => sendQuickReply('contact')}>联系方式</button>
                    <button type="button" onClick={() => sendQuickReply('hobby')}>你的爱好</button>
                  </div>
                  <div className="wechat-input-line">
                    <span>输入消息...</span>
                    <div className="chat-footer-actions">
                      <button className="developer-entry-button" type="button" onClick={openAdmin}>开发者入口</button>
                      <button className="eye-return-home" type="button" onClick={() => { setEyeLocked(false); jumpToPage('home'); }}>返回首页</button>
                    </div>
                  </div>
                </footer>
              </div>
            </section>
            <section
              id="eye"
              className={`page eye-page${pageIndex === 7 || eyeLocked ? ' is-active-page' : ''}`}
              onPointerDownCapture={(event) => {
                if ((event.target as HTMLElement).closest('.eye-return-home')) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest('.eye-return-home')) return;
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <div className="eye-game snake-eye-game">
                <div className="eye-copy">
                  <span>Eye Relief</span>
                  <h2>缓解眼疲劳</h2>
                  <p>用方向键或 WASD 控制贪吃蛇，让视线跟随蛇头移动。页面内滚轮不会离开这里，结束后点击按钮返回首页。</p>
                  <button className="eye-return-home" type="button" onClick={() => { setEyeLocked(false); jumpToPage('home'); }}>返回首页</button>
                </div>
                <div className="snake-game-board" ref={snakeBoardRef} tabIndex={0} aria-label="贪吃蛇护眼小游戏，使用方向键控制">
                  <div className="snake-game-head">
                    <span>Snake</span>
                    <strong>{snakeScore}</strong>
                  </div>
                  <div className="snake-grid" aria-hidden="true">
                    {Array.from({ length: 196 }).map((_, index) => {
                      const cell = { x: index % 14, y: Math.floor(index / 14) };
                      const snakeIndex = snake.findIndex((part) => part.x === cell.x && part.y === cell.y);
                      const isFood = snakeFood.x === cell.x && snakeFood.y === cell.y;
                      return <span key={index} className={`${snakeIndex === 0 ? 'is-head' : snakeIndex > 0 ? 'is-body' : ''}${isFood ? ' is-food' : ''}`} />;
                    })}
                  </div>
                  <p>方向键 / WASD 控制</p>
                </div>
              </div>
            </section>
            {adminOpen ? (
              <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="开发者内容管理">
                <div className="admin-panel">
                  <header className="admin-header">
                    <div><span>Developer workspace</span><h2>内容管理</h2></div>
                    <button type="button" className="admin-close" onClick={() => setAdminOpen(false)} aria-label="关闭管理后台"><X size={20} /></button>
                  </header>
                  {!adminUnlocked ? (
                    <form className="admin-lock" onSubmit={(event) => { event.preventDefault(); unlockAdmin(); }}>
                      <p>只修改文字与素材，不改变页面结构和动效。</p>
                      <label>管理密码<input autoFocus type="password" value={adminPasswordInput} onChange={(event) => setAdminPasswordInput(event.target.value)} placeholder="输入密码" /></label>
                      <button type="submit">进入编辑器</button>
                      {adminNotice ? <small>{adminNotice}</small> : null}
                    </form>
                  ) : (
                    <div className="admin-editor">
                      <div className="admin-editor-note">静态 GitHub Pages 会把修改保存到当前浏览器。需要迁移时请导出配置文件。</div>
                      <section className="admin-section"><h3>个人信息</h3><div className="admin-fields">
                        <label>姓名<input value={adminDraft.profile.name} onChange={(event) => updateProfileDraft('name', event.target.value)} /></label>
                        <label>职业标题<input value={adminDraft.profile.headline} onChange={(event) => updateProfileDraft('headline', event.target.value)} /></label>
                        <label className="admin-wide">个人介绍<textarea value={adminDraft.profile.statement} onChange={(event) => updateProfileDraft('statement', event.target.value)} /></label>
                      </div></section>
                      <section className="admin-section"><h3>工作经历</h3>{adminDraft.experience.map((item, index) => <fieldset className="admin-record" key={`${item.company}-${index}`}><legend>经历 {index + 1}</legend><div className="admin-fields"><label>公司<input value={item.company} onChange={(event) => updateExperienceDraft(index, 'company', event.target.value)} /></label><label>岗位<input value={item.role} onChange={(event) => updateExperienceDraft(index, 'role', event.target.value)} /></label><label>时间<input value={item.period} onChange={(event) => updateExperienceDraft(index, 'period', event.target.value)} /></label><label>关键词<input value={item.keyword} onChange={(event) => updateExperienceDraft(index, 'keyword', event.target.value)} /></label><label className="admin-wide">工作内容<textarea value={item.summary} onChange={(event) => updateExperienceDraft(index, 'summary', event.target.value)} /></label></div></fieldset>)}</section>
                      <section className="admin-section"><h3>作品与素材</h3>{adminDraft.works.map((work, index) => <fieldset className="admin-record" key={`${work.src}-${index}`}><legend>作品 {String(index + 1).padStart(2, '0')}</legend><div className="admin-fields"><label>作品名<input value={work.title} onChange={(event) => updateWorkDraft(index, 'title', event.target.value)} /></label><label>分类<input value={work.category} onChange={(event) => updateWorkDraft(index, 'category', event.target.value)} /></label><label>视频地址<input value={work.src} onChange={(event) => updateWorkDraft(index, 'src', event.target.value)} /></label><label>封面地址<input value={work.cover.startsWith('data:') ? '已上传本地封面' : work.cover} onChange={(event) => updateWorkDraft(index, 'cover', event.target.value)} /></label><label className="admin-wide">说明<textarea value={work.description} onChange={(event) => updateWorkDraft(index, 'description', event.target.value)} /></label><label className="admin-file">上传封面<input type="file" accept="image/*" onChange={(event) => uploadWorkCover(index, event.target.files?.[0])} /></label></div></fieldset>)}</section>
                      <section className="admin-section"><h3>AI 作品集</h3><label className="admin-wide">副标题<input value={adminDraft.aiSubtitle} onChange={(event) => setAdminDraft((current) => ({ ...current, aiSubtitle: event.target.value }))} /></label></section>
                      <div className="admin-actions"><button type="button" onClick={saveAdmin}>保存修改</button><button type="button" onClick={exportAdmin}>导出配置</button><button type="button" className="admin-muted-button" onClick={resetAdmin}>恢复默认</button>{adminNotice ? <span>{adminNotice}</span> : null}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {selectedWork ? (
              <div className="video-modal" role="dialog" aria-modal="true" aria-label={selectedWork.title}>
                <button className="modal-backdrop" type="button" onClick={() => setSelectedWork(null)} aria-label="关闭预览" />
                <div className="modal-panel">
                  <div className="modal-head">
                    <div>
                      <span>{selectedWork.category}</span>
                      <h3>{selectedWork.title}</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedWork(null)} aria-label="关闭预览"><X size={20} /></button>
                  </div>
                  <video src={mediaPath(selectedWork.src)} controls autoPlay playsInline controlsList="nodownload noplaybackrate" />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
