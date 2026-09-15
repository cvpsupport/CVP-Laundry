import { NextRequest, NextResponse } from "next/server";
import type { RuleCategory, SiteRule } from "../../../../lib/types";
import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { createRule, deleteRule, getRules, isSupabaseConfigured, updateRule } from "../../../../lib/supabase-rest";

const categories = new Set<RuleCategory>(["general", "dryer"]);

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    return NextResponse.json({ rules: await getRules() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "โหลดกฎระเบียบไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    const body = await request.json();
    const category = String(body.category ?? "general") as RuleCategory;
    const text = String(body.body ?? "").trim().slice(0, 500);
    const isActive = body.is_active !== false;
    const sortOrder = Math.max(0, Math.min(10000, Number(body.sort_order ?? 100)));
    if (!categories.has(category)) return NextResponse.json({ error: "หมวดกฎไม่ถูกต้อง" }, { status: 400 });
    if (!text) return NextResponse.json({ error: "กรุณาใส่ข้อความกฎ" }, { status: 400 });
    const rule = await createRule({ category, body: text, is_active: isActive, sort_order: sortOrder });
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "เพิ่มกฎไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    const body = await request.json();
    const id = parseId(body.id);
    if (!id) return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });

    const patch: Partial<Pick<SiteRule, "category" | "body" | "is_active" | "sort_order">> = {};
    if (body.body !== undefined) {
      const text = String(body.body).trim().slice(0, 500);
      if (!text) return NextResponse.json({ error: "ข้อความกฎห้ามว่าง" }, { status: 400 });
      patch.body = text;
    }
    if (body.category !== undefined) {
      const category = String(body.category) as RuleCategory;
      if (!categories.has(category)) return NextResponse.json({ error: "หมวดกฎไม่ถูกต้อง" }, { status: 400 });
      patch.category = category;
    }
    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
    if (body.sort_order !== undefined) patch.sort_order = Math.max(0, Math.min(10000, Number(body.sort_order)));

    const rule = await updateRule(id, patch);
    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "บันทึกกฎไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  try {
    const body = await request.json();
    const id = parseId(body.id);
    if (!id) return NextResponse.json({ error: "id ไม่ถูกต้อง" }, { status: 400 });
    await deleteRule(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ลบกฎไม่สำเร็จ" }, { status: 500 });
  }
}
