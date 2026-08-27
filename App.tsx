import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
type SnakeDirection = 'up' | 'down' | 'left' | 'right';
type SnakeCell = { x: number; y: number };
import { ArrowUpRight, Copy, X } from 'lucide-react';
import { accessCode, aiPortfolio, assetPath, cloudLink, experience, profile, skillMatrix, works } from './data';
import { PortfolioSection } from './PortfolioRevision';
import { PortfolioAdmin } from './PortfolioAdmin';
import { getAuthSession, isAuthConfigured, signIn, signOut } from './supabaseAuth';

type AdminWork = {
  title: string;
  category: string;
  description: string;
  src?: string;
  cover: string;
};

type AdminExperience = {
  company: string;
  role: string;
  period: string;
  keyword: string;
  summary: string;
};

type AdminSkill = {
  label: string;
  axis: string;
  detail: string;
};

type SiteText = {
  homeWelcome: string;
  homeTitle: string;
  unlockLabel: string;
  aboutMicro: string;
  aboutExperience: string;
  aboutExperienceNote: string;
  skillsMicro: string;
  skillsTitle: string;
  chatHeader: string;
  chatOpening: string;
  chatFollowup: string;
  resumeLabel: string;
  copyUrlLabel: string;
  eyeReliefLabel: string;
  quickInfo: string;
  quickContact: string;
  quickHobby: string;
  contactAnswer: string;
  hobbyAnswer: string;
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
  skills: AdminSkill[];
  siteText: SiteText;
};

const adminPassword = '749852';
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
  skills: skillMatrix.map(({ label, axis, detail }) => ({ label, axis, detail })),
  siteText: {
    homeWelcome: 'Hello, welcome', homeTitle: '我的工作空间', unlockLabel: '开始探索', aboutMicro: 'About me',
    aboutExperience: '3年+', aboutExperienceNote: '新媒体运营与活动策划', skillsMicro: 'Skill System', skillsTitle: '能力矩阵',
    chatHeader: '梅俊生的工作空间', chatOpening: '你好，以上就是我的工作空间，感谢观看！', chatFollowup: '如果你还需要了解其他的，可以直接告诉我。',
    resumeLabel: '查看/下载简历', copyUrlLabel: '复制网址', eyeReliefLabel: '摸鱼小游戏',
    quickInfo: '个人信息', quickContact: '联系方式', quickHobby: '你的爱好', contactAnswer: '电话：15794454784。',
    hobbyAnswer: '我平时喜欢观察内容趋势、拍摄剪辑、研究镜头语言，也会持续拆解优秀账号的表达方式。',
  },
};

