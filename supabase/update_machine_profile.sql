-- Run this once in Supabase SQL Editor if your project was created with v1.1.
alter table public.machines add column if not exists machine_type text not null default 'washer';
alter table public.machines add column if not exists price_baht integer;

update public.machines
set
  name = case machine_no
    when 1 then 'เครื่อง 01'
    when 2 then 'เครื่อง 02'
    when 3 then 'เครื่อง 03'
    when 4 then 'เครื่อง 04'
    else name
  end,
  machine_type = case when machine_no = 4 then 'dryer' else 'washer' end,
  price_baht = case machine_no
    when 1 then 50
    when 2 then 40
    when 3 then 30
    when 4 then null
    else price_baht
  end,
  updated_at = now()
where machine_no between 1 and 4;

select machine_no, name, machine_type, price_baht, status
from public.machines
order by machine_no;
