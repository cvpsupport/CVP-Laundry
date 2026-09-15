import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSessionToken, isAdminConfigured, validateAdminPassword } from "../../../../lib/admin-auth";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD บนเซิร์ฟเวอร์" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const password = String(body.password ?? "");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const token = getAdminSessionToken();
    if (!token) return NextResponse.json({ error: "Admin ยังไม่ได้ตั้งค่า" }, { status: 503 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "เข้าสู่ระบบไม่สำเร็จ" }, { status: 500 });
  }
}