const readAdminConfig = (): AdminConfig => {
  try {
    const saved = window.localStorage.getItem(adminStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AdminConfig>;
      return {
        ...defaultAdminConfig,
        ...parsed,
        profile: { ...defaultAdminConfig.profile, ...parsed.profile },
        siteText: { ...defaultAdminConfig.siteText, ...parsed.siteText, eyeReliefLabel: parsed.siteText?.eyeReliefLabel === '缓解眼疲劳' ? '摸鱼小游戏' : (parsed.siteText?.eyeReliefLabel || defaultAdminConfig.siteText.eyeReliefLabel) },
        skills: parsed.skills?.length ? parsed.skills : defaultAdminConfig.skills,
      };
    }
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
  const [actionNotice, setActionNotice] = useState('');
  const navigationLockRef = useRef(false);
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
  const [adminMode, setAdminMode] = useState<'hub' | 'upload' | 'manage' | 'overall'>('hub');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [authSession, setAuthSession] = useState(getAuthSession);
  const [adminNotice, setAdminNotice] = useState('');
  const pageIds = ['home', 'about', 'experience', 'skills', 'text', 'images', 'videos', 'chat'];
  const specialPageIndex: Record<string, number> = { eye: 8 };
  const unlockRef = useRef<HTMLButtonElement | null>(null);
  const featuredPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!adminNotice || !adminUnlocked) return undefined;
    const timer = window.setTimeout(() => setAdminNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [adminNotice, adminUnlocked]);

  useEffect(() => {
    if (!actionNotice) return undefined;
    const timer = window.setTimeout(() => setActionNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);
  const snakeBoardRef = useRef<HTMLDivElement | null>(null);
  const wheelStepRef = useRef(0);
  const lastWheelStepRef = useRef(0);
  const displayProfile = { ...profile, ...siteConfig.profile };
  const displayWorks = works.map((work, index) => ({ ...work, ...(siteConfig.works[index] ?? {}) }));
  const displayExperience = experience.map((item, index) => ({ ...item, ...(siteConfig.experience[index] ?? {}) }));
  const displaySkills = skillMatrix.map((skill, index) => ({ ...skill, ...(siteConfig.skills[index] ?? {}) }));
  const displayText = siteConfig.siteText;
  const featuredWork = activeWorkPreview === null ? null : displayWorks[activeWorkPreview];
  const featuredSrc = featuredWork?.previewSrc ?? featuredWork?.src;

  useEffect(() => {
    if (!adminOpen) return;
    const previous = document.body.style.overflow;
    const previousRoot = document.documentElement.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = previous;
      document.documentElement.style.overflow = previousRoot;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [adminOpen]);

  useEffect(() => {
    if (!unlocked) return;

    let locked = false;
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      const eyeRect = document.getElementById('eye')?.getBoundingClientRect();
      // A hidden eye page has a zero-sized rect at top: it must not block normal desktop navigation.
      const eyeIsInViewport = Boolean(eyeRect && eyeRect.height > 0 && Math.abs(eyeRect.top) < 90);
      if (eyeLocked || pageIndex === 8 || eyeIsInViewport) {
        event.preventDefault();
        return;
      }
      if (target?.closest('.wechat-shell, .ai-scroll-preview, .ai-preview-window')) return;
      if (Math.abs(event.deltaY) < 46 || locked || selectedWork) return;
      event.preventDefault();
      const now = Date.now();
      if (now - lastWheelStepRef.current > 1200) wheelStepRef.current = 0;
      // Treat a touchpad's inertial burst as one gesture. A second deliberate wheel motion is required.
      if (now - lastWheelStepRef.current < 360) return;
      lastWheelStepRef.current = now;
      wheelStepRef.current += 1;
      if (wheelStepRef.current < 2) return;
      wheelStepRef.current = 0;
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
        if (nextIndex >= 0 && !navigationLockRef.current) setPageIndex(nextIndex);
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
    if (pageIndex !== 7) return;

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
    if (pageIndex !== 7) return;
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
      return Boolean(rect && rect.height > 0 && Math.abs(rect.top) < 120);
    };

    const eyeIsLocked = eyeLocked || pageIndex === 8;
    document.documentElement.classList.toggle('is-eye-locked', eyeIsLocked);

    const keepEyePinned = () => {
      if (!eyeIsLocked) return;
      const eye = document.getElementById('eye');
      if (!eye) return;
      const offset = eye.getBoundingClientRect().top;
      if (Math.abs(offset) > 1) {
        window.scrollBy({ top: offset, behavior: 'instant' as ScrollBehavior });
      }
    };

    keepEyePinned();

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
    window.addEventListener('scroll', keepEyePinned, { passive: true });
    return () => {
      document.documentElement.classList.remove('is-eye-locked');
      blockedMouseEvents.forEach((eventName) => document.removeEventListener(eventName, blockEyePointer, true));
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', keepEyePinned);
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
    setAdminMode('hub');
    setAdminPasswordInput('');
    setAdminEmailInput('');
    setAdminNotice('');
  };

  const unlockAdmin = async () => {
    if (isAuthConfigured) {
      try { const session = await signIn(adminEmailInput.trim(), adminPasswordInput); setAuthSession(session); setAdminUnlocked(true); setAdminMode('hub'); setAdminDraft(siteConfig); setAdminNotice('已登录 Supabase 开发者账号'); } catch { setAdminNotice('邮箱或密码不正确'); }
      return;
    }
    if (adminPasswordInput === adminPassword) {
      setAdminUnlocked(true);
      setAdminMode('hub');
      setAdminDraft(siteConfig);
      setAdminNotice('已解锁编辑器');
    } else {
      setAdminNotice('密码不正确');
    }
  };

  const saveAdmin = () => {
    try {
      window.localStorage.setItem(adminStorageKey, JSON.stringify(adminDraft));
      const saved = readAdminConfig();
      setSiteConfig(saved);
      setAdminDraft(saved);
      setAdminNotice('修改已保存，并已在当前页面生效');
    } catch {
      setAdminNotice('保存失败，请检查浏览器存储空间');
    }
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

  const updateSkillDraft = (index: number, field: keyof AdminSkill, value: string) => {
    setAdminDraft((current) => ({
      ...current,
      skills: current.skills.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const updateSiteTextDraft = (field: keyof SiteText, value: string) => {
    setAdminDraft((current) => ({ ...current, siteText: { ...current.siteText, [field]: value } }));
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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const helper = document.createElement('textarea');
        helper.value = window.location.href;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
        helper.remove();
      }
      setUrlCopied(true);
      setActionNotice('网址已复制');
      window.setTimeout(() => setUrlCopied(false), 1600);
    } catch {
      setUrlCopied(false);
      setActionNotice('复制失败，请检查浏览器权限');
    }
  };

  const jumpToPage = (id: string) => {
    const nextIndex = pageIds.indexOf(id);
    const specialIndex = specialPageIndex[id];
    if (specialIndex !== undefined) {
      if (id === 'eye') {
        setActionNotice('正在进入摸鱼小游戏');
        setEyeLocked(true);
      }
      setPageIndex(specialIndex);
      window.setTimeout(() => {
        const target = document.getElementById(id);
        if (target) {
          navigationLockRef.current = true;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, left: 0, behavior: 'instant' as ScrollBehavior });
          window.setTimeout(() => { navigationLockRef.current = false; }, 600);
        }
      }, 80);
      return;
    }
    setEyeLocked(false);
    navigationLockRef.current = true;
    if (nextIndex >= 0) setPageIndex(nextIndex);
    const target = document.getElementById(id);
    if (target) {
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: targetTop, left: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - targetTop) > 8) window.scrollTo({ top: targetTop, left: 0, behavior: 'instant' as ScrollBehavior });
        navigationLockRef.current = false;
      }, 1000);
    } else {
      navigationLockRef.current = false;
    }
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
    info: { question: displayText.quickInfo, answer: `${displayProfile.name}，${displayProfile.headline}。${displayProfile.intro}` },
    contact: { question: displayText.quickContact, answer: displayText.contactAnswer },
    hobby: { question: displayText.quickHobby, answer: displayText.hobbyAnswer },
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
  const activeSkillItem = displaySkills[activeSkill];
  const experienceWaveItems = [displayExperience[2], displayExperience[1], displayExperience[0]];

  return (
    <div className={`site-shell${unlocked ? ' is-unlocked' : ''}`}>
      <main>
        <section id="home" className="page hero-page">
          <div className="hero-copy">
            <span className="folio-index">01 / WORKSPACE</span>
            <p className="micro-copy">{displayText.homeWelcome}</p>
            <h1>{displayText.homeTitle}</h1>
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
                {displayText.unlockLabel}
              </button>
            </div>
          </div>
          <div className="hero-portrait" aria-hidden="true">
            <img src={assetPath('/hero-cutout-v3-mirrored-fade.webp')} alt="" fetchPriority="high" decoding="async" />
          </div>
        </section>

        {unlocked ? (
          <div className="unlocked-pages">
            <nav className="site-section-nav" aria-label="网站导航">
              <button type="button" onClick={() => jumpToPage('about')}>个人信息</button>
              <button type="button" onClick={() => jumpToPage('experience')}>工作轨迹</button>
              <button type="button" onClick={() => jumpToPage('skills')}>个人能力</button>
              <button type="button" onClick={() => jumpToPage('text')}>提示词工程</button>
              <button type="button" onClick={() => jumpToPage('images')}>图片作品</button>
              <button type="button" onClick={() => jumpToPage('videos')}>视频作品</button>
              <button type="button" onClick={() => jumpToPage('chat')}>结语</button>
              <button type="button" onClick={openAdmin}>开发者入口</button>
            </nav>
            <section id="about" className={`page about-page${pageIndex === 1 ? ' is-active-page' : ''}`}>
              <div className="about-portrait" aria-hidden="true">
                <img src={assetPath('/about-portrait-2-waistfade-v2.webp')} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="about-copy">
                <p className="micro-copy">{displayText.aboutMicro}</p>
                <h2>{displayProfile.name}</h2>
                <p className="role-line">{displayProfile.headline}</p>
                <p className="statement">{displayProfile.statement}</p>
                <div className="about-signal-panel" aria-label="个人能力数据概览">
                  <article className="signal-main">
                    <span>Experience</span>
                    <strong>{displayText.aboutExperience}</strong>
                    <p>{displayText.aboutExperienceNote}</p>
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
                  <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="mobile-stair-svg" aria-hidden="true">
                    <path d="M82 248 L600 44 L1118 248 Z" />
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
                <span>{displayText.skillsMicro}</span>
                <h2>{displayText.skillsTitle}</h2>
              </div>
              <div className="matrix-wrap body-skill-wrap">
                <div className="matrix-field body-skill-field" role="group" aria-label="人物能力标签">
                  <img className="skill-silhouette" src={assetPath('/skill-person-3.webp')} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                  {displaySkills.map((skill, index) => (
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

            <PortfolioSection id="text" type="text" />
            <PortfolioSection id="images" type="image" />
            <PortfolioSection id="videos" type="video" />

            <section id="chat" className={`page chat-page${pageIndex === 7 ? ' is-active-page' : ''}${chatIntroPlayed ? ' is-chat-settled' : ''}`}>
              <div className="wechat-shell" aria-label="微信聊天式结束页">
                <header className="wechat-header">
                  <span className="wechat-dot" />
                  <strong>{displayText.chatHeader}</strong>
                  <em>{visibleChatCount >= 3 ? '在线' : '正在输入...'}</em>
                </header>
                <div className="wechat-body" ref={chatBodyRef}>
                  <div className={`chat-row incoming${visibleChatCount >= 1 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>{displayText.chatOpening}</p>
                  </div>
                  <div className={`chat-row incoming${visibleChatCount >= 2 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>{displayText.chatFollowup}</p>
                  </div>
                  <div className={`chat-row incoming action-message${visibleChatCount >= 3 ? ' is-visible' : ''}`}>
                    <img className="chat-avatar photo-avatar" src={assetPath('/headshot.webp')} alt="梅俊生头像" loading="lazy" decoding="async" />
                    <p>
                      如点击
                      <a
                        href={assetPath('/resume/梅俊生简历.pdf')}
                        download
                        onClick={(event) => {
                          event.preventDefault();
                          const confirmed = window.confirm('是否下载简历？');
                          if (!confirmed) {
                            setActionNotice('已取消下载');
                            return;
                          }
                          const link = document.createElement('a');
                          link.href = assetPath('/resume/梅俊生简历.pdf');
                          link.download = '梅俊生简历.pdf';
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          setActionNotice('简历下载已开始');
                          window.setTimeout(() => setActionNotice('如果没有自动下载，请检查浏览器下载权限'), 900);
                        }}
                      >{displayText.resumeLabel}</a>
                      、
                      <button type="button" onClick={copyCurrentUrl}>{urlCopied ? '已复制网址' : displayText.copyUrlLabel}</button>
                      <span className="mobile-eye-entry">
                        以及
                        <button className="eye-game-entry" type="button" onClick={() => jumpToPage('eye')}>{displayText.eyeReliefLabel}</button>
                      </span>
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
                  {actionNotice ? <div className="wechat-action-notice" role="status" aria-live="polite">{actionNotice}</div> : null}
                </div>
                <footer className="wechat-input wechat-input-rich">
                  <div className="quick-send-bar" aria-label="快捷发送">
                    <button type="button" onClick={() => sendQuickReply('info')}>{displayText.quickInfo}</button>
                    <button type="button" onClick={() => sendQuickReply('contact')}>{displayText.quickContact}</button>
                    <button type="button" onClick={() => sendQuickReply('hobby')}>{displayText.quickHobby}</button>
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
              className={`page eye-page${eyeLocked ? ' is-active-page' : ''}`}
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
                  <h2>摸鱼小游戏</h2>
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
              <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="开发者内容管理" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
                <div className="admin-panel">
                  <header className="admin-header admin-header-compact">
                    <button type="button" className="admin-close" onClick={() => setAdminOpen(false)} aria-label="关闭管理后台"><X size={20} /></button>
                  </header>
                  {!adminUnlocked ? (
                    <form className="admin-lock" onSubmit={(event) => { event.preventDefault(); unlockAdmin(); }}>
                      <p>只修改文字与素材，不改变页面结构和动效。</p>
                      {isAuthConfigured ? <label>开发者邮箱<input autoFocus type="email" value={adminEmailInput} onChange={(event) => setAdminEmailInput(event.target.value)} placeholder="输入 Supabase Auth 邮箱" /></label> : null}
                      <label>管理密码<input autoFocus={!isAuthConfigured} type="password" value={adminPasswordInput} onChange={(event) => setAdminPasswordInput(event.target.value)} placeholder="输入密码" /></label>
                      <button type="submit">进入编辑器</button>
                      {adminNotice ? <small>{adminNotice}</small> : null}
                    </form>
                  ) : (
                    <div className="admin-editor">
                      {adminNotice ? <div className="admin-status" role="status" aria-live="polite">{adminNotice}</div> : null}
                      <div className="admin-mode-tabs" role="tablist" aria-label="后台功能">
                        <button type="button" className={adminMode === 'upload' ? 'is-active' : ''} onClick={() => setAdminMode('upload')}>内容上传</button>
                        <button type="button" className={adminMode === 'manage' ? 'is-active' : ''} onClick={() => setAdminMode('manage')}>内容管理</button>
                        <button type="button" className={adminMode === 'overall' ? 'is-active' : ''} onClick={() => setAdminMode('overall')}>整体编辑</button>
                      </div>
                      {adminMode === 'hub' ? <section className="admin-hub"><h3>开发者工作台</h3><p>从上方选择一个功能开始。</p>{authSession ? <button type="button" onClick={() => { signOut(); setAuthSession(null); setAdminUnlocked(false); setAdminNotice('已退出 Supabase 开发者账号'); }}>退出登录</button> : null}</section> : null}
                      {adminMode === 'upload' ? <PortfolioAdmin mode="upload" /> : null}
                      {adminMode === 'manage' ? <PortfolioAdmin mode="manage" /> : null}
                      {adminMode === 'overall' ? <>
                      <section className="admin-section"><h3>个人信息</h3><div className="admin-fields">
                        <label>姓名<input value={adminDraft.profile.name} onChange={(event) => updateProfileDraft('name', event.target.value)} /></label>
                        <label>职业标题<input value={adminDraft.profile.headline} onChange={(event) => updateProfileDraft('headline', event.target.value)} /></label>
                        <label className="admin-wide">个人介绍<textarea value={adminDraft.profile.statement} onChange={(event) => updateProfileDraft('statement', event.target.value)} /></label>
                      </div></section>
                      <section className="admin-section"><h3>工作经历</h3>{adminDraft.experience.map((item, index) => <fieldset className="admin-record" key={`${item.company}-${index}`}><legend>经历 {index + 1}</legend><div className="admin-fields"><label>公司<input value={item.company} onChange={(event) => updateExperienceDraft(index, 'company', event.target.value)} /></label><label>岗位<input value={item.role} onChange={(event) => updateExperienceDraft(index, 'role', event.target.value)} /></label><label>时间<input value={item.period} onChange={(event) => updateExperienceDraft(index, 'period', event.target.value)} /></label><label>关键词<input value={item.keyword} onChange={(event) => updateExperienceDraft(index, 'keyword', event.target.value)} /></label><label className="admin-wide">工作内容<textarea value={item.summary} onChange={(event) => updateExperienceDraft(index, 'summary', event.target.value)} /></label></div></fieldset>)}</section>
                      <section className="admin-section"><h3>个人能力</h3>{adminDraft.skills.map((skill, index) => <fieldset className="admin-record" key={`${skill.label}-${index}`}><legend>能力 {String(index + 1).padStart(2, '0')}</legend><div className="admin-fields"><label>标签<input value={skill.label} onChange={(event) => updateSkillDraft(index, 'label', event.target.value)} /></label><label>部位/维度<input value={skill.axis} onChange={(event) => updateSkillDraft(index, 'axis', event.target.value)} /></label><label className="admin-wide">能力描述<textarea value={skill.detail} onChange={(event) => updateSkillDraft(index, 'detail', event.target.value)} /></label></div></fieldset>)}</section>
                      <section className="admin-section"><h3>首页与结语</h3><div className="admin-fields">
                        <label>首页欢迎语<input value={adminDraft.siteText.homeWelcome} onChange={(event) => updateSiteTextDraft('homeWelcome', event.target.value)} /></label><label>首页标题<input value={adminDraft.siteText.homeTitle} onChange={(event) => updateSiteTextDraft('homeTitle', event.target.value)} /></label><label>解锁按钮文字<input value={adminDraft.siteText.unlockLabel} onChange={(event) => updateSiteTextDraft('unlockLabel', event.target.value)} /></label><label>个人页英文标题<input value={adminDraft.siteText.aboutMicro} onChange={(event) => updateSiteTextDraft('aboutMicro', event.target.value)} /></label><label>经验数字<input value={adminDraft.siteText.aboutExperience} onChange={(event) => updateSiteTextDraft('aboutExperience', event.target.value)} /></label><label>经验说明<input value={adminDraft.siteText.aboutExperienceNote} onChange={(event) => updateSiteTextDraft('aboutExperienceNote', event.target.value)} /></label><label>能力页英文标题<input value={adminDraft.siteText.skillsMicro} onChange={(event) => updateSiteTextDraft('skillsMicro', event.target.value)} /></label><label>能力页标题<input value={adminDraft.siteText.skillsTitle} onChange={(event) => updateSiteTextDraft('skillsTitle', event.target.value)} /></label><label>结语页标题<input value={adminDraft.siteText.chatHeader} onChange={(event) => updateSiteTextDraft('chatHeader', event.target.value)} /></label><label>简历链接文字<input value={adminDraft.siteText.resumeLabel} onChange={(event) => updateSiteTextDraft('resumeLabel', event.target.value)} /></label><label>复制网址文字<input value={adminDraft.siteText.copyUrlLabel} onChange={(event) => updateSiteTextDraft('copyUrlLabel', event.target.value)} /></label><label>眼疲劳入口文字<input value={adminDraft.siteText.eyeReliefLabel} onChange={(event) => updateSiteTextDraft('eyeReliefLabel', event.target.value)} /></label><label>快捷按钮：个人信息<input value={adminDraft.siteText.quickInfo} onChange={(event) => updateSiteTextDraft('quickInfo', event.target.value)} /></label><label>快捷按钮：联系方式<input value={adminDraft.siteText.quickContact} onChange={(event) => updateSiteTextDraft('quickContact', event.target.value)} /></label><label>快捷按钮：你的爱好<input value={adminDraft.siteText.quickHobby} onChange={(event) => updateSiteTextDraft('quickHobby', event.target.value)} /></label><label>联系方式回复<input value={adminDraft.siteText.contactAnswer} onChange={(event) => updateSiteTextDraft('contactAnswer', event.target.value)} /></label><label className="admin-wide">结语消息 1<textarea value={adminDraft.siteText.chatOpening} onChange={(event) => updateSiteTextDraft('chatOpening', event.target.value)} /></label><label className="admin-wide">结语消息 2<textarea value={adminDraft.siteText.chatFollowup} onChange={(event) => updateSiteTextDraft('chatFollowup', event.target.value)} /></label><label className="admin-wide">爱好回复<textarea value={adminDraft.siteText.hobbyAnswer} onChange={(event) => updateSiteTextDraft('hobbyAnswer', event.target.value)} /></label>
                      </div></section>
                      <section className="admin-section"><h3>整体编辑范围</h3><p className="admin-scope-note">此处用于修改首页、个人信息与工作轨迹的文字内容。作品集的文字、图片、视频、眼疲劳游戏说明和开发者后台提示，均不在整体编辑范围内。</p></section>
                      <div className="admin-actions"><button type="button" onClick={saveAdmin}>保存修改</button><button type="button" onClick={exportAdmin}>导出配置</button><button type="button" className="admin-muted-button" onClick={resetAdmin}>恢复默认</button></div>
                      </> : null}
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
                  {selectedWork.src ? <video src={mediaPath(selectedWork.src)} controls autoPlay playsInline controlsList="nodownload noplaybackrate" /> : <div className="modal-empty-media">视频素材待上传</div>}
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
