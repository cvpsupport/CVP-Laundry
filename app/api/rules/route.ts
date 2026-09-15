import { NextResponse } from "next/server";
import { getRules, isSupabaseConfigured } from "../../../lib/supabase-rest";

export const dynamic = "force-dynamic";

const demoRules = [
  { id: 1, category: "general", body: "ตรวจสอบกระเป๋าเสื้อและกางเกง นำเหรียญ กุญแจ กระดาษ และสิ่งของออกก่อนใส่เครื่อง", is_active: true, sort_order: 10, updated_at: new Date(0).toISOString() },
  { id: 2, category: "general", body: "ห้ามซักหรืออบผ้าที่เปื้อนน้ำมัน เชื้อเพลิง สารไวไฟ หรือสารเคมีอันตราย", is_active: true, sort_order: 20, updated_at: new Date(0).toISOString() },
  { id: 3, category: "dryer", body: "ตรวจสอบฉลากการดูแลผ้าก่อนอบ และหลีกเลี่ยงวัสดุที่ละลายหรือเสียรูปจากความร้อน", is_active: true, sort_order: 10, updated_at: new Date(0).toISOString() },
] as const;

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ mode: "demo", rules: demoRules });
    }
    const rules = await getRules();
    return NextResponse.json({ mode: "live", rules });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ไม่สามารถโหลดกฎระเบียบได้" }, { status: 500 });
  }
}
