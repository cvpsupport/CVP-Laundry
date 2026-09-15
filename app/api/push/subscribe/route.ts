import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, upsertPushSubscription } from "../../../../lib/supabase-rest";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });

  try {
    const body = await request.json();
    const subscription = body.subscription;
    const machineNos: number[] = Array.isArray(body.machineNos)
      ? Array.from(new Set<number>(body.machineNos
          .map((value: unknown) => Number(value))
          .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 4)))
      : [];

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Push subscription ไม่ถูกต้อง" }, { status: 400 });
    }

    await upsertPushSubscription(subscription, machineNos);
    return NextResponse.json({ ok: true, machineNos });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "บันทึกการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }
}
