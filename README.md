# CVP Laundry v1.12

Web dashboard for 3 washers + 1 dryer, Supabase live status, Vercel API, PWA/Web Push, Admin announcements/rules/maintenance, and ESP32 integration.

## v1.9 bug fixes

### 1) Countdown / remaining time sync

When the device reports `near_finish` with `minutesRemaining: 15` or `5`, the server now updates `end_at` to match the real remaining time. The mobile dashboard therefore changes to the same remaining time instead of continuing to count from the old estimate.

The dashboard also refreshes immediately when an iPhone/PWA returns from the background, and a running machine automatically changes to `finished` when `end_at` reaches zero even if the explicit `finish` event is missed.

### 2) Push subscription state sync

The notification button no longer trusts only `localStorage`. On page/PWA startup it checks:

- the browser's real PushSubscription
- the current VAPID public key
- the matching subscription row in Supabase

Stale local state is cleared automatically. If the VAPID key changed, the old browser subscription is removed automatically so the user can tap **แจ้งเตือนเครื่องนี้** again without manually deleting old saved data.

### 3) Subscription is per customer cycle

When a wash/dry cycle finishes or becomes available, that machine is automatically removed from the customer's saved push subscription. This prevents a previous customer from receiving notifications for the next customer's cycle.

## Notification behavior

Customers receive two push notifications per cycle:

- **15 minutes before finish** — first notification
- **5 minutes before finish** — second notification
- At 0 minutes the dashboard changes to **ซักเสร็จแล้ว / อบเสร็จแล้ว** without a third push.

## Supabase

v1.9 does **not** require a new SQL migration if v1.8's `supabase/add_two_stage_notifications.sql` has already been run.

## Production test

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

Sync to 15 minutes and send notification 1:

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

The dashboard should show approximately **15 minutes** and continue counting down.

Then sync to 5 minutes and send notification 2:

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

The dashboard should change to approximately **5 minutes** immediately.

## Deploy

Copy the v1.9 update files into the existing project, then:

```powershell
npm run build
git add .
git commit -m "Fix timer sync and push subscription state"
git push
```

No new environment variables are required.


## v1.10
- เปลี่ยนโลโก้ตัว C เป็นไอคอนเครื่องซักผ้าในหน้า Home, Admin และ QR
- เพิ่มไฟล์ `public/washer-mark.svg` สำหรับโลโก้หลัก
- ไอคอน PWA เดิมยังคงเป็นรูปเครื่องซักผ้าอยู่แล้ว


## v1.11
- เปลี่ยนโลโก้ตัว C เป็นไอคอนเครื่องซักผ้าในหน้า Home, Admin และ QR (รวมการเปลี่ยนแปลงจาก v1.10)
- ขยายข้อความ “อัปเดต” ให้มองเห็นชัดขึ้น โดยเฉพาะบนมือถือ
- แสดงเวลาอัปเดตแบบ ชั่วโมง:นาที:วินาที เช่น `อัปเดต 07:51:23`
- เวลา “เสร็จประมาณ” ยังคงแสดง ชั่วโมง:นาที เพื่อให้อ่านง่าย

## v1.12 — นาฬิกาเดินทุกวินาที

- เวลา `อัปเดต HH:MM:SS` บนหน้า Home เดินต่อเนื่องทุก 1 วินาที
- ไม่ต้องรอรอบ refresh ข้อมูล 5 วินาทีเพื่อให้เลขวินาทีเปลี่ยน
- ไม่ต้องแก้ Supabase หรือ Environment Variables เพิ่ม
