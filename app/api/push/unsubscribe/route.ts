import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription, isSupabaseConfigured } from "../../../../lib/supabase-rest";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });

  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ยกเลิกการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }
}
