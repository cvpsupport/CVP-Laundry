# CVP Laundry Monitoring v1.5

Mobile-first dashboard for 3 washers and 1 dryer. One QR opens one dashboard. The app shows live status/countdown, Web Push notifications, rules, and an editable shop announcement managed from `/admin`.

## Main features

- One dashboard showing 3 washers and 1 dryer
- Prices: washer 01 = 50 THB, washer 02 = 40 THB, washer 03 = 30 THB, dryer 04 = 40 THB
- Statuses: available, running, near finish, finished, offline
- Countdown + expected finish time
- One QR poster at `/qr`
- PWA + Web Push per machine
- Static shop rules and dryer safety guidance
- **Editable announcement from `/admin` without redeploying**
- Supabase storage for machine status, push subscriptions, and announcement
- Protected ESP32 status API

## 1. Install and run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2. Supabase

For a new project, run the complete file:

`supabase/schema.sql`

For an existing v1.4 project, run only:

`supabase/add_admin_announcement.sql`

The new table is `public.site_announcements` and contains a single editable row with `id = 1`.

## 3. Environment variables

Add these to `.env.local` for local development and to Vercel → Project → Settings → Environment Variables for production:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DEVICE_API_KEY=use-a-long-random-secret
ADMIN_PASSWORD=use-a-strong-admin-password
NEXT_PUBLIC_SITE_URL=https://cvp-laundry.vercel.app
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://cvp-laundry.vercel.app
```

`ADMIN_PASSWORD` is server-side only. Do not commit `.env.local` to GitHub.

After changing Vercel environment variables, redeploy once.

## 4. Admin announcement

Open:

`https://cvp-laundry.vercel.app/admin`

Sign in with the value of `ADMIN_PASSWORD`.

The Admin page can:

- Change the announcement title
- Change the announcement message
- Choose `ข้อมูลทั่วไป`, `ประกาศสำคัญ`, or `แจ้งซ่อม / ปิดบริการ`
- Show/hide the announcement without deleting it
- Preview the announcement before saving

The customer dashboard refreshes about every 5 seconds, so saved changes appear without a new Git/Vercel deployment.

The admin session uses an HttpOnly, SameSite=Strict cookie and expires after 12 hours.

## 5. Web Push

Generate VAPID keys locally:

```bash
npx web-push generate-vapid-keys
```

Keep `VAPID_PRIVATE_KEY` secret. For Apple Web Push, use the production HTTPS site URL as `VAPID_SUBJECT`, for example:

```text
https://cvp-laundry.vercel.app
```

On iPhone/iPad, add CVP Laundry to the Home Screen first and open it from the Home Screen icon before enabling notifications.

## 6. Deploy

Push the project to GitHub. Vercel will redeploy automatically when the connected `main` branch changes.

Production paths:

- Dashboard: `/`
- QR poster: `/qr`
- Admin: `/admin`
- Public machine API: `/api/machines`
- Device update API: `/api/device/update`

## 7. ESP32

Firmware:

`firmware/esp32_4machines/esp32_4machines.ino`

GPIO plan:

| Machine | Type | ESP32 GPIO |
|---|---|---:|
| 01 | Washer | 25 |
| 02 | Washer | 26 |
| 03 | Washer | 27 |
| 04 | Dryer | 32 |

Use only electrically isolated low-voltage/dry-contact signals. Never connect mains voltage directly to ESP32.

## v1.5 changes

- Added password-protected `/admin`
- Added editable announcement stored in Supabase
- Added announcement visibility toggle and 3 visual tones
- Customer dashboard reads announcement from Supabase every refresh cycle
- Added `ADMIN_PASSWORD` environment variable
- Added migration file `supabase/add_admin_announcement.sql`
