#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// =========================
// CVP Laundry - 4 machines
// v1.8: two push alerts at T-15 and T-5
// =========================
// Each input must be an ISOLATED low-voltage/dry-contact RUN signal.
// Never connect ESP32 GPIO directly to mains voltage.

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* API_URL = "https://cvp-laundry.vercel.app/api/device/update";
const char* DEVICE_API_KEY = "CHANGE_TO_THE_SAME_DEVICE_API_KEY_AS_VERCEL";

const uint8_t SENSOR_PINS[4] = {25, 26, 27, 32};
const bool ACTIVE_LOW = true;

// Set the real expected cycle time of each machine.
const uint16_t CYCLE_MINUTES[4] = {40, 40, 40, 40};
const uint8_t FIRST_ALERT_MINUTES = 15;
const uint8_t SECOND_ALERT_MINUTES = 5;

const unsigned long START_CONFIRM_MS = 15UL * 1000UL;
const unsigned long FINISH_CONFIRM_MS = 120UL * 1000UL;
const unsigned long FINISHED_HOLD_MS = 10UL * 60UL * 1000UL;
const unsigned long API_RETRY_MS = 10UL * 1000UL;

struct MachineRuntime {
  bool running = false;
  bool finished = false;
  bool startSent = false;
  bool alert15Sent = false;
  bool alert5Sent = false;
  bool finishSent = false;
  bool availableSent = true;
  unsigned long activeSince = 0;
  unsigned long inactiveSince = 0;
  unsigned long cycleStartedAt = 0;
  unsigned long finishedAt = 0;
  unsigned long lastApiAttempt = 0;
};

MachineRuntime machines[4];

bool sensorActive(uint8_t index) {
  int value = digitalRead(SENSOR_PINS[index]);
  return ACTIVE_LOW ? (value == LOW) : (value == HIGH);
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000UL) {
    delay(250);
  }
}

bool postEvent(uint8_t machineNo, const String& event, uint16_t durationMinutes = 0, uint8_t minutesRemaining = 0) {
  ensureWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, API_URL)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);
  http.setTimeout(8000);

  String json = "{\"machineNo\":" + String(machineNo) + ",\"event\":\"" + event + "\"";
  if (event == "start") {
    json += ",\"durationMinutes\":" + String(durationMinutes);
    json += ",\"program\":\"Normal\"";
  }
  if (event == "near_finish") {
    json += ",\"minutesRemaining\":" + String(minutesRemaining);
  }
  json += "}";

  int code = http.POST(json);
  String response = http.getString();
  http.end();

  Serial.printf("Machine %u event %s (%u min) -> HTTP %d %s\n", machineNo, event.c_str(), minutesRemaining, code, response.c_str());
  return code >= 200 && code < 300;
}

bool canRetry(MachineRuntime& m, unsigned long now) {
  if (now - m.lastApiAttempt < API_RETRY_MS) return false;
  m.lastApiAttempt = now;
  return true;
}

void startCycle(uint8_t i, unsigned long now) {
  MachineRuntime& m = machines[i];
  m.running = true;
  m.finished = false;
  m.startSent = false;
  m.alert15Sent = false;
  m.alert5Sent = false;
  m.finishSent = false;
  m.availableSent = false;
  m.cycleStartedAt = now;
  m.inactiveSince = 0;
  m.finishedAt = 0;
  m.lastApiAttempt = now - API_RETRY_MS;
  Serial.printf("Machine %u cycle started\n", i + 1);
}

void markFinished(uint8_t i, unsigned long now) {
  MachineRuntime& m = machines[i];
  m.running = false;
  m.finished = true;
  m.finishSent = false;
  m.finishedAt = now;
  m.activeSince = 0;
  m.lastApiAttempt = now - API_RETRY_MS;
  Serial.printf("Machine %u cycle finished\n", i + 1);
}

void updateMachine(uint8_t i, unsigned long now) {
  MachineRuntime& m = machines[i];
  const bool active = sensorActive(i);

  if (!m.running && !m.finished) {
    if (active) {
      if (m.activeSince == 0) m.activeSince = now;
      if (now - m.activeSince >= START_CONFIRM_MS) startCycle(i, now);
    } else {
      m.activeSince = 0;
    }
    return;
  }

  if (m.running) {
    if (!m.startSent && canRetry(m, now)) {
      m.startSent = postEvent(i + 1, "start", CYCLE_MINUTES[i]);
    }

    const unsigned long elapsed = now - m.cycleStartedAt;
    const unsigned long cycleMs = (unsigned long)CYCLE_MINUTES[i] * 60UL * 1000UL;

    if (!m.alert15Sent && CYCLE_MINUTES[i] > FIRST_ALERT_MINUTES) {
      const unsigned long alert15At = cycleMs - (unsigned long)FIRST_ALERT_MINUTES * 60UL * 1000UL;
      if (elapsed >= alert15At && canRetry(m, now)) {
        m.alert15Sent = postEvent(i + 1, "near_finish", 0, FIRST_ALERT_MINUTES);
      }
    }

    if (!m.alert5Sent && CYCLE_MINUTES[i] > SECOND_ALERT_MINUTES) {
      const unsigned long alert5At = cycleMs - (unsigned long)SECOND_ALERT_MINUTES * 60UL * 1000UL;
      if (elapsed >= alert5At && canRetry(m, now)) {
        m.alert5Sent = postEvent(i + 1, "near_finish", 0, SECOND_ALERT_MINUTES);
      }
    }

    if (!active) {
      if (m.inactiveSince == 0) m.inactiveSince = now;
      if (now - m.inactiveSince >= FINISH_CONFIRM_MS) markFinished(i, now);
    } else {
      m.inactiveSince = 0;
    }
    return;
  }

  if (m.finished) {
    // At T0, update the dashboard to "finished". No third push is sent.
    if (!m.finishSent && canRetry(m, now)) {
      m.finishSent = postEvent(i + 1, "finish");
    }

    if (active) {
      if (m.activeSince == 0) m.activeSince = now;
      if (now - m.activeSince >= START_CONFIRM_MS) startCycle(i, now);
      return;
    }
    m.activeSince = 0;

    if (m.finishSent && !m.availableSent && now - m.finishedAt >= FINISHED_HOLD_MS && canRetry(m, now)) {
      if (postEvent(i + 1, "available")) {
        m.availableSent = true;
        m.finished = false;
        Serial.printf("Machine %u is available\n", i + 1);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  for (uint8_t i = 0; i < 4; i++) {
    pinMode(SENSOR_PINS[i], INPUT_PULLUP);
  }

  ensureWiFi();
  Serial.println("CVP Laundry controller v1.8 started");
}

void loop() {
  const unsigned long now = millis();
  for (uint8_t i = 0; i < 4; i++) updateMachine(i, now);
  delay(100);
}
