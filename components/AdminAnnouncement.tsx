"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Announcement, AnnouncementTone } from "../lib/types";

const toneLabels: Record<AnnouncementTone, string> = {
  info: "ข้อมูลทั่วไป",
  warning: "ประกาศสำคัญ",
  maintenance: "แจ้งซ่อม / ปิดบริการ",
};

export default function AdminAnnouncement() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAnnouncement = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/announcement", { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        setAnnouncement(null);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
      setAuthenticated(true);
      setAnnouncement(data.announcement);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncement();
  }, [loadAnnouncement]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      setPassword("");
      await loadAnnouncement();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!announcement) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        setAnnouncement(null);
        throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }
      if (!response.ok) throw new Error(data.error || "บันทึกประกาศไม่สำเร็จ");
      setAnnouncement(data.announcement);
      setMessage("บันทึกประกาศแล้ว หน้าเว็บลูกค้าจะอัปเดตภายในประมาณ 5 วินาที");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกประกาศไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setAnnouncement(null);
      setBusy(false);
    }
  }

  if (authenticated === null) {
    return (
      <main className="adminShell">
        <section className="adminCard adminLoading">กำลังตรวจสอบสิทธิ์…</section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="adminShell">
        <section className="adminCard loginCard">
          <a className="adminBackLink" href="/">← กลับหน้าสถานะเครื่อง</a>
          <div className="adminBrand"><div className="logoMark">C</div><div><div className="eyebrow">CVP LAUNDRY</div><h1>Admin</h1></div></div>
          <p className="adminIntro">เข้าสู่ระบบเพื่อแก้ไขประกาศที่แสดงบนหน้าลูกค้า</p>
          <form onSubmit={login} className="adminForm">
            <label>
              <span>รหัสผ่าน Admin</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {loginError && <div className="adminError">{loginError}</div>}
            <button className="adminPrimary" type="submit" disabled={busy || !password}>
              {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!announcement) {
    return (
      <main className="adminShell">
        <section className="adminCard">ยังไม่พบข้อมูลประกาศ กรุณารัน SQL migration สำหรับ v1.5 ก่อน</section>
      </main>
    );
  }

  return (
    <main className="adminShell">
      <section className="adminCard editorCard">
        <div className="adminTopbar">
          <div>
            <a className="adminBackLink" href="/">← กลับหน้าสถานะเครื่อง</a>
            <div className="eyebrow">CVP LAUNDRY ADMIN</div>
            <h1>จัดการประกาศ</h1>
          </div>
          <button type="button" className="adminGhost" onClick={logout} disabled={busy}>ออกจากระบบ</button>
        </div>

        <form onSubmit={save} className="adminForm adminEditorForm">
          <label className="adminSwitchRow">
            <span>
              <strong>แสดงประกาศบนหน้าเว็บ</strong>
              <small>ปิดสวิตช์นี้เพื่อซ่อนประกาศชั่วคราว โดยไม่ลบข้อความ</small>
            </span>
            <input
              type="checkbox"
              checked={announcement.is_active}
              onChange={(event) => setAnnouncement({ ...announcement, is_active: event.target.checked })}
            />
          </label>

          <label>
            <span>รูปแบบประกาศ</span>
            <select
              value={announcement.tone}
              onChange={(event) => setAnnouncement({ ...announcement, tone: event.target.value as AnnouncementTone })}
            >
              {(Object.keys(toneLabels) as AnnouncementTone[]).map((tone) => (
                <option value={tone} key={tone}>{toneLabels[tone]}</option>
              ))}
            </select>
          </label>

          <label>
            <span>หัวข้อประกาศ</span>
            <input
              type="text"
              value={announcement.title}
              onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })}
              maxLength={80}
              required
            />
            <small>{announcement.title.length}/80 ตัวอักษร</small>
          </label>

          <label>
            <span>ข้อความประกาศ</span>
            <textarea
              value={announcement.body}
              onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })}
              rows={7}
              maxLength={800}
              required
            />
            <small>{announcement.body.length}/800 ตัวอักษร</small>
          </label>

          <div className="adminPreviewBlock">
            <span className="adminPreviewLabel">ตัวอย่างบนหน้าลูกค้า</span>
            <div className={`announcementBox ${announcement.tone}`}>
              <span className="announcementIcon" aria-hidden="true">{announcement.tone === "maintenance" ? "🛠️" : announcement.tone === "warning" ? "⚠️" : "📢"}</span>
              <div>
                <strong>{announcement.title || "หัวข้อประกาศ"}</strong>
                <p>{announcement.body || "ข้อความประกาศ"}</p>
              </div>
            </div>
          </div>

          {message && <div className={message.startsWith("บันทึก") ? "adminSuccess" : "adminError"}>{message}</div>}

          <button className="adminPrimary" type="submit" disabled={busy}>
            {busy ? "กำลังบันทึก…" : "บันทึกประกาศ"}
          </button>
        </form>
      </section>
    </main>
  );
}
