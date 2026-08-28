import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, Image, Play, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { assetPath } from './data';
import './portfolio-revision.css';
import { fetchCloudPortfolio, isSupabaseConfigured, upsertCloudPortfolio } from './supabasePortfolio';

export type PortfolioType = 'text' | 'image' | 'video';
export type PortfolioItem = { id: string; type: PortfolioType; title: string; file?: string; cover?: string; preview?: string; description?: string; textPreview?: string; documentContent?: string; createdAt?: number; updatedAt?: number };

const labels: Record<PortfolioType, string> = { text: '提示词工程', image: '图片作品', video: '视频作品' };
const storageKey = 'meijunsheng-revision-portfolio-v2';
const video = (name: string) => `/videos/${encodeURIComponent(name)}`;
const videoPreview = (name: string) => `/videos/preview/${encodeURIComponent(name)}`;
const mediaPath = (path: string) => /^(data:|blob:|https?:)/i.test(path) ? path : assetPath(path);

export const defaultPortfolio: PortfolioItem[] = [
  ...Array.from({ length: 6 }, (_, index) => ({ id: `text-${index + 1}`, type: 'text' as const, title: `提示词工程 ${String(index + 1).padStart(2, '0')}`, description: '提示词封面等待上传' })),
  ...Array.from({ length: 6 }, (_, index) => ({ id: `image-${index + 1}`, type: 'image' as const, title: `图片作品 ${String(index + 1).padStart(2, '0')}`, description: '图片封面等待上传' })),
  { id: 'video-1', type: 'video', title: '视频作品 01' },
  { id: 'video-2', type: 'video', title: '视频作品 02' },
  { id: 'video-3', type: 'video', title: '视频作品 03' },
  { id: 'video-4', type: 'video', title: '视频作品 04' },
  { id: 'video-5', type: 'video', title: '视频作品 05' },
  { id: 'video-6', type: 'video', title: '视频作品 06' },
];

const isDefaultItem = (item: PortfolioItem) => /^(text|image|video)-\d+$/.test(item.id);
export const isPlaceholderItem = (item: PortfolioItem) => isDefaultItem(item) && !item.file && !item.cover && !item.documentContent;
const portfolioDbName = 'meijunsheng-portfolio-db';
const portfolioDbStore = 'portfolio';
const portfolioDbKey = 'items';
let portfolioCache: PortfolioItem[] | null = null;
export const sortPortfolioItems = (items: PortfolioItem[]) => items
  .map((item, index) => ({ item, index }))
  .sort((a, b) => (b.item.updatedAt || b.item.createdAt || 0) - (a.item.updatedAt || a.item.createdAt || 0) || a.index - b.index)
  .map(entry => entry.item);

const normalizePortfolio = (items: PortfolioItem[]) => sortPortfolioItems(items.map((item, index) => {
  const migratedTitle = item.type === 'text' && /^文字作品 \d+$/.test(item.title) ? item.title.replace('文字作品', '提示词工程') : item.title;
  const legacyTime = isDefaultItem(item) ? 0 : 1000 + index;
  return { ...item, title: migratedTitle, createdAt: item.createdAt ?? legacyTime, updatedAt: item.updatedAt ?? legacyTime };
})).filter(item => !isPlaceholderItem(item) || Number(item.id.split('-')[1]) <= 6);

const blankItems = (type: PortfolioType, count: number, start: number) => Array.from({ length: count }, (_, index) => ({ id: `blank-${type}-${start + index + 1}`, type, title: '', description: '作品尚未上传' }));
export const displayPortfolioItems = (items: PortfolioItem[], type: PortfolioType) => {
  const actual = items.filter(item => item.type === type && !isPlaceholderItem(item));
  return actual.length >= 6 ? actual : [...actual, ...blankItems(type, 6 - actual.length, actual.length)];
};
export const displayAllPortfolioItems = (items: PortfolioItem[]) => {
  const actual = items.filter(item => !isPlaceholderItem(item));
  return actual.length >= 6 ? actual : [...actual, ...blankItems('text', 6 - actual.length, actual.length)];
};

const openPortfolioDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(portfolioDbName, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(portfolioDbStore);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const readIndexedPortfolio = async (): Promise<PortfolioItem[] | null> => {
  try {
    const db = await openPortfolioDb();
    const value = await new Promise<PortfolioItem[] | undefined>((resolve, reject) => {
      const request = db.transaction(portfolioDbStore, 'readonly').objectStore(portfolioDbStore).get(portfolioDbKey);
      request.onsuccess = () => resolve(request.result as PortfolioItem[] | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value?.length ? normalizePortfolio(value) : null;
  } catch { return null; }
};

const persistIndexedPortfolio = async (items: PortfolioItem[]) => {
  try {
    const db = await openPortfolioDb();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(portfolioDbStore, 'readwrite').objectStore(portfolioDbStore).put(items, portfolioDbKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { /* The UI keeps the current session state if browser storage is unavailable. */ }
};

export const readPortfolio = (): PortfolioItem[] => {
  if (portfolioCache) return portfolioCache;
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as PortfolioItem[] | null;
    return normalizePortfolio(stored || defaultPortfolio);
  } catch { return defaultPortfolio; }
};
export const readPortfolioAsync = async (): Promise<PortfolioItem[]> => {
  if (isSupabaseConfigured) {
    try {
      const cloudItems = await fetchCloudPortfolio();
      if (cloudItems?.length) { portfolioCache = normalizePortfolio(cloudItems); return portfolioCache; }
    } catch { /* Keep the local fallback available when cloud setup is incomplete. */ }
  }
  const indexed = await readIndexedPortfolio();
  portfolioCache = indexed || readPortfolio();
  return portfolioCache;
};
export const writePortfolio = (items: PortfolioItem[]) => {
  const ordered = sortPortfolioItems(items);
  portfolioCache = ordered;
  void persistIndexedPortfolio(ordered);
  try { window.localStorage.setItem(storageKey, JSON.stringify(ordered)); } catch { /* IndexedDB is the primary media store. */ }
  window.dispatchEvent(new Event('portfolio-change'));
};
export const writePortfolioCloud = async (items: PortfolioItem[]) => {
  const ordered = sortPortfolioItems(items);
  writePortfolio(ordered);
  await upsertCloudPortfolio(ordered);
};

function Tile({ item, index, onOpen }: { item: PortfolioItem; index: number; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  return <article className={`revision-tile revision-${item.type} revision-tile-index-${index + 1}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
    <span className="revision-index">{String(index + 1).padStart(2, '0')}</span>
    <div className="revision-tile-face">
      {item.cover ? <img src={item.cover} alt="" /> : <>
        <span className="revision-cover-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="revision-cover-title">{item.title}</span>
        {item.type === 'video' && item.preview ? <video src={assetPath(item.preview)} muted loop playsInline preload="metadata" ref={node => { if (node && hovered) void node.play(); if (node && !hovered) { node.pause(); node.currentTime = 0; } }} /> : item.type === 'text' ? <FileText className="revision-cover-icon" size={30} strokeWidth={1.2} /> : <Image className="revision-cover-icon" size={30} strokeWidth={1.2} />}
      </>}
    </div>
    <div className="revision-card-info"><span>{labels[item.type]}</span><strong>{item.title}</strong></div>
    <div className="revision-tile-hover"><span>{String(index + 1).padStart(2, '0')} / {labels[item.type]}</span><strong>{item.title}</strong><button type="button" onClick={onOpen}>点击预览 <ArrowUpRight size={15} /></button></div>
  </article>;
}

function ShowcaseCard({ item, index, offset, onOpen, onShift }: { item: PortfolioItem; index: number; offset: number; onOpen: () => void; onShift: (amount: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const visible = Math.abs(offset) <= 1;
  return <article className={`showcase-card showcase-card-${offset === 0 ? 'active' : offset < 0 ? 'prev' : 'next'}${visible ? '' : ' is-hidden'}`} style={{ '--showcase-offset': offset } as React.CSSProperties} aria-hidden={!visible} onMouseEnter={() => { setHovered(true); if (offset === -1 || offset === 1) onShift(offset); }} onMouseLeave={() => setHovered(false)}>
    <div className="showcase-card-visual">
      {item.cover ? <img src={item.cover} alt="" /> : item.type === 'video' && item.preview ? <video src={assetPath(item.preview)} muted loop playsInline preload="metadata" ref={node => { if (node && hovered && offset === 0) void node.play(); if (node && (!hovered || offset !== 0)) { node.pause(); node.currentTime = 0; } }} /> : <div className={`showcase-placeholder showcase-placeholder-${item.type}`}><span>{String(index + 1).padStart(2, '0')}</span>{item.type === 'text' ? <FileText size={34} strokeWidth={1.15} /> : item.type === 'image' ? <Image size={34} strokeWidth={1.15} /> : <Play size={34} strokeWidth={1.15} />}</div>}
      <span className="showcase-card-number">{String(index + 1).padStart(2, '0')}</span>
      {item.title ? <button className="showcase-card-action" type="button" onClick={onOpen} tabIndex={offset === 0 ? 0 : -1}>点击预览 <ArrowUpRight size={16} /></button> : null}
    </div>
    <div className="showcase-card-copy"><h3>{item.title}</h3></div>
  </article>;
}

function ShowcaseCarousel({ items, onOpen }: { items: PortfolioItem[]; onOpen: (item: PortfolioItem) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lastShift = useRef(0);
  const count = Math.min(items.length, 6);
  const featured = items.slice(0, count);
  const shift = (amount: number) => setActiveIndex(current => (current + amount + count) % count);
  const hoverShift = (amount: number) => { const now = Date.now(); if (now - lastShift.current < 820) return; lastShift.current = now; shift(amount); };
  if (!featured.length) return null;
  return <div className="showcase-carousel" aria-label={`${labels[featured[0].type]}展示`}>
    <button className="showcase-carousel-arrow showcase-carousel-prev" type="button" onClick={() => shift(-1)} aria-label="上一个作品"><ArrowLeft size={18} /></button>
    <div className="showcase-carousel-stage">{featured.map((item, index) => { let offset = index - activeIndex; if (offset > count / 2) offset -= count; if (offset < -count / 2) offset += count; return <ShowcaseCard key={item.id} item={item} index={index} offset={offset} onOpen={() => onOpen(item)} onShift={hoverShift} />; })}</div>
    <button className="showcase-carousel-arrow showcase-carousel-next" type="button" onClick={() => shift(1)} aria-label="下一个作品"><ArrowRight size={18} /></button>
    <div className="showcase-carousel-dots" role="tablist" aria-label="作品页码">{featured.map((item, index) => <button key={item.id} className={index === activeIndex ? 'is-active' : ''} type="button" onClick={() => setActiveIndex(index)} aria-label={`第 ${index + 1} 个作品`} aria-selected={index === activeIndex} role="tab" />)}</div>
  </div>;
}

function TextPreview({ item }: { item: PortfolioItem }) {
  const content = item.documentContent?.trim();
  useEffect(() => {
    const allowReaderScroll = (event: WheelEvent) => { if ((event.target as HTMLElement)?.closest('.revision-text-reader')) event.stopPropagation(); };
    document.addEventListener('wheel', allowReaderScroll, true);
    return () => document.removeEventListener('wheel', allowReaderScroll, true);
  }, []);
  return <div className="revision-text-reader"><header><FileText size={24} /><span>提示词正文</span></header>{content ? <div className="revision-text-body">{content.split(/\n{2,}/).map((paragraph, index) => <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>)}</div> : <div className="revision-text-empty"><FileText size={46} strokeWidth={1.2} /><strong>未读取提示词正文</strong><p>请在内容管理中右键该作品，选择“替换提示词文稿”，重新选择 .docx 文件后即可直接预览正文。</p></div>}</div>;
}

function ImagePreview({ src, title, onReady }: { src: string; title: string; onReady: () => void }) {
  const [zoom, setZoom] = useState(1);
  return <div className="revision-image-preview">
    <div className="revision-image-tools" aria-label="图片缩放">
      <button type="button" onClick={() => setZoom(value => Math.min(3, value + .25))} aria-label="放大"><ZoomIn size={18} /></button>
      <button type="button" onClick={() => setZoom(value => Math.max(.5, value - .25))} aria-label="缩小"><ZoomOut size={18} /></button>
      <button type="button" onClick={() => setZoom(1)} aria-label="还原"><RotateCcw size={17} /></button>
      <span>{Math.round(zoom * 100)}%</span>
    </div>
    <div className="revision-image-canvas" onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}>
      <img src={src} alt={title} style={{ transform: `scale(${zoom})` }} onLoad={onReady} onError={onReady} />
    </div>
  </div>;
}

function Modal({ item, items, close }: { item: PortfolioItem; items: PortfolioItem[]; close: () => void }) {
  const [current, setCurrent] = useState(item);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const index = items.findIndex(work => work.id === current.id);
  useEffect(() => { setCurrent(item); setZoom(1); }, [item]);
  useEffect(() => { setLoading(true); if (current.type === 'text' || (!current.file && !current.cover)) { const timer = window.setTimeout(() => setLoading(false), 560); return () => window.clearTimeout(timer); } return undefined; }, [current]);
  useEffect(() => { const previous = document.body.style.overflow; const scrollY = window.scrollY; document.body.style.overflow = 'hidden'; document.body.style.position = 'fixed'; document.body.style.top = `-${scrollY}px`; document.body.style.width = '100%'; return () => { document.body.style.overflow = previous; document.body.style.position = ''; document.body.style.top = ''; document.body.style.width = ''; window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }); }; }, []);
  const switchItem = (direction: number) => setCurrent(items[(index + direction + items.length) % items.length]);
  return <div className="revision-modal" role="dialog" aria-modal="true" onWheel={event => event.preventDefault()} onTouchMove={event => event.preventDefault()}><button className="revision-backdrop" onClick={close} aria-label="关闭" /><section className="revision-modal-panel"><button className="revision-close" onClick={close} aria-label="关闭"><X size={20} /></button><button className="revision-arrow revision-arrow-left" onClick={() => switchItem(-1)} aria-label="上一个"><ArrowLeft size={20} /></button><button className="revision-arrow revision-arrow-right" onClick={() => switchItem(1)} aria-label="下一个"><ArrowRight size={20} /></button><h3>{current.title}</h3>{current.type === 'text' && current.textPreview ? <p className="revision-work-description">{current.textPreview}</p> : null}<div className={`revision-modal-media revision-modal-${current.type}${loading ? ' is-loading' : ''}`} onWheel={event => event.preventDefault()}>{loading ? <div className="revision-preview-loading"><i /><span>加载作品</span></div> : null}{current.type === 'image' && (current.file || current.cover) ? <ImagePreview src={assetPath(current.file || current.cover || '')} title={current.title} onReady={() => setLoading(false)} /> : current.type === 'video' && current.file ? <video src={assetPath(current.file)} controls controlsList="nodownload noremoteplayback" autoPlay playsInline onCanPlay={() => setLoading(false)} /> : current.type === 'text' ? <TextPreview item={current} /> : <FileText size={54} />}</div></section></div>;
}

function ModalLegacy({ item, items, close }: { item: PortfolioItem; items: PortfolioItem[]; close: () => void }) {
  const index = items.findIndex(current => current.id === item.id);
  const switchItem = (direction: number) => items[(index + direction + items.length) % items.length];
  const [current, setCurrent] = useState(item);
  const [loading, setLoading] = useState(true);
  useEffect(() => setCurrent(item), [item]);
  useEffect(() => {
    setLoading(true);
    if (current.type === 'text' || (!current.file && !current.cover)) {
      const timer = window.setTimeout(() => setLoading(false), 560);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [current]);
  useEffect(() => {
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
  }, []);
  return <div className="revision-modal" role="dialog" aria-modal="true" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}><button className="revision-backdrop" onClick={close} aria-label="关闭" /><section className="revision-modal-panel"><button className="revision-close" onClick={close} aria-label="关闭"><X size={20} /></button><button className="revision-arrow revision-arrow-left" onClick={() => setCurrent(switchItem(-1))} aria-label="上一个"><ArrowLeft size={20} /></button><button className="revision-arrow revision-arrow-right" onClick={() => setCurrent(switchItem(1))} aria-label="下一个"><ArrowRight size={20} /></button><span>{labels[current.type]} / {String(items.findIndex(work => work.id === current.id) + 1).padStart(2, '0')}</span><h3>{current.title}</h3>{current.type === 'text' && current.textPreview ? <p className="revision-work-description">{current.textPreview}</p> : null}<div className={`revision-modal-media revision-modal-${current.type}${loading ? ' is-loading' : ''}`} aria-busy={loading}>{loading ? <div className="revision-preview-loading"><i /><span>加载作品</span></div> : null}{current.type === 'video' && current.file ? <video src={assetPath(current.file)} controlsList="nodownload noremoteplayback" controls autoPlay playsInline onCanPlay={() => setLoading(false)} /> : current.type === 'image' && (current.file || current.cover) ? <img src={assetPath(current.file || current.cover || '')} alt={current.title} onLoad={() => setLoading(false)} onError={() => setLoading(false)} /> : current.type === 'text' ? <TextPreview item={current} /> : <><FileText size={54} strokeWidth={1.2} /><p>{current.description || '作品文件和封面将在上传后显示。'}</p></>}</div></section></div>;
}

function PortfolioSectionLegacy({ type, id }: { type: PortfolioType; id: string }) {
  const [items, setItems] = useState(readPortfolio);
  const [active, setActive] = useState<PortfolioItem | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  useEffect(() => { const update = async () => setItems(await readPortfolioAsync()); void update(); window.addEventListener('portfolio-change', update); return () => window.removeEventListener('portfolio-change', update); }, []);
  const typed = items.filter(item => item.type === type && !isPlaceholderItem(item));
  const featuredCount: Record<PortfolioType, number> = { text: 4, image: 4, video: 3 };
  const featured = typed.slice(0, featuredCount[type]);
  return <section id={id} className={`page revision-portfolio-page revision-page-${type}`}><header className="revision-portfolio-head"><div><span>{labels[type]}</span><h2>{labels[type]}</h2></div><button type="button" onClick={() => setArchiveOpen(true)}>更多作品 <ArrowUpRight size={17} /></button></header><div className="revision-grid">{featured.map((item, index) => <Tile item={item} index={index} key={item.id} onOpen={() => setActive(item)} />)}</div>{active ? <Modal item={active} items={typed} close={() => setActive(null)} /> : null}{archiveOpen ? <PortfolioArchive initial={type} close={() => setArchiveOpen(false)} onOpen={item => { setArchiveOpen(false); setActive(item); }} /> : null}</section>;
}

export function PortfolioSection({ type, id }: { type: PortfolioType; id: string }) {
  const [items, setItems] = useState(readPortfolio);
  const [active, setActive] = useState<PortfolioItem | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  useEffect(() => { const update = async () => setItems(await readPortfolioAsync()); void update(); window.addEventListener('portfolio-change', update); return () => window.removeEventListener('portfolio-change', update); }, []);
  const typed = items.filter(item => item.type === type && !isPlaceholderItem(item));
  return <section id={id} className={`page revision-portfolio-page revision-page-${type}`}><header className="revision-portfolio-head"><div><h2>{labels[type]}</h2></div><button type="button" onClick={() => setArchiveOpen(true)}>更多作品 <ArrowUpRight size={17} /></button></header><ShowcaseCarousel items={displayPortfolioItems(items, type).slice(0, 6)} onOpen={item => { if (item.title) setActive(item); }} />{active ? <Modal item={active} items={typed} close={() => setActive(null)} /> : null}{archiveOpen ? <PortfolioArchive initial={type} close={() => setArchiveOpen(false)} onOpen={item => { setArchiveOpen(false); setActive(item); }} /> : null}</section>;
}

export function PortfolioArchive({ initial = 'text', close, onOpen }: { initial?: PortfolioType; close: () => void; onOpen: (item: PortfolioItem) => void }) {
  const [items, setItems] = useState(readPortfolio);
  const [type, setType] = useState<PortfolioType | 'all'>(initial);
  useEffect(() => { const update = async () => setItems(await readPortfolioAsync()); void update(); window.addEventListener('portfolio-change', update); return () => window.removeEventListener('portfolio-change', update); }, []);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, []);
  const filtered = type === 'all' ? displayAllPortfolioItems(items) : displayPortfolioItems(items, type);
  return <div className="revision-archive" role="dialog" aria-modal="true"><button className="revision-backdrop" onClick={close} aria-label="关闭作品仓库" /><section className="revision-archive-panel"><button className="revision-close" onClick={close} aria-label="关闭"><X size={20} /></button><h2>作品仓库</h2><nav>{(['all', 'text', 'image', 'video'] as const).map(tab => <button key={tab} className={tab === type ? 'is-active' : ''} onClick={() => setType(tab)}>{tab === 'all' ? '全部作品' : labels[tab]}</button>)}</nav><div className="archive-showcase-grid">{filtered.map((item, index) => <ArchiveCard item={item} index={index} key={item.id} onOpen={() => onOpen(item)} />)}</div></section></div>;
}

function ArchiveCard({ item, index, onOpen }: { item: PortfolioItem; index: number; onOpen: () => void }) {
  return <article className={`archive-card${item.title ? '' : ' archive-card-empty'}`}>
    <div className="archive-card-visual">{item.cover ? <img src={item.cover} alt="" /> : <div className={`showcase-placeholder showcase-placeholder-${item.type}`}><span>{String(index + 1).padStart(2, '0')}</span>{item.type === 'text' ? <FileText size={30} strokeWidth={1.15} /> : item.type === 'image' ? <Image size={30} strokeWidth={1.15} /> : <Play size={30} strokeWidth={1.15} />}</div>}<span className="showcase-card-number">{String(index + 1).padStart(2, '0')}</span>{item.title ? <button type="button" onClick={onOpen}>点击预览 <ArrowUpRight size={15} /></button> : null}</div>
    <div className="archive-card-copy"><h3>{item.title || '空白作品位'}</h3></div>
  </article>;
}

function PortfolioArchiveLegacy({ initial = 'text', close, onOpen }: { initial?: PortfolioType; close: () => void; onOpen: (item: PortfolioItem) => void }) {
  const [items, setItems] = useState(readPortfolio);
  const [type, setType] = useState<PortfolioType | 'all'>(initial);
  useEffect(() => { const update = async () => setItems(await readPortfolioAsync()); void update(); window.addEventListener('portfolio-change', update); return () => window.removeEventListener('portfolio-change', update); }, []);
  useEffect(() => {
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
  }, []);
  const filtered = type === 'all' ? items : items.filter(item => item.type === type);
  return <div className="revision-archive" role="dialog" aria-modal="true" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}><button className="revision-backdrop" onClick={close} aria-label="关闭作品仓库" /><section className="revision-archive-panel"><button className="revision-close" onClick={close} aria-label="关闭"><X size={20} /></button><h2>作品仓库</h2><nav>{(['all', 'text', 'image', 'video'] as const).map(tab => <button key={tab} className={tab === type ? 'is-active' : ''} onClick={() => setType(tab)}>{tab === 'all' ? '全部作品' : labels[tab]}</button>)}</nav><div className="revision-archive-grid">{filtered.map((item, index) => <Tile item={item} index={index} key={item.id} onOpen={() => onOpen(item)} />)}</div></section></div>;
}
