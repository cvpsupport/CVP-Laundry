-- CVP Laundry v1.5: editable announcement for /admin
create table if not exists public.site_announcements (
  id integer primary key check (id = 1),
  title text not null,
  body text not null,
  tone text not null default 'info' check (tone in ('info', 'warning', 'maintenance')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.site_announcements (id, title, body, tone, is_active)
values (
  1,
  'ประกาศจากร้าน',
  'กรุณานำผ้าออกจากเครื่องเมื่อซักหรืออบเสร็จ เพื่อให้ผู้ใช้งานท่านถัดไปสามารถใช้บริการได้ต่อเนื่อง และสามารถติดตามเวลาที่เหลือผ่านหน้า CVP Laundry ได้ตลอดเวลา',
  'info',
  true
)
on conflict (id) do nothing;

alter table public.site_announcements enable row level security;

select id, title, body, tone, is_active, updated_at
from public.site_announcements;
