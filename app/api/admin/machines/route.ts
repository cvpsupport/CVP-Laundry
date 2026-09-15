import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { getMachines, isSupabaseConfigured, setMachineMaintenance } from "../../../../lib/supabase-rest";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    return NextResponse.json({ machines: await getMachines() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "โหลดข้อมูลเครื่องไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    const body = await request.json();
    const machineNo = Number(body.machineNo);
    if (!Number.isInteger(machineNo) || machineNo < 1 || machineNo > 4) {
      return NextResponse.json({ error: "machineNo ต้องเป็น 1-4" }, { status: 400 });
    }
    const isMaintenance = Boolean(body.is_maintenance);
    const noteText = String(body.maintenance_note ?? "").trim().slice(0, 200);
    const note = isMaintenance ? (noteText || "ปิดปรับปรุงชั่วคราว") : null;
    const machine = await setMachineMaintenance(machineNo, isMaintenance, note);
    return NextResponse.json({ ok: true, machine });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "อัปเดตสถานะปิดปรับปรุงไม่สำเร็จ" }, { status: 500 });
  }
}
