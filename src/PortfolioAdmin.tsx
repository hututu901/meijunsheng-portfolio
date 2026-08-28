import { useEffect, useRef, useState } from 'react';
import { FileText, Image, Upload, Video, X } from 'lucide-react';
import { isPlaceholderItem, PortfolioItem, PortfolioType, readPortfolio, readPortfolioAsync, sortPortfolioItems, writePortfolio, writePortfolioCloud } from './PortfolioRevision';
import { deleteCloudPortfolio, isSupabaseConfigured, uploadPortfolioFile } from './supabasePortfolio';
import { getAuthSession } from './supabaseAuth';
import { assetPath } from './data';
import './portfolio-admin.css';

const labels: Record<PortfolioType, string> = { text: '提示词工程', image: '图片作品', video: '视频作品' };
const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const mediaPath = (path: string) => /^(data:|blob:|https?:)/i.test(path) ? path : assetPath(path);
const fileTitle = (file: File) => file.name.replace(/\.[^/.]+$/, '').trim();

/** Extract Word paragraphs in-browser so the preview has real readable content. */
async function readDocxText(file: File) {
  if (!file.name.toLowerCase().endsWith('.docx')) return '';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) return '';
  let cursor = view.getUint32(eocd + 16, true);
  const entries = view.getUint16(eocd + 10, true);
  const decoder = new TextDecoder();
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (name !== 'word/document.xml' || view.getUint32(localOffset, true) !== 0x04034b50) continue;
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataStart, dataStart + compressedSize);
    const xml = method === 0
      ? decoder.decode(data)
      : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(paragraph => Array.from(paragraph.getElementsByTagNameNS('*', 't')).map(node => node.textContent || '').join('').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export function PortfolioAdmin({ mode }: { mode: 'upload' | 'manage' }) {
  const [items, setItems] = useState<PortfolioItem[]>(readPortfolio);
  const [type, setType] = useState<PortfolioType>('text');
  const [title, setTitle] = useState('');
  const [textPreview, setTextPreview] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [publishMessage, setPublishMessage] = useState('');
  const [menu, setMenu] = useState<{ item: PortfolioItem; x: number; y: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<PortfolioItem | null>(null);
  const touchDragRef = useRef<{ sourceId: string; targetId: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const save = async (next: PortfolioItem[]) => { const ordered = sortPortfolioItems(next); setItems(ordered); if (isSupabaseConfigured && getAuthSession()) { try { await writePortfolioCloud(ordered); setPublishMessage('云端内容已保存。'); } catch { setPublishMessage('本地已保存，但云端保存失败，请检查 Supabase 配置。'); } } else writePortfolio(ordered); };

  const chooseTextFile = async (file: File | null) => {
    setWorkFile(file);
    if (!file) { setDocumentContent(''); setPublishMessage(''); return; }
    setTitle(fileTitle(file));
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setDocumentContent('');
      setPublishMessage('当前仅支持 .docx 站内正文预览，请将旧版 .doc 另存为 .docx 后重新选择。');
      return;
    }
    try {
      const content = await readDocxText(file);
      setDocumentContent(content);
      setPublishMessage(content ? '已读取 Word 正文。作品描述仍由你手动填写，只显示在标题下方。' : '没有从该文档读取到正文，请确认文件是有效的 .docx。');
    } catch {
      setDocumentContent('');
      setPublishMessage('文稿读取失败，请重新选择有效的 .docx 文件。');
    }
  };

  const replaceDocument = async (item: PortfolioItem, file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) { setPublishMessage('请使用 .docx 文件替换文稿。'); return; }
    try {
      const content = await readDocxText(file);
      if (!content) { setPublishMessage('未读取到提示词正文，请选择含有文字的 .docx 文件。'); return; }
      const now = Date.now();
      const remoteFile = isSupabaseConfigured ? await uploadPortfolioFile(file, 'text') : file.name;
      await save(items.map(current => current.id === item.id ? { ...current, file: remoteFile || file.name, documentContent: content, updatedAt: now } : current));
      setPublishMessage(`已更新「${item.title}」的提示词正文。`);
      setMenu(null);
    } catch { setPublishMessage('文稿读取失败，请重新选择 .docx 文件。'); }
  };

  const publish = async () => {
    if (!title.trim() || !workFile) { setPublishMessage('请填写作品名并选择作品文件后再发布。'); return; }
    if (type === 'text' && !documentContent) { setPublishMessage('请上传可读取的 .docx 文稿后再发布。'); return; }
    if (!window.confirm('确认发布这件作品？')) return;
    try {
      const file = isSupabaseConfigured ? (await uploadPortfolioFile(workFile, type) || undefined) : type === 'text' ? workFile.name : await toDataUrl(workFile);
      const cover = coverFile ? (isSupabaseConfigured ? (await uploadPortfolioFile(coverFile, `${type}/covers`) || undefined) : await toDataUrl(coverFile)) : undefined;
      await save([...items, {
        id: `${type}-${Date.now()}`,
        type,
        title: title.trim(),
        file,
        preview: type === 'video' ? file : undefined,
        cover,
        textPreview: type === 'text' ? textPreview.trim() : undefined,
        documentContent: type === 'text' ? documentContent : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: type === 'text' ? '文稿已收录' : '通过开发者后台上传',
      }]);
      const publishedTitle = title.trim();
      setTitle(''); setTextPreview(''); setDocumentContent(''); setWorkFile(null); setCoverFile(null);
      setPublishMessage(`已发布「${publishedTitle}」，现在可在作品页面和内容管理中查看。`);
    } catch { setPublishMessage('发布未完成：当前浏览器本地存储空间不足，请压缩图片或视频后重试。'); }
  };

  const changeCover = async (item: PortfolioItem, file?: File) => {
    if (!file) return;
    const cover = isSupabaseConfigured ? (await uploadPortfolioFile(file, `${item.type}/covers`) || undefined) : await toDataUrl(file);
    await save(items.map(current => current.id === item.id ? { ...current, cover, updatedAt: Date.now() } : current));
    setMenu(null);
    setPublishMessage(`已更新「${item.title}」的封面。`);
  };
  const remove = async (id: string) => {
    if (!window.confirm('确认删除这件作品？')) return;
    try {
      if (isSupabaseConfigured && getAuthSession()) await deleteCloudPortfolio(id);
      await save(items.filter(item => item.id !== id));
      setPublishMessage('作品已删除，并已从云端移除。');
    } catch { setPublishMessage('删除失败，云端内容未改变，请稍后重试。'); }
    setMenu(null);
  };
  const startDrag = (event: React.DragEvent<HTMLButtonElement>, id: string) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); setDragId(id); };
  const drop = (event: React.DragEvent<HTMLButtonElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    const source = items.find(item => item.id === sourceId);
    const target = items.find(item => item.id === targetId);
    if (!source || !target || source.type !== target.type) return;
    const typed = items.filter(item => item.type === source.type);
    const from = typed.findIndex(item => item.id === sourceId);
    const to = typed.findIndex(item => item.id === targetId);
    typed.splice(from, 1); typed.splice(to, 0, source);
    const manualOrderTime = Date.now();
    const reordered = typed.map((item, index) => ({ ...item, updatedAt: manualOrderTime + typed.length - index }));
    void save([...items.filter(item => item.type !== source.type), ...reordered]);
    setPublishMessage('作品顺序已更新。');
    setDragId(null); setDragTargetId(null);
  };
  const reorderByTouch = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = items.find(item => item.id === sourceId);
    const target = items.find(item => item.id === targetId);
    if (!source || !target || source.type !== target.type) return;
    const typed = items.filter(item => item.type === source.type);
    const from = typed.findIndex(item => item.id === sourceId);
    const to = typed.findIndex(item => item.id === targetId);
    typed.splice(from, 1);
    typed.splice(to, 0, source);
    const manualOrderTime = Date.now();
    const reordered = typed.map((item, index) => ({ ...item, updatedAt: manualOrderTime + typed.length - index }));
    void save([...items.filter(item => item.type !== source.type), ...reordered]);
    setPublishMessage('作品顺序已更新。');
  };
  const touchStart = (event: React.TouchEvent<HTMLButtonElement>, id: string) => {
    touchDragRef.current = { sourceId: id, targetId: id };
    event.currentTarget.classList.add('is-touch-dragging');
  };
  const touchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (!touchDragRef.current) return;
    event.preventDefault();
    const point = event.touches[0];
    const target = document.elementFromPoint(point.clientX, point.clientY)?.closest<HTMLElement>('[data-portfolio-id]');
    if (target?.dataset.portfolioId) { touchDragRef.current.targetId = target.dataset.portfolioId; setDragTargetId(target.dataset.portfolioId); }
  };
  const touchEnd = (event: React.TouchEvent<HTMLButtonElement>) => {
    event.currentTarget.classList.remove('is-touch-dragging');
    const drag = touchDragRef.current;
    touchDragRef.current = null;
    if (drag) reorderByTouch(drag.sourceId, drag.targetId);
    setDragTargetId(null);
  };
  useEffect(() => { const update = async () => setItems(await readPortfolioAsync()); void update(); window.addEventListener('portfolio-change', update); return () => window.removeEventListener('portfolio-change', update); }, []);

  if (mode === 'upload') return <div className="portfolio-admin">
    <h3>内容上传</h3>
    <label>作品类型<select value={type} onChange={event => { setType(event.target.value as PortfolioType); setPublishMessage(''); }}><option value="text">提示词工程</option><option value="image">图片作品</option><option value="video">视频作品</option></select></label>
    <label>作品名<input value={title} onChange={event => setTitle(event.target.value)} placeholder="填写作品名称" /></label>
    {type === 'text' ? <label>提示词简介<small>仅作标题下方的简短介绍，由你手动填写。Word 提示词正文会显示在预览区。</small><textarea value={textPreview} onChange={event => setTextPreview(event.target.value)} placeholder="填写提示词摘要或创作说明" /></label> : null}
    <label>上传作品文件<input type="file" accept={type === 'text' ? '.docx' : type === 'image' ? '.jpg,.jpeg,.png' : 'video/mp4'} onChange={event => { const file = event.target.files?.[0] || null; if (type === 'text') void chooseTextFile(file); else { setWorkFile(file); if (file) setTitle(fileTitle(file)); } }} /></label>
    <label>上传封面 <small>前端封面比例：4 : 3</small><input type="file" accept="image/*" onChange={event => setCoverFile(event.target.files?.[0] || null)} /></label>
    <button className="portfolio-publish" type="button" onClick={() => void publish()}><Upload size={16} /> 确认发布</button>
    {publishMessage ? <p className="portfolio-publish-message" role="status">{publishMessage}</p> : null}
    <p>本地预览阶段保存在当前浏览器；后续服务器版会接入作品仓库与对象存储。</p>
  </div>;

  return <div className="portfolio-admin portfolio-manage">
    <h3>内容管理</h3>
    <p>直接拖动作品卡片调整顺序。右键卡片可查看、修改、替换提示词文稿或删除。</p>
    {(['text', 'image', 'video'] as PortfolioType[]).map(currentType => <section key={currentType}>
      <h4>{labels[currentType]}</h4>
      <div className="portfolio-manage-grid">{items.filter(item => item.type === currentType && !isPlaceholderItem(item)).map((item, index) => <button key={item.id} data-portfolio-id={item.id} className={`${dragId === item.id ? 'is-dragging' : ''}${dragTargetId === item.id ? ' is-drag-target' : ''}`} draggable onDragStart={event => startDrag(event, item.id)} onDragEnd={() => { setDragId(null); setDragTargetId(null); }} onDragEnter={() => setDragTargetId(item.id)} onDragOver={event => { event.preventDefault(); setDragTargetId(item.id); }} onDrop={event => drop(event, item.id)} onTouchStart={event => touchStart(event, item.id)} onTouchMove={touchMove} onTouchEnd={touchEnd} onContextMenu={event => { event.preventDefault(); setMenu({ item, x: event.clientX, y: event.clientY }); }}>
        <span>{String(index + 1).padStart(2, '0')}</span>{item.cover ? <img src={item.cover} alt="" /> : currentType === 'text' ? <FileText size={24} /> : currentType === 'image' ? <Image size={24} /> : <Video size={24} />}<strong>{item.title}</strong>
      </button>)}</div>
    </section>)}
    {publishMessage ? <p className="portfolio-publish-message" role="status">{publishMessage}</p> : null}
    {menu ? <div className="portfolio-context" style={{ left: menu.x, top: menu.y }}>
      <button onClick={() => { setPreviewItem(menu.item); setMenu(null); }}>查看</button>
      {menu.item.type === 'text' ? <><button onClick={() => { const next = window.prompt('编辑提示词简介', menu.item.textPreview || ''); if (next !== null && window.confirm(`确认保存「${menu.item.title}」的提示词简介吗？`)) { save(items.map(item => item.id === menu.item.id ? { ...item, textPreview: next.trim() } : item)); setPublishMessage('提示词简介修改成功。'); } setMenu(null); }}>编辑提示词简介</button><label onClick={event => { if (!window.confirm(`确认替换「${menu.item.title}」的提示词文稿吗？`)) event.preventDefault(); }}>替换提示词文稿<input type="file" accept=".docx" onChange={event => void replaceDocument(menu.item, event.target.files?.[0])} /></label></> : null}
      <button onClick={() => { const next = window.prompt('修改作品名', menu.item.title); if (next && window.confirm(`确认将作品名修改为「${next.trim()}」吗？`)) { save(items.map(item => item.id === menu.item.id ? { ...item, title: next.trim(), updatedAt: Date.now() } : item)); setPublishMessage('作品名称修改成功。'); } setMenu(null); }}>修改作品名</button>
      <label onClick={event => { if (!window.confirm(`确认修改「${menu.item.title}」的封面吗？`)) event.preventDefault(); }}>修改封面<input type="file" accept="image/*" onChange={event => void changeCover(menu.item, event.target.files?.[0])} /></label>
      <button className="danger" onClick={() => remove(menu.item.id)}>删除</button>
    </div> : null}
    {previewItem ? <AdminPreview item={previewItem} close={() => setPreviewItem(null)} /> : null}
  </div>;
}

