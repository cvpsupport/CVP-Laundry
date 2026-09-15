# CVP Laundry Monitoring v1.6

Mobile-first dashboard for 3 washers and 1 dryer. One QR opens one dashboard. The app shows live status/countdown, Web Push notifications, editable announcements and rules, plus machine maintenance controls from `/admin`.

## Main features

- One dashboard showing 3 washers and 1 dryer
- Prices: washer 01 = 50 THB, washer 02 = 40 THB, washer 03 = 30 THB, dryer 04 = 40 THB
- Statuses: available, running, near finish, finished, offline, plus an Admin maintenance override
- Countdown + expected finish time
- One QR poster at `/qr`
- PWA + Web Push per machine
- Editable shop announcement from `/admin`
- **Editable rules: add, edit, delete, hide/show, and reorder**
- **Admin maintenance switch for each machine with a customer-visible note**
- Maintenance mode blocks new `start` events from the device API and ignores stale near-finish/finish events
- Supabase storage for machine status, push subscriptions, announcement, and rules
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

For an existing **v1.5** project, run only:

`supabase/add_admin_rules_maintenance.sql`

This migration:

- adds `is_maintenance` and `maintenance_note` to `public.machines`
- creates `public.site_rules`
- seeds the existing 6 general rules and 2 dryer-safety rules only when the rules table is empty

After running the migration, check that Supabase shows the rules rows and all four machines.

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

`ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `DEVICE_API_KEY`, and `VAPID_PRIVATE_KEY` are server-side secrets. Do not commit `.env.local` to GitHub.

After changing Vercel environment variables, redeploy once.

## 4. Admin

Open:

`https://cvp-laundry.vercel.app/admin`

Sign in with `ADMIN_PASSWORD`.

### Announcement

- Change title and message
- Choose information / warning / maintenance tone
- Show or hide the announcement
- Preview before saving

### Rules

- Add a new rule
- Edit each rule
- Delete a rule
- Show/hide without deleting
- Move rules up/down
- Choose `กฎทั่วไป` or `ข้อควรระวังเครื่องอบ`

The customer dashboard reads active rules from Supabase every refresh cycle (about 5 seconds).

### Machine maintenance

For machines 01–04 Admin can:

- enter a customer-visible note such as `รอช่างเข้าตรวจ`
- set the machine to `ปิดปรับปรุง`
- edit and save the maintenance note while it remains closed
- reopen the machine when repair is complete

When maintenance is enabled, the public dashboard shows `ปิดปรับปรุง`, excludes the machine from the available count, and disables new notification tracking for that machine. The device API rejects new `start` events with HTTP 409 while maintenance is active.

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
- Public rules API: `/api/rules`
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

## v1.6 changes

- Admin can add/edit/delete/hide/reorder rules
- General and dryer-specific rule categories are stored in Supabase
- Admin can close any machine for maintenance with a note
- Public dashboard shows a red `ปิดปรับปรุง` state
- Available-machine count excludes maintenance machines
- Device API blocks new starts and ignores stale finish notifications during maintenance
- Added migration file `supabase/add_admin_rules_maintenance.sql`
