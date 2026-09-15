"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Announcement, Machine } from "../lib/types";

const REFRESH_MS = 5000;
const STORAGE_KEY = "mew-laundry-notify-machines";

type Toast = { title: string; body: string } | null;

function minutesRemaining(endAt: string | null, now: number) {
  if (!endAt) return null;
  return Math.max(0, Math.ceil((new Date(endAt).getTime() - now) / 60_000));
}

function timeText(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function machineKind(machine: Machine) {
  return machine.machine_type === "dryer" ? "เครื่องอบผ้า" : "เครื่องซักผ้า";
}

function actionVerb(machine: Machine) {
  return machine.machine_type === "dryer" ? "อบ" : "ซัก";
}

function statusInfo(machine: Machine, now: number) {
  const remaining = minutesRemaining(machine.end_at, now);
  if (machine.status === "offline") return { label: "ออฟไลน์", tone: "offline", icon: "!", detail: "กำลังตรวจสอบการเชื่อมต่อ" };
  if (machine.status === "finished") return {
    label: machine.machine_type === "dryer" ? "อบเสร็จแล้ว" : "ซักเสร็จแล้ว",
    tone: "finished",
    icon: "✓",
    detail: machine.machine_type === "dryer" ? "นำผ้าออกจากเครื่องอบได้เลย" : "กรุณานำผ้าออกจากเครื่อง",
  };
  if (machine.status === "available") return { label: "ว่าง", tone: "available", icon: "✓", detail: "พร้อมใช้งาน" };
  if (remaining !== null && remaining <= 5) return { label: "ใกล้เสร็จ", tone: "soon", icon: "⌛", detail: `เหลือประมาณ ${remaining} นาที` };
  return {
    label: machine.machine_type === "dryer" ? "กำลังอบ" : "กำลังซัก",
    tone: "running",
    icon: "↻",
    detail: remaining !== null ? `เหลือประมาณ ${remaining} นาที` : "กำลังทำงาน",
  };
}

function progress(machine: Machine, now: number) {
  if (machine.status !== "running" || !machine.started_at || !machine.end_at) return 0;
  const start = new Date(machine.started_at).getTime();
  const end = new Date(machine.end_at).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [mode, setMode] = useState<"demo" | "live" | "error">("demo");
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachines, setSelectedMachines] = useState<number[]>([]);
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushBusy, setPushBusy] = useState<number | "all" | null>(null);
  const [pushMessage, setPushMessage] = useState("กดกระดิ่งที่เครื่องของคุณ เพื่อรับแจ้งเตือนก่อนเสร็จ 5 นาทีและเมื่อทำงานเสร็จ");
  const [isIosNeedsInstall, setIsIosNeedsInstall] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const alertedRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/machines", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Load failed");
      setMachines(data.machines);
      setMode(data.mode);
      setLastUpdated(new Date());

      try {
        const announcementResponse = await fetch("/api/announcement", { cache: "no-store" });
        const announcementData = await announcementResponse.json();
        if (announcementResponse.ok) setAnnouncement(announcementData.announcement ?? null);
      } catch {
        // Machine status is more important than the announcement; keep the last announcement on transient errors.
      }
    } catch {
      setMode("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = window.setInterval(load, REFRESH_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    setPermission(supported ? Notification.permission : "unsupported");

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setSelectedMachines(saved.filter((n) => [1, 2, 3, 4].includes(Number(n))).map(Number));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIosNeedsInstall(ios && !standalone);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed", error));
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedMachines.length) return;
    for (const machineNo of selectedMachines) {
      const machine = machines.find((m) => m.machine_no === machineNo);
      if (!machine) continue;
      const remaining = minutesRemaining(machine.end_at, now);
      let key = "";
      let nextToast: Toast = null;

      if (machine.status === "running" && remaining !== null && remaining <= 5) {
        key = `near:${machineNo}:${machine.end_at}`;
        nextToast = {
          title: `${machineKind(machine)} ${String(machineNo).padStart(2, "0")} ใกล้เสร็จแล้ว`,
          body: `เหลือประมาณ ${remaining} นาที เตรียมกลับมารับผ้าได้เลย`,
        };
      } else if (machine.status === "finished") {
        key = `finished:${machineNo}:${machine.end_at}`;
        nextToast = {
          title: `${machineKind(machine)} ${String(machineNo).padStart(2, "0")} ${actionVerb(machine)}เสร็จแล้ว`,
          body: machine.machine_type === "dryer" ? "นำผ้าออกจากเครื่องอบได้เลย" : "กรุณานำผ้าออกจากเครื่อง",
        };
      }

      if (key && nextToast && !alertedRef.current.has(key)) {
        alertedRef.current.add(key);
        setToast(nextToast);
        break;
      }
    }
  }, [machines, now, selectedMachines]);

  const counts = useMemo(() => {
    let available = 0;
    let busy = 0;
    machines.forEach((m) => {
      if (m.status === "available") available += 1;
      if (m.status === "running") busy += 1;
    });
    return { available, busy };
  }, [machines]);

  const syncPushSelection = useCallback(async (nextMachines: number[]) => {
    if (isIosNeedsInstall) {
      throw new Error("📱 หากใช้ iPhone กรุณาเพิ่ม CVP Laundry ไปที่หน้าจอโฮมก่อนเปิดการแจ้งเตือน");
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      throw new Error("อุปกรณ์นี้ไม่รองรับ Web Push");
    }

    let currentPermission = Notification.permission;
    if (currentPermission === "default") currentPermission = await Notification.requestPermission();
    setPermission(currentPermission);
    if (currentPermission !== "granted") throw new Error("ยังไม่ได้อนุญาตการแจ้งเตือนในเบราว์เซอร์");

    const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
    const keyData = await keyResponse.json();
    if (!keyResponse.ok) throw new Error(keyData.error || "ยังไม่ได้ตั้งค่า Web Push บนเซิร์ฟเวอร์");

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON(), machineNos: nextMachines }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "บันทึกการแจ้งเตือนไม่สำเร็จ");

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMachines));
    setSelectedMachines(nextMachines);
    return nextMachines;
  }, [isIosNeedsInstall]);

  const toggleNotification = useCallback(async (machineNo: number) => {
    setPushBusy(machineNo);
    try {
      const next = selectedMachines.includes(machineNo)
        ? selectedMachines.filter((n) => n !== machineNo)
        : [...selectedMachines, machineNo].sort();
      await syncPushSelection(next);
      setPushMessage(next.includes(machineNo)
        ? `เปิดแจ้งเตือนเครื่อง ${String(machineNo).padStart(2, "0")} แล้ว`
        : `ปิดแจ้งเตือนเครื่อง ${String(machineNo).padStart(2, "0")} แล้ว`);
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "เปิดการแจ้งเตือนไม่สำเร็จ");
    } finally {
      setPushBusy(null);
    }
  }, [selectedMachines, syncPushSelection]);

  const disableAll = useCallback(async () => {
    setPushBusy("all");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      localStorage.removeItem(STORAGE_KEY);
      setSelectedMachines([]);
      setPushMessage("ปิดการแจ้งเตือนทุกเครื่องแล้ว");
    } catch {
      setPushMessage("ปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setPushBusy(null);
    }
  }, []);

  return (
    <main className="pageShell">
      <section className="hero">
        <div>
          <div className="brandRow">
            <div className="logoMark">C</div>
            <div>
              <div className="eyebrow">CVP LAUNDRY</div>
              <h1>สถานะเครื่องซัก / อบผ้า</h1>
            </div>
          </div>
          <p className="subtitle">สแกน QR ครั้งเดียว ดูเครื่องซัก 3 เครื่องและเครื่องอบ 1 เครื่องแบบเรียลไทม์</p>
        </div>
        <div className="liveBadge">
          <span className={`liveDot ${mode === "error" ? "error" : ""}`} />
          {mode === "live" ? "LIVE" : mode === "demo" ? "DEMO" : "OFFLINE"}
        </div>
      </section>

      <section className="summaryBar">
        <div className="summaryItem"><span className="summaryNumber">{counts.available}</span><span>เครื่องว่าง</span></div>
        <div className="divider" />
        <div className="summaryItem"><span className="summaryNumber">{counts.busy}</span><span>กำลังทำงาน</span></div>
        <div className="lastUpdate">อัปเดต {lastUpdated ? timeText(lastUpdated.toISOString()) : "—"}</div>
      </section>

      <section className="notificationPanel" aria-live="polite">
        <div className="notificationIcon">🔔</div>
        <div className="notificationCopy">
          <strong>แจ้งเตือนบนมือถือ</strong>
          <span>{pushMessage}</span>
          {isIosNeedsInstall && <small>📱 หากใช้ iPhone กรุณาเพิ่ม CVP Laundry ไปที่หน้าจอโฮมก่อนเปิดการแจ้งเตือน</small>}
          {pushSupported === false && !isIosNeedsInstall && <small>เบราว์เซอร์นี้ไม่รองรับ Web Push กรุณาใช้เบราว์เซอร์รุ่นใหม่</small>}
          {permission === "denied" && <small>การแจ้งเตือนถูกบล็อกอยู่ ต้องอนุญาต Notification จากการตั้งค่าเบราว์เซอร์/เครื่อง</small>}
        </div>
        {selectedMachines.length > 0 && (
          <button type="button" className="clearNotifyButton" onClick={disableAll} disabled={pushBusy !== null}>
            ปิดทั้งหมด
          </button>
        )}
      </section>

      {loading ? (
        <section className="machineGrid skeletonGrid">
          {[1,2,3,4].map((n) => <div className="machineCard skeleton" key={n} />)}
        </section>
      ) : (
        <section className="machineGrid">
          {machines.map((machine) => {
            const info = statusInfo(machine, now);
            const remaining = minutesRemaining(machine.end_at, now);
            const pct = progress(machine, now);
            const selected = selectedMachines.includes(machine.machine_no);
            const canTrack = machine.status === "running" || selected;

            return (
              <article className={`machineCard ${info.tone}`} key={machine.machine_no} id={`machine-${machine.machine_no}`}>
                <div className="cardTop">
                  <div>
                    <div className="machineLabel">{machineKind(machine)}</div>
                    <div className="machineNo">{String(machine.machine_no).padStart(2, "0")}</div>
                    {machine.price_baht !== null && <div className="machinePrice">{machine.price_baht} บาท / ครั้ง</div>}
                  </div>
                  <div className={`statusPill ${info.tone}`}><span>{info.icon}</span>{info.label}</div>
                </div>

                {machine.status === "running" ? (
                  <>
                    <div className="countdownRow">
                      <div>
                        <div className="countdownValue">{remaining ?? "—"}</div>
                        <div className="countdownUnit">นาที</div>
                      </div>
                      <div className="finishTime">
                        <span>คาดว่าเสร็จ</span>
                        <strong>{timeText(machine.end_at)} น.</strong>
                      </div>
                    </div>
                    <div className="progressTrack"><div className="progressFill" style={{ width: `${pct}%` }} /></div>
                    <div className="programRow"><span>{machine.program || (machine.machine_type === "dryer" ? "โปรแกรมอบ" : "โปรแกรมซัก")}</span><span>{Math.round(pct)}%</span></div>
                  </>
                ) : (
                  <div className="stateCenter">
                    <div className={`stateIcon ${info.tone}`}>{info.icon}</div>
                    <strong>{info.label}</strong>
                    <span>{info.detail}</span>
                  </div>
                )}

                <button
                  type="button"
                  className={`bellButton ${selected ? "selected" : ""}`}
                  disabled={!canTrack || pushBusy !== null || (pushSupported === false && !isIosNeedsInstall)}
                  onClick={() => toggleNotification(machine.machine_no)}
                  aria-pressed={selected}
                >
                  <span>{selected ? "🔔" : "🔕"}</span>
                  {pushBusy === machine.machine_no ? "กำลังตั้งค่า..." : selected ? "กำลังแจ้งเตือนเครื่องนี้" : canTrack ? (isIosNeedsInstall ? "เปิดวิธีตั้งค่าแจ้งเตือนบน iPhone" : "แจ้งเตือนเครื่องนี้") : "เริ่มใช้งานแล้วจึงเปิดแจ้งเตือน"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      <section className="rulesSection" aria-labelledby="rules-title">
        <div className="rulesHeading">
          <div>
            <div className="rulesEyebrow">ประกาศ &amp; ข้อควรปฏิบัติ</div>
            <h2 id="rules-title">กฎระเบียบการใช้งาน CVP Laundry</h2>
          </div>
          <span className="rulesBadge">โปรดอ่านก่อนใช้งาน</span>
        </div>

        {announcement?.is_active && (
          <div className={`announcementBox ${announcement.tone}`}>
            <span className="announcementIcon" aria-hidden="true">{announcement.tone === "maintenance" ? "🛠️" : announcement.tone === "warning" ? "⚠️" : "📢"}</span>
            <div>
              <strong>{announcement.title}</strong>
              <p>{announcement.body}</p>
            </div>
          </div>
        )}

        <div className="rulesGrid">
          <div className="ruleCard">
            <span className="ruleNo">1</span>
            <p>ตรวจสอบกระเป๋าเสื้อและกางเกง นำเหรียญ กุญแจ กระดาษ และสิ่งของออกก่อนใส่เครื่อง</p>
          </div>
          <div className="ruleCard">
            <span className="ruleNo">2</span>
            <p>ห้ามซักหรืออบผ้าที่เปื้อนน้ำมัน เชื้อเพลิง สารไวไฟ หรือสารเคมีอันตราย</p>
          </div>
          <div className="ruleCard">
            <span className="ruleNo">3</span>
            <p>ห้ามใส่ของแข็ง ของมีโลหะหนัก รองเท้า หรือพรม หากไม่ได้รับอนุญาตจากผู้ดูแล</p>
          </div>
          <div className="ruleCard">
            <span className="ruleNo">4</span>
            <p>ใช้น้ำยาและผงซักฟอกในปริมาณเหมาะสม เพื่อป้องกันฟองล้นและความเสียหายต่อเครื่อง</p>
          </div>
          <div className="ruleCard">
            <span className="ruleNo">5</span>
            <p>ห้ามงัด ดึง หรือพยายามเปิดประตูระหว่างเครื่องกำลังทำงาน</p>
          </div>
          <div className="ruleCard">
            <span className="ruleNo">6</span>
            <p>เมื่อเครื่องทำงานเสร็จ กรุณานำผ้าออกโดยเร็วเพื่อแบ่งปันการใช้งานกับลูกค้าท่านอื่น</p>
          </div>
        </div>

        <details className="dryerRule">
          <summary>ข้อควรระวังสำหรับเครื่องอบผ้า 04</summary>
          <div className="dryerRuleBody">
            <p>ตรวจสอบฉลากการดูแลผ้าก่อนอบ และหลีกเลี่ยงวัสดุที่ละลายหรือเสียรูปจากความร้อน เช่น โฟม ยาง พลาสติก และผ้าที่ระบุว่าห้ามอบด้วยเครื่อง</p>
            <p>หากพบเสียง กลิ่น ควัน หรือการทำงานผิดปกติ กรุณาหยุดใช้งานและแจ้งผู้ดูแลทันที</p>
          </div>
        </details>
      </section>

      {mode === "demo" && (
        <div className="demoNotice">ขณะนี้เป็นโหมด DEMO — การแจ้งเตือน Push จริงจะพร้อมเมื่อใส่ค่า Supabase และ VAPID ใน Vercel</div>
      )}

      {toast && (
        <div className="toast" role="status">
          <div className="toastBell">🔔</div>
          <div><strong>{toast.title}</strong><span>{toast.body}</span></div>
          <button type="button" onClick={() => setToast(null)} aria-label="ปิดข้อความ">×</button>
        </div>
      )}

      <footer>
        <span>CVP Laundry Monitoring</span>
        <a href="/qr">เปิด QR สำหรับติดหน้าร้าน</a>
      </footer>
    </main>
  );
}
