# ESP32 controller for 4 washers

This firmware uses one ESP32 to monitor four isolated RUN signals and report events to the Vercel API.

## Safe-side wiring

Use four **electrically isolated** current/run detector modules that provide a dry-contact or 3.3 V-compatible isolated output. Connect only the safe low-voltage output side to the ESP32:

- Washer 1 detector output → GPIO 25
- Washer 2 detector output → GPIO 26
- Washer 3 detector output → GPIO 27
- Washer 4 detector output → GPIO 32
- Safe-side GND → ESP32 GND when required by the detector output

The example assumes `ACTIVE_LOW = true` and uses `INPUT_PULLUP`. Change `ACTIVE_LOW` if your isolated detector output is active-high.

**Do not connect a washer's 220–230 V mains wiring directly to any ESP32 pin.** Installation of any mains-side current detector or interface should be performed by a qualified electrician and according to the detector manufacturer's instructions.

## Configure

Edit these values in `esp32_4machines.ino`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `API_URL` → your Vercel URL + `/api/device/update`
- `DEVICE_API_KEY` → exactly the same secret as the Vercel environment variable
- `CYCLE_MINUTES[4]` → expected cycle duration for each washer

Important timing settings:

- `START_CONFIRM_MS`: RUN must stay active before a cycle starts.
- `FINISH_CONFIRM_MS`: RUN must stay inactive before a cycle is considered finished; this prevents short pauses during washing from ending the cycle.
- `NEAR_FINISH_MINUTES`: push notification threshold, default 5 minutes.
- `FINISHED_HOLD_MS`: how long the dashboard shows “finished” before returning to “available”.

## Events sent to Vercel

1. `start` — dashboard becomes running and starts the countdown.
2. `near_finish` — sends Web Push to users following that washer.
3. `finish` — dashboard becomes finished and sends Web Push again.
4. `available` — after the finished hold time, the washer becomes available.

The API retries failed events so a brief Wi-Fi interruption does not immediately lose the state transition.

## Accuracy note

The remaining-time countdown is based on `CYCLE_MINUTES`. If the washer changes cycle duration dynamically, use a signal from the washer controller/display (through a properly isolated interface) or integrate the machine's own API instead of a fixed-time estimate.
