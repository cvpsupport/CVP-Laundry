import { NextRequest, NextResponse } from "next/server";
import type { AnnouncementTone } from "../../../../lib/types";
import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { getAnnouncement, isSupabaseConfigured, updateAnnouncement } from "../../../../lib/supabase-rest";

const tones = new Set<AnnouncementTone>(["info", "warning", "maintenance"]);

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
    const announcement = await getAnnouncement();
    return NextResponse.json({ announcement });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "โหลดประกาศไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim().slice(0, 80);
    const message = String(body.body ?? "").trim().slice(0, 800);
    const tone = String(body.tone ?? "info") as AnnouncementTone;
    const isActive = Boolean(body.is_active);

    if (!title) return NextResponse.json({ error: "กรุณาใส่หัวข้อประกาศ" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "กรุณาใส่ข้อความประกาศ" }, { status: 400 });
    if (!tones.has(tone)) return NextResponse.json({ error: "รูปแบบประกาศไม่ถูกต้อง" }, { status: 400 });

    const announcement = await updateAnnouncement({
      title,
      body: message,
      tone,
      is_active: isActive,
    });
    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "บันทึกประกาศไม่สำเร็จ" }, { status: 500 });
  }
}
