import { NextResponse } from "next/server";
import { getAnnouncement, isSupabaseConfigured } from "../../../lib/supabase-rest";

export const dynamic = "force-dynamic";

const demoAnnouncement = {
  id: 1,
  title: "ประกาศจากร้าน",
  body: "กรุณานำผ้าออกจากเครื่องเมื่อซักหรืออบเสร็จ เพื่อให้ผู้ใช้งานท่านถัดไปสามารถใช้บริการได้ต่อเนื่อง",
  tone: "info" as const,
  is_active: true,
  updated_at: new Date(0).toISOString(),
};

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ mode: "demo", announcement: demoAnnouncement });
    }

    const announcement = await getAnnouncement();
    return NextResponse.json({ mode: "live", announcement });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ไม่สามารถโหลดประกาศได้" }, { status: 500 });
  }
}
