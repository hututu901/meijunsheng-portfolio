import type { PortfolioItem } from './PortfolioRevision';
import { authAccessToken, getAuthSession } from './supabaseAuth';

const endpoint = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'portfolio-media';

export const isSupabaseConfigured = Boolean(endpoint && anonKey);
const headers = () => ({ apikey: anonKey, Authorization: `Bearer ${authAccessToken()}` });
const urlFor = (path: string) => `${endpoint}/storage/v1/object/public/${bucket}/${path}`;

const toItem = (row: Record<string, unknown>): PortfolioItem => ({
  id: String(row.id), type: row.type as PortfolioItem['type'], title: String(row.title || ''),
  file: row.file_url ? String(row.file_url) : undefined,
  cover: row.cover_url ? String(row.cover_url) : undefined,
  preview: row.preview_url ? String(row.preview_url) : undefined,
  description: row.description ? String(row.description) : undefined,
  textPreview: row.text_preview ? String(row.text_preview) : undefined,
  documentContent: row.document_content ? String(row.document_content) : undefined,
  createdAt: Number(row.created_at || 0), updatedAt: Number(row.updated_at || 0),
});

const rowFor = (item: PortfolioItem) => ({
  id: item.id, type: item.type, title: item.title, file_url: item.file || null,
  cover_url: item.cover || null, preview_url: item.preview || null, description: item.description || null,
  text_preview: item.textPreview || null, document_content: item.documentContent || null,
  created_at: item.createdAt || Date.now(), updated_at: item.updatedAt || Date.now(),
});

export async function fetchCloudPortfolio() {
  if (!isSupabaseConfigured) return null;
  const response = await fetch(`${endpoint}/rest/v1/portfolio_items?select=*&order=updated_at.desc`, { headers: headers() });
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status}`);
  const rows = await response.json() as Record<string, unknown>[];
  return rows.map(toItem);
}

export async function uploadPortfolioFile(file: File, prefix: string) {
  if (!isSupabaseConfigured || !getAuthSession()) throw new Error('请先登录开发者账号');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const response = await fetch(`${endpoint}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST', headers: { ...headers(), 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file,
  });
  if (!response.ok) throw new Error(`Supabase upload failed: ${response.status}`);
  return urlFor(path);
}

export async function upsertCloudPortfolio(items: PortfolioItem[]) {
  if (!isSupabaseConfigured || !getAuthSession()) throw new Error('请先登录开发者账号');
  const response = await fetch(`${endpoint}/rest/v1/portfolio_items`, {
    method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(items.map(rowFor)),
  });
  if (!response.ok) throw new Error(`Supabase write failed: ${response.status}`);
}

export async function deleteCloudPortfolio(id: string) {
  if (!isSupabaseConfigured || !getAuthSession()) throw new Error('请先登录开发者账号');
  const response = await fetch(`${endpoint}/rest/v1/portfolio_items?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
  if (!response.ok) throw new Error(`Supabase delete failed: ${response.status}`);
}
