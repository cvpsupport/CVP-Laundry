import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Web Push ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
