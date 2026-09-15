# ESP32 controller for CVP Laundry (4 machines)

This firmware monitors four electrically isolated RUN signals and reports machine events to the Vercel API.

## Push timing in v1.8

For every running cycle, the ESP32 uses `CYCLE_MINUTES` to send two notification events:

1. **15 minutes before the expected end** → first push notification.
2. **5 minutes before the expected end** → second push notification.
3. At the actual finish signal / T0 → dashboard changes to **ซักเสร็จแล้ว / อบเสร็จแล้ว**. No third push is sent.
4. After the finished hold period → machine returns to **ว่าง**.

If a cycle is shorter than 15 minutes, the 15-minute alert is skipped because that time point does not exist.

## Safe-side wiring

Use four **electrically isolated** current/run detector modules that provide a dry-contact or 3.3 V-compatible isolated output.

- Machine 1 detector output → GPIO 25
- Machine 2 detector output → GPIO 26
- Machine 3 detector output → GPIO 27
- Machine 4 detector output → GPIO 32

**Never connect 220–230 V mains directly to an ESP32 GPIO.** Mains-side installation should be performed by a qualified electrician.

## Configure

Edit these values in `esp32_4machines.ino`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `API_URL`
- `DEVICE_API_KEY`
- `CYCLE_MINUTES[4]`

Timing constants:

- `FIRST_ALERT_MINUTES = 15`
- `SECOND_ALERT_MINUTES = 5`
- `START_CONFIRM_MS`
- `FINISH_CONFIRM_MS`
- `FINISHED_HOLD_MS`

## Accuracy note

The 15- and 5-minute alerts are only as accurate as the configured `CYCLE_MINUTES`. If the real washer/dryer changes its duration dynamically, use a safely isolated signal or an API from the machine controller that exposes actual remaining time.
