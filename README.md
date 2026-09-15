# MEW Laundry Monitoring v1.1

Mobile-first washer status web app for four machines. One QR opens one dashboard. The app shows live status/countdown and supports per-machine Web Push notifications when a selected washer is nearly finished and when it is finished.

## What is included

- One dashboard showing all 4 washers
- Statuses: available, running, near finish, finished, offline
- Countdown + expected finish time
- One QR poster at `/qr`
- PWA manifest + service worker
- Per-machine notification button (each customer follows only their own washer)
- Web Push when 5 minutes remain and when washing is finished
- In-app alert while the dashboard is open
- Supabase storage for washer status + push subscriptions
- Protected ESP32 status API
- ESP32 firmware for one controller monitoring 4 isolated RUN inputs
- Demo mode when Supabase is not configured

## 1. Install and run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2. Create Supabase tables

Create a Supabase project, open SQL Editor, and run the complete file:

`supabase/schema.sql`

If you already used the previous version, the SQL includes `add column if not exists` migration statements for notification markers.

Copy these values from Supabase into your Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key server-side only.

## 3. Generate Web Push (VAPID) keys

Run locally:

```bash
npx web-push generate-vapid-keys
```

Add the generated values to Vercel:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` — for example `mailto:owner@example.com`

Do not commit the private key to Git.

## 4. Add all Vercel environment variables

Use `.env.example` as the list:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DEVICE_API_KEY=use-a-long-random-secret
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:owner@example.com
```

Redeploy after setting or changing environment variables.

## 5. Deploy to Vercel

Push this folder to GitHub/GitLab/Bitbucket and import the repository into Vercel, or deploy with the Vercel CLI.

After deployment:

- Dashboard: `https://your-project.vercel.app`
- QR poster: `https://your-project.vercel.app/qr`
- Device endpoint: `https://your-project.vercel.app/api/device/update`

Print the QR from `/qr`. Every customer scans the same QR.

## 6. Customer notification flow

1. Customer scans the one shop QR.
2. The dashboard shows all four machines.
3. Customer taps **แจ้งเตือนเครื่องนี้** only on the machine they are using.
4. The browser asks for notification permission.
5. ESP32 sends `near_finish` at the configured threshold (default 5 minutes).
6. Vercel sends Web Push only to subscriptions following that machine.
7. ESP32 sends `finish`, and Vercel sends the finished notification.

### iPhone / iPad

For iOS/iPadOS Web Push, add the site to the Home Screen first, open it from the Home Screen icon, then tap the notification button. The app includes an on-screen instruction when it detects iOS running outside standalone mode.

## 7. ESP32 for all 4 washers

Firmware is in:

`firmware/esp32_4machines/esp32_4machines.ino`

Safe-side input plan:

| Washer | ESP32 GPIO |
|---|---:|
| 01 | 25 |
| 02 | 26 |
| 03 | 27 |
| 04 | 32 |

Use only an electrically isolated low-voltage/dry-contact RUN signal from an appropriate detector/interface. Never connect mains voltage directly to ESP32. See the firmware README for details.

Change these in the firmware before upload:

```cpp
WIFI_SSID
WIFI_PASSWORD
API_URL
DEVICE_API_KEY
CYCLE_MINUTES[4]
```

The `DEVICE_API_KEY` must exactly match the Vercel environment variable.

## Device API examples

Start machine 1 for 40 minutes:

```bash
curl -X POST https://your-project.vercel.app/api/device/update \
  -H "content-type: application/json" \
  -H "x-device-key: YOUR_DEVICE_API_KEY" \
  -d '{"machineNo":1,"event":"start","durationMinutes":40,"program":"Normal"}'
```

Send the 5-minute warning:

```bash
curl -X POST https://your-project.vercel.app/api/device/update \
  -H "content-type: application/json" \
  -H "x-device-key: YOUR_DEVICE_API_KEY" \
  -d '{"machineNo":1,"event":"near_finish","minutesRemaining":5}'
```

Finish machine 1:

```bash
curl -X POST https://your-project.vercel.app/api/device/update \
  -H "content-type: application/json" \
  -H "x-device-key: YOUR_DEVICE_API_KEY" \
  -d '{"machineNo":1,"event":"finish"}'
```

## Notes

- Web Push requires HTTPS in production. Vercel provides HTTPS.
- Push permissions must be requested from a user interaction; the notification button handles this.
- The server deduplicates near-finish and finished notifications for each cycle using timestamp markers in the `machines` table.
- Current-sensor-only countdown is an estimate unless the washer has a fixed cycle time. For exact remaining time on variable cycles, integrate an isolated controller/display signal or the washer's native API.
