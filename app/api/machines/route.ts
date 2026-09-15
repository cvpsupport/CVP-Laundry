import { NextResponse } from "next/server";
import { getDemoMachines } from "../../../lib/demo";
import { getMachines, isSupabaseConfigured } from "../../../lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ mode: "demo", machines: getDemoMachines() });
    }

    const machines = await getMachines();
    return NextResponse.json({ mode: "live", machines });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { mode: "error", error: "ไม่สามารถโหลดสถานะเครื่องได้" },
      { status: 500 }
    );
  }
}
