import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
type SnakeDirection = 'up' | 'down' | 'left' | 'right';
type SnakeCell = { x: number; y: number };
import { ArrowUpRight, Copy, LockKeyhole, X } from 'lucide-react';
import { accessCode, aiPortfolio, assetPath, cloudLink, experience, profile, skillMatrix, works } from './data';

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
  const pageIds = ['home', 'about', 'experience', 'skills', 'works', 'ai', 'chat'];
  const specialPageIndex: Record<string, number> = { eye: 7 };
  const unlockRef = useRef<HTMLButtonElement | null>(null);
  const featuredPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const snakeBoardRef = useRef<HTMLDivElement | null>(null);
  const featuredWork = activeWorkPreview === null ? null : works[activeWorkPreview];

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
    if (!featuredWork || !video) return;

    video.muted = true;
    video.controls = false;
    video.load();
    video.currentTime = 0;
    const loadingTimer = window.setTimeout(() => setWorkPreviewLoading(false), 1400);
    void video.play()
      .then(() => setWorkPreviewLoading(false))
      .catch(() => setWorkPreviewLoading(false));
    return () => window.clearTimeout(loadingTimer);
  }, [featuredWork]);

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
    window.setTimeout(() => setWorkPreviewLoading(false), 1100);
    window.setTimeout(() => {
      const video = featuredPreviewRef.current;
      if (!video) return;
      video.muted = true;
      video.controls = false;
      video.load();
      video.currentTime = 0;
      void video.play()
        .then(() => setWorkPreviewLoading(false))
        .catch(() => setWorkPreviewLoading(false));
    }, 180);
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
    info: { question: '个人信息', answer: `${profile.name}，${profile.headline}。${profile.intro}` },
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
  const activeExperienceItem = experience[activeExperience];
  const activeSkillItem = skillMatrix[activeSkill];
  const experienceWaveItems = [experience[2], experience[1], experience[0]];

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
            <img src={assetPath('/hero-cutout-v3-mirrored-fade.png')} alt="" />
          </div>
        </section>

        {unlocked ? (
          <div className="unlocked-pages">
            <section id="about" className={`page about-page${pageIndex === 1 ? ' is-active-page' : ''}`}>
              <div className="about-portrait" aria-hidden="true">
                <img src={assetPath('/about-portrait-2-waistfade-v2.png')} alt="" />
              </div>
              <div className="about-copy">
                <p className="micro-copy">About me</p>
                <h2>{profile.name}</h2>
                <p className="role-line">{profile.headline}</p>
                <p className="statement">{profile.statement}</p>
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
                      const originalIndex = experience.findIndex((experienceItem) => experienceItem.company === item.company);
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
                  <img className="skill-silhouette" src={assetPath('/skill-person-3.png')} alt="" aria-hidden="true" />
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
                  {featuredWork ? <img className="stage-cover-image" src={assetPath(featuredWork.cover)} alt="" aria-hidden="true" /> : null}
                  <span className="preview-zone-label">预览区</span>
                  {featuredWork ? (
                    <>
                      <video
                        ref={featuredPreviewRef}
                        className="stage-preview-video"
                        key={featuredWork.src}
                        src={assetPath(featuredWork.src)}
                        muted
                        loop
                        playsInline
                        poster={assetPath(featuredWork.cover)}
                        preload="auto"
                        onLoadStart={() => setWorkPreviewLoading(true)}
                        onLoadedMetadata={() => setWorkPreviewLoading(false)}
                        onLoadedData={() => setWorkPreviewLoading(false)}
                        onCanPlay={() => setWorkPreviewLoading(false)}
                        onPlay={() => setWorkPreviewLoading(false)}
                        onPlaying={() => setWorkPreviewLoading(false)}
                        onWaiting={() => setWorkPreviewLoading(true)}
                      />
                      {workPreviewLoading ? <span className="preview-loading-indicator" aria-live="polite">加载中</span> : null}
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
                  {works.map((work, index) => (
                    <button
                      className={`work-card${activeWorkPreview === index ? ' is-active' : ''}`}
                      type="button"
                      key={work.src}
                      onClick={() => selectWorkPreview(index)}
                      onMouseEnter={() => selectWorkPreview(index)}
                      onFocus={() => selectWorkPreview(index)}
                    >
                      <span className="cover-placeholder" aria-hidden="true" />
                      <img className="work-cover-image" src={assetPath(work.cover)} alt="" aria-hidden="true" />
                      <span className="film-mini-index">0{index + 1}</span>
                      <div>
                        <p>{work.category}</p>
                        <h3>{work.title}</h3>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section id="ai" className={`page ai-page${pageIndex === 5 ? ' is-active-page' : ''}`}>
              <div className="ai-page-intro">
                <div className="section-title"><span>AI Portfolio</span><h2>AI 作品集</h2></div>
                <p>从提示词到成片，把一次创作拆成可见的工作流程。</p>
              </div>
              <div className="ai-portfolio-layout">
                <div className="ai-preview-window" aria-live="polite">
                  <div className="ai-preview-topline"><span>PREVIEW / {activeAiPreview ? activeAiPreview.toUpperCase() : 'SELECT A WORK'}</span><i /></div>
                  {activeAiPreview === 'detail' ? (
                    <div className="ai-scroll-preview ai-image-stack" tabIndex={0} aria-label="电商详情页长图预览">{aiPortfolio.detailImages.map((src, index) => <img key={src} src={assetPath(src)} alt={`电商详情页第${index + 1}屏`} />)}</div>
                  ) : activeAiPreview === 'prompt' ? (
                    <div className="ai-scroll-preview ai-prompt-preview" tabIndex={0} aria-label="产品提示词预览">{aiPortfolio.promptPreview.map((line, index) => <p key={`${line}-${index}`} className={index < 2 ? 'is-prompt-heading' : ''}>{line}</p>)}<a href={assetPath(aiPortfolio.promptFile)} download>下载完整提示词文档 <ArrowUpRight size={15} /></a></div>
                  ) : activeAiPreview === 'article' ? (
                    <div className="ai-scroll-preview ai-article-preview" tabIndex={0} aria-label="公众号推文长图预览"><img src={assetPath(aiPortfolio.articleImage)} alt="公众号推文长图" /></div>
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
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.jpg')} alt="梅俊生头像" />
                    <p>你好，以上就是我的工作空间，感谢观看！</p>
                  </div>
                  <div className={`chat-row incoming${visibleChatCount >= 2 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.jpg')} alt="梅俊生头像" />
                    <p>如果你还需要了解其他的，可以直接告诉我。</p>
                  </div>
                  <div className={`chat-row incoming action-message${visibleChatCount >= 3 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.jpg')} alt="梅俊生头像" />
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
                          <img className="chat-avatar photo-avatar" src={assetPath('/headshot.jpg')} alt="梅俊生头像" />
                          <p><span className="typing-dots"><i /><i /><i /></span>正在输入</p>
                        </div>
                      ) : (
                        <div className="chat-row incoming is-visible">
                          <img className="chat-avatar photo-avatar" src={assetPath('/headshot.jpg')} alt="梅俊生头像" />
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
                    <button className="eye-return-home" type="button" onClick={() => { setEyeLocked(false); jumpToPage('home'); }}>返回首页</button>
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
                  <video src={assetPath(selectedWork.src)} controls autoPlay playsInline controlsList="nodownload noplaybackrate" />
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































































