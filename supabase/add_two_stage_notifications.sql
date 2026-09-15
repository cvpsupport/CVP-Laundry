-- CVP Laundry v1.8: two-stage push notification tracking

alter table public.machines
  add column if not exists warning_15_notified_at timestamptz;

alter table public.machines
  add column if not exists warning_5_notified_at timestamptz;

-- Start fresh for the next test cycle.
update public.machines
set warning_15_notified_at = null,
    warning_5_notified_at = null;

select machine_no, warning_15_notified_at, warning_5_notified_at
from public.machines
order by machine_no;
