# CVP Laundry v1.8

Web dashboard for 3 washers + 1 dryer, Supabase live status, Vercel API, PWA/Web Push, Admin announcements/rules/maintenance, and ESP32 integration.

## v1.8 notification behavior

Customers who tap **แจ้งเตือนเครื่องนี้** receive two push notifications per cycle:

- **ครั้งที่ 1: 15 นาทีก่อนเสร็จ** — “ใกล้เสร็จแล้ว”
- **ครั้งที่ 2: 5 นาทีก่อนเสร็จ** — “อีก 5 นาทีจะเสร็จ”

At 0 minutes the dashboard changes to **ซักเสร็จแล้ว / อบเสร็จแล้ว**. v1.8 does not send a third push at T0, so customers receive exactly two push notifications.

## Required Supabase migration

Run this file once in Supabase SQL Editor:

`supabase/add_two_stage_notifications.sql`

It adds:

- `warning_15_notified_at`
- `warning_5_notified_at`

These columns prevent duplicate notifications for the same cycle.

## Manual production test

Start machine 1:

```powershell
$body = @{
    machineNo = 1
    event = "start"
    durationMinutes = 40
    program = "normal"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://cvp-laundry.vercel.app/api/device/update" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

First notification (simulate 15 minutes remaining):

```powershell
$body = @{
    machineNo = 1
    event = "near_finish"
    minutesRemaining = 15
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://cvp-laundry.vercel.app/api/device/update" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

Second notification (simulate 5 minutes remaining):

```powershell
$body = @{
    machineNo = 1
    event = "near_finish"
    minutesRemaining = 5
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://cvp-laundry.vercel.app/api/device/update" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

Actual finish / status only:

```powershell
$body = @{
    machineNo = 1
    event = "finish"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://cvp-laundry.vercel.app/api/device/update" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

## Deploy

After copying the v1.8 update into the existing project:

```powershell
npm run build
git add .
git commit -m "Add 15 and 5 minute push notifications"
git push
```

Vercel will deploy from GitHub automatically.
