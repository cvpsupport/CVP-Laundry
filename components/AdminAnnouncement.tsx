"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Announcement, AnnouncementTone, Machine, RuleCategory, SiteRule } from "../lib/types";

const toneLabels: Record<AnnouncementTone, string> = {
  info: "ข้อมูลทั่วไป",
  warning: "ประกาศสำคัญ",
  maintenance: "แจ้งซ่อม / ปิดบริการ",
};

const categoryLabels: Record<RuleCategory, string> = {
  general: "กฎทั่วไป",
  dryer: "ข้อควรระวังเครื่องอบ",
};

type BusyState = string | null;

function machineKind(machine: Machine) {
  return machine.machine_type === "dryer" ? "เครื่องอบผ้า" : "เครื่องซักผ้า";
}

export default function AdminAnnouncement() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [rules, setRules] = useState<SiteRule[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<BusyState>(null);
  const [newRuleBody, setNewRuleBody] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<RuleCategory>("general");

  const loadAll = useCallback(async () => {
    try {
      const [announcementResponse, rulesResponse, machinesResponse] = await Promise.all([
        fetch("/api/admin/announcement", { cache: "no-store" }),
        fetch("/api/admin/rules", { cache: "no-store" }),
        fetch("/api/admin/machines", { cache: "no-store" }),
      ]);

      if ([announcementResponse, rulesResponse, machinesResponse].some((response) => response.status === 401)) {
        setAuthenticated(false);
        setAnnouncement(null);
        setRules([]);
        setMachines([]);
        return;
      }

      const [announcementData, rulesData, machinesData] = await Promise.all([
        announcementResponse.json(),
        rulesResponse.json(),
        machinesResponse.json(),
      ]);

      if (!announcementResponse.ok) throw new Error(announcementData.error || "โหลดประกาศไม่สำเร็จ");
      if (!rulesResponse.ok) throw new Error(rulesData.error || "โหลดกฎระเบียบไม่สำเร็จ");
      if (!machinesResponse.ok) throw new Error(machinesData.error || "โหลดข้อมูลเครื่องไม่สำเร็จ");

      setAuthenticated(true);
      setAnnouncement(announcementData.announcement ?? null);
      setRules(Array.isArray(rulesData.rules) ? rulesData.rules : []);
      setMachines(Array.isArray(machinesData.machines) ? machinesData.machines : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.id - b.id),
    [rules]
  );

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
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
      await loadAll();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!announcement) return;
    setBusy("announcement");
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
      setBusy(null);
    }
  }

  function patchRuleLocal(id: number, patch: Partial<SiteRule>) {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  async function saveRule(rule: SiteRule) {
    setBusy(`rule-${rule.id}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rule.id,
          category: rule.category,
          body: rule.body,
          is_active: rule.is_active,
          sort_order: rule.sort_order,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "บันทึกกฎไม่สำเร็จ");
      patchRuleLocal(rule.id, data.rule);
      setMessage("บันทึกกฎระเบียบแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกกฎไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = newRuleBody.trim();
    if (!body) return;
    const sameCategory = rules.filter((rule) => rule.category === newRuleCategory);
    const nextOrder = sameCategory.length ? Math.max(...sameCategory.map((rule) => rule.sort_order)) + 10 : 10;
    setBusy("add-rule");
    setMessage("");
    try {
      const response = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newRuleCategory, body, is_active: true, sort_order: nextOrder }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เพิ่มกฎไม่สำเร็จ");
      setRules((current) => [...current, data.rule]);
      setNewRuleBody("");
      setMessage("เพิ่มกฎใหม่แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เพิ่มกฎไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function removeRule(rule: SiteRule) {
    if (!window.confirm(`ลบกฎข้อนี้หรือไม่?\n\n${rule.body}`)) return;
    setBusy(`delete-rule-${rule.id}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ลบกฎไม่สำเร็จ");
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage("ลบกฎแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ลบกฎไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function moveRule(rule: SiteRule, direction: -1 | 1) {
    const categoryRules = sortedRules.filter((item) => item.category === rule.category);
    const index = categoryRules.findIndex((item) => item.id === rule.id);
    const swapWith = categoryRules[index + direction];
    if (!swapWith) return;

    const currentOrder = rule.sort_order;
    const targetOrder = swapWith.sort_order;
    const ruleOrder = currentOrder === targetOrder ? targetOrder + direction : targetOrder;
    const swapOrder = currentOrder === targetOrder ? currentOrder - direction : currentOrder;

    setBusy(`move-rule-${rule.id}`);
    setMessage("");
    try {
      const updateOne = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, sort_order: ruleOrder }),
      });
      if (!updateOne.ok) throw new Error((await updateOne.json()).error || "จัดลำดับไม่สำเร็จ");

      const updateTwo = await fetch("/api/admin/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: swapWith.id, sort_order: swapOrder }),
      });
      if (!updateTwo.ok) throw new Error((await updateTwo.json()).error || "จัดลำดับไม่สำเร็จ");
      await loadAll();
      setMessage("จัดลำดับกฎแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "จัดลำดับไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  function patchMachineLocal(machineNo: number, patch: Partial<Machine>) {
    setMachines((current) => current.map((machine) => (machine.machine_no === machineNo ? { ...machine, ...patch } : machine)));
  }

  async function toggleMaintenance(machine: Machine) {
    const nextMaintenance = !machine.is_maintenance;
    if (nextMaintenance && machine.status === "running") {
      const confirmed = window.confirm("เครื่องกำลังทำงานอยู่ การตั้งปิดปรับปรุงจะยกเลิกสถานะรอบปัจจุบัน ต้องการดำเนินการต่อหรือไม่?");
      if (!confirmed) return;
    }
    setBusy(`machine-${machine.machine_no}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/machines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineNo: machine.machine_no,
          is_maintenance: nextMaintenance,
          maintenance_note: machine.maintenance_note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "อัปเดตเครื่องไม่สำเร็จ");
      patchMachineLocal(machine.machine_no, data.machine);
      setMessage(nextMaintenance ? `ตั้งเครื่อง ${String(machine.machine_no).padStart(2, "0")} เป็นปิดปรับปรุงแล้ว` : `เปิดใช้งานเครื่อง ${String(machine.machine_no).padStart(2, "0")} แล้ว`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "อัปเดตเครื่องไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }


  async function saveMaintenanceNote(machine: Machine) {
    if (!machine.is_maintenance) return;
    setBusy(`machine-note-${machine.machine_no}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/machines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineNo: machine.machine_no,
          is_maintenance: true,
          maintenance_note: machine.maintenance_note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "บันทึกหมายเหตุไม่สำเร็จ");
      patchMachineLocal(machine.machine_no, data.machine);
      setMessage(`บันทึกหมายเหตุเครื่อง ${String(machine.machine_no).padStart(2, "0")} แล้ว`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกหมายเหตุไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setAnnouncement(null);
      setRules([]);
      setMachines([]);
      setBusy(null);
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
          <div className="adminBrand"><div className="logoMark"><img className="logoMarkIcon" src="/washer-mark.svg" alt="" aria-hidden="true" /></div><div><div className="eyebrow">CVP LAUNDRY</div><h1>Admin</h1></div></div>
          <p className="adminIntro">เข้าสู่ระบบเพื่อจัดการประกาศ กฎระเบียบ และสถานะปิดปรับปรุงของเครื่อง</p>
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
            <button className="adminPrimary" type="submit" disabled={busy !== null || !password}>
              {busy === "login" ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!announcement) {
    return (
      <main className="adminShell">
        <section className="adminCard">ยังไม่พบข้อมูล Admin กรุณารัน SQL migration สำหรับ v1.6 ก่อน</section>
      </main>
    );
  }

  return (
    <main className="adminShell adminWideShell">
      <section className="adminCard editorCard">
        <div className="adminTopbar">
          <div>
            <a className="adminBackLink" href="/">← กลับหน้าสถานะเครื่อง</a>
            <div className="eyebrow">CVP LAUNDRY ADMIN</div>
            <h1>จัดการร้าน</h1>
          </div>
          <button type="button" className="adminGhost" onClick={logout} disabled={busy !== null}>ออกจากระบบ</button>
        </div>

        <nav className="adminNav" aria-label="ส่วนจัดการ">
          <a href="#announcement">ประกาศ</a>
          <a href="#rules">กฎระเบียบ</a>
          <a href="#machines">ปิดปรับปรุงเครื่อง</a>
        </nav>

        {message && <div className={message.includes("ไม่") || message.includes("หมดอายุ") ? "adminError adminStickyMessage" : "adminSuccess adminStickyMessage"}>{message}</div>}

        <section className="adminSection" id="announcement">
          <div className="adminSectionHeading">
            <div><span>01</span><h2>ประกาศหน้าเว็บ</h2></div>
            <p>แก้ข้อความประกาศหลักที่ลูกค้าเห็นเหนือกฎระเบียบ</p>
          </div>

          <form onSubmit={saveAnnouncement} className="adminForm adminEditorForm">
            <label className="adminSwitchRow">
              <span>
                <strong>แสดงประกาศบนหน้าเว็บ</strong>
                <small>ปิดเพื่อซ่อนประกาศชั่วคราว โดยไม่ลบข้อความ</small>
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
                rows={5}
                maxLength={800}
                required
              />
              <small>{announcement.body.length}/800 ตัวอักษร</small>
            </label>

            <div className="adminPreviewBlock">
              <span className="adminPreviewLabel">ตัวอย่างบนหน้าลูกค้า</span>
              <div className={`announcementBox ${announcement.tone}`}>
                <span className="announcementIcon" aria-hidden="true">{announcement.tone === "maintenance" ? "🛠️" : announcement.tone === "warning" ? "⚠️" : "📢"}</span>
                <div><strong>{announcement.title || "หัวข้อประกาศ"}</strong><p>{announcement.body || "ข้อความประกาศ"}</p></div>
              </div>
            </div>

            <button className="adminPrimary" type="submit" disabled={busy !== null}>
              {busy === "announcement" ? "กำลังบันทึก…" : "บันทึกประกาศ"}
            </button>
          </form>
        </section>

        <section className="adminSection" id="rules">
          <div className="adminSectionHeading">
            <div><span>02</span><h2>กฎระเบียบ</h2></div>
            <p>แก้ เพิ่ม ลบ ซ่อน และจัดลำดับกฎได้จากหน้านี้</p>
          </div>

          <form className="adminAddRule" onSubmit={addRule}>
            <label>
              <span>หมวด</span>
              <select value={newRuleCategory} onChange={(event) => setNewRuleCategory(event.target.value as RuleCategory)}>
                {(Object.keys(categoryLabels) as RuleCategory[]).map((category) => <option value={category} key={category}>{categoryLabels[category]}</option>)}
              </select>
            </label>
            <label className="adminAddRuleText">
              <span>เพิ่มกฎใหม่</span>
              <textarea value={newRuleBody} onChange={(event) => setNewRuleBody(event.target.value)} rows={3} maxLength={500} placeholder="พิมพ์ข้อความกฎ…" />
            </label>
            <button className="adminPrimary" type="submit" disabled={busy !== null || !newRuleBody.trim()}>
              {busy === "add-rule" ? "กำลังเพิ่ม…" : "+ เพิ่มกฎ"}
            </button>
          </form>

          <div className="adminRulesList">
            {sortedRules.map((rule) => {
              const categoryRules = sortedRules.filter((item) => item.category === rule.category);
              const index = categoryRules.findIndex((item) => item.id === rule.id);
              return (
                <article className={`adminRuleCard ${rule.is_active ? "" : "inactive"}`} key={rule.id}>
                  <div className="adminRuleTop">
                    <div className="adminRuleMeta">
                      <span className="adminRuleId">#{rule.id}</span>
                      <select value={rule.category} onChange={(event) => patchRuleLocal(rule.id, { category: event.target.value as RuleCategory })}>
                        {(Object.keys(categoryLabels) as RuleCategory[]).map((category) => <option value={category} key={category}>{categoryLabels[category]}</option>)}
                      </select>
                    </div>
                    <label className="adminMiniSwitch">
                      <input type="checkbox" checked={rule.is_active} onChange={(event) => patchRuleLocal(rule.id, { is_active: event.target.checked })} />
                      <span>{rule.is_active ? "แสดง" : "ซ่อน"}</span>
                    </label>
                  </div>

                  <textarea value={rule.body} onChange={(event) => patchRuleLocal(rule.id, { body: event.target.value })} rows={3} maxLength={500} />

                  <div className="adminRuleActions">
                    <div className="adminOrderButtons">
                      <button type="button" className="adminGhost" disabled={busy !== null || index === 0} onClick={() => moveRule(rule, -1)}>↑ ขึ้น</button>
                      <button type="button" className="adminGhost" disabled={busy !== null || index === categoryRules.length - 1} onClick={() => moveRule(rule, 1)}>↓ ลง</button>
                    </div>
                    <button type="button" className="adminDanger" disabled={busy !== null} onClick={() => removeRule(rule)}>ลบ</button>
                    <button type="button" className="adminPrimary adminSmallPrimary" disabled={busy !== null || !rule.body.trim()} onClick={() => saveRule(rule)}>
                      {busy === `rule-${rule.id}` ? "กำลังบันทึก…" : "บันทึกข้อนี้"}
                    </button>
                  </div>
                </article>
              );
            })}
            {sortedRules.length === 0 && <div className="adminEmpty">ยังไม่มีกฎระเบียบ กด “เพิ่มกฎ” เพื่อสร้างข้อแรก</div>}
          </div>
        </section>

        <section className="adminSection" id="machines">
          <div className="adminSectionHeading">
            <div><span>03</span><h2>ปิดปรับปรุงเครื่อง</h2></div>
            <p>ลูกค้าจะเห็นสถานะ “ปิดปรับปรุง” และไม่สามารถเปิดแจ้งเตือนรอบใหม่ได้</p>
          </div>

          <div className="adminMachineGrid">
            {machines.map((machine) => (
              <article className={`adminMachineCard ${machine.is_maintenance ? "maintenance" : ""}`} key={machine.machine_no}>
                <div className="adminMachineHeader">
                  <div>
                    <span>{machineKind(machine)}</span>
                    <strong>{String(machine.machine_no).padStart(2, "0")}</strong>
                  </div>
                  <span className={`adminMachineState ${machine.is_maintenance ? "maintenance" : "active"}`}>
                    {machine.is_maintenance ? "ปิดปรับปรุง" : machine.status === "running" ? "กำลังทำงาน" : "เปิดใช้งาน"}
                  </span>
                </div>

                <label>
                  <span>หมายเหตุที่ลูกค้าเห็น</span>
                  <input
                    type="text"
                    value={machine.maintenance_note ?? ""}
                    onChange={(event) => patchMachineLocal(machine.machine_no, { maintenance_note: event.target.value })}
                    placeholder="เช่น รอช่างเข้าตรวจ / เปลี่ยนอะไหล่"
                    maxLength={200}
                  />
                </label>

                <div className="adminMachineActions">
                  {machine.is_maintenance && (
                    <button
                      type="button"
                      className="adminGhost adminMachineNoteSave"
                      onClick={() => saveMaintenanceNote(machine)}
                      disabled={busy !== null}
                    >
                      {busy === `machine-note-${machine.machine_no}` ? "กำลังบันทึก…" : "บันทึกหมายเหตุ"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={machine.is_maintenance ? "adminRestore" : "adminMaintenance"}
                    onClick={() => toggleMaintenance(machine)}
                    disabled={busy !== null}
                  >
                    {busy === `machine-${machine.machine_no}` ? "กำลังอัปเดต…" : machine.is_maintenance ? "✓ เปิดใช้งานเครื่องนี้" : "🛠 ปิดปรับปรุงเครื่องนี้"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
