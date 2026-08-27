create table if not exists public.portfolio_items (
  id text primary key,
  type text not null check (type in ('text', 'image', 'video')),
  title text not null,
  file_url text,
  cover_url text,
  preview_url text,
  description text,
  text_preview text,
  document_content text,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.portfolio_items enable row level security;
create policy "portfolio public read" on public.portfolio_items for select using (true);
create policy "portfolio authenticated write" on public.portfolio_items for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('portfolio-media', 'portfolio-media', true) on conflict (id) do update set public = true;
create policy "portfolio media public read" on storage.objects for select using (bucket_id = 'portfolio-media');
create policy "portfolio media authenticated write" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio-media');
create policy "portfolio media authenticated update" on storage.objects for update to authenticated using (bucket_id = 'portfolio-media');
