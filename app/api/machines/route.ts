import { NextResponse } from "next/server";
import { getDemoMachines } from "../../../lib/demo";
import { getMachines, isSupabaseConfigured, updateMachine } from "../../../lib/supabase-rest";
import type { Machine } from "../../../lib/types";

export const dynamic = "force-dynamic";

// Keep the "finished" state visible long enough for the customer to notice it,
// then return the machine to "available" automatically. This also makes the
// dashboard recover even when an ESP32 "available" event is missed.
const FINISHED_HOLD_MS = 10 * 60 * 1000;

async function autoReleaseFinishedMachines(machines: Machine[]) {
  const now = Date.now();
  const expired = machines.filter((machine) => {
    if (machine.is_maintenance || machine.status !== "finished") return false;
    const finishedAt = machine.end_at || machine.updated_at;
    if (!finishedAt) return false;
    const finishedMs = new Date(finishedAt).getTime();
    return Number.isFinite(finishedMs) && now - finishedMs >= FINISHED_HOLD_MS;
  });

  if (expired.length === 0) return machines;

  await Promise.all(
    expired.map((machine) =>
      updateMachine(machine.machine_no, {
        status: "available",
        program: null,
        started_at: null,
        end_at: null,
        near_finish_notified_at: null,
        finish_notified_at: null,
      })
    )
  );

  return getMachines();
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ mode: "demo", machines: getDemoMachines() });
    }

    const machines = await autoReleaseFinishedMachines(await getMachines());
    return NextResponse.json({ mode: "live", machines });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { mode: "error", error: "ไม่สามารถโหลดสถานะเครื่องได้" },
      { status: 500 }
    );
  }
}