function AdminPreview({ item, close }: { item: PortfolioItem; close: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <div className="portfolio-admin-preview" role="dialog" aria-modal="true" onWheel={event => event.stopPropagation()}>
    <button className="portfolio-admin-preview-backdrop" type="button" onClick={close} aria-label="关闭预览" />
    <section className="portfolio-admin-preview-panel"><button className="portfolio-admin-preview-close" type="button" onClick={close} aria-label="关闭预览"><X size={18} /></button>
      <span>{labels[item.type]}</span><h4>{item.title}</h4>
      {item.type === 'video' && item.file ? <video src={mediaPath(item.file)} controlsList="nodownload noremoteplayback" controls autoPlay playsInline /> : null}
      {item.type === 'image' && (item.file || item.cover) ? <img src={mediaPath(item.file || item.cover || '')} alt={item.title} /> : null}
      {item.type === 'text' ? <div className="portfolio-admin-file-preview"><FileText size={32} /><strong>提示词正文</strong>{item.textPreview ? <p className="portfolio-admin-description">{item.textPreview}</p> : null}<div className="portfolio-admin-text-reader">{item.documentContent ? item.documentContent.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>) : <p>尚未读取提示词正文。右键此作品后选择“替换提示词文稿”，重新选择 .docx 文件即可。</p>}</div></div> : null}
    </section>
  </div>;
}
