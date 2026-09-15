import { NextRequest, NextResponse } from "next/server";
import type { MachineStatus } from "../../../../lib/types";
import { getMachine, isSupabaseConfigured, markNotificationOnce, updateMachine } from "../../../../lib/supabase-rest";
import { sendMachinePush } from "../../../../lib/push";

const validStatuses = new Set<MachineStatus>(["available", "running", "finished", "offline"]);

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase ยังไม่ได้ตั้งค่า" }, { status: 503 });
  }

  const expectedKey = process.env.DEVICE_API_KEY;
  const providedKey = request.headers.get("x-device-key");
  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const machineNo = Number(body.machineNo);
    const event = body.event as "start" | "near_finish" | "finish" | "available" | "offline" | undefined;

    if (!Number.isInteger(machineNo) || machineNo < 1 || machineNo > 4) {
      return NextResponse.json({ error: "machineNo ต้องเป็น 1-4" }, { status: 400 });
    }

    const now = new Date();
    let patch: Record<string, unknown> = {};
    let pushResult: unknown = null;

    if (event === "start") {
      const machine = await getMachine(machineNo);
      if (machine?.is_maintenance) {
        return NextResponse.json({ error: "เครื่องนี้ถูกตั้งเป็นปิดปรับปรุงจาก Admin" }, { status: 409 });
      }
      const durationMinutes = Math.max(1, Math.min(180, Number(body.durationMinutes ?? 40)));
      patch = {
        status: "running",
        program: String(body.program ?? (machineNo === 4 ? "อบผ้า" : "ซักปกติ")).slice(0, 80),
        started_at: now.toISOString(),
        end_at: new Date(now.getTime() + durationMinutes * 60_000).toISOString(),
        near_finish_notified_at: null,
        finish_notified_at: null,
      };
    } else if (event === "near_finish") {
      const machine = await getMachine(machineNo);
      if (machine?.is_maintenance) {
        return NextResponse.json({ ok: true, event: "near_finish", ignored: true, reason: "maintenance", notified: false, push: null });
      }
      const shouldSend = await markNotificationOnce(machineNo, "near_finish");
      if (shouldSend) {
        const minutes = Math.max(1, Math.min(15, Number(body.minutesRemaining ?? 5)));
        pushResult = await sendMachinePush(machineNo, "near_finish", minutes);
      }
      return NextResponse.json({ ok: true, event: "near_finish", notified: shouldSend, push: pushResult });
    } else if (event === "finish") {
      const machine = await getMachine(machineNo);
      if (machine?.is_maintenance) {
        return NextResponse.json({ ok: true, event: "finish", ignored: true, reason: "maintenance", push: null });
      }
      patch = { status: "finished", end_at: now.toISOString() };
    } else if (event === "available") {
      patch = { status: "available", program: null, started_at: null, end_at: null };
    } else if (event === "offline") {
      patch = { status: "offline" };
    } else if (body.status && validStatuses.has(body.status)) {
      if (body.status === "running") {
        const machine = await getMachine(machineNo);
        if (machine?.is_maintenance) {
          return NextResponse.json({ error: "เครื่องนี้ถูกตั้งเป็นปิดปรับปรุงจาก Admin" }, { status: 409 });
        }
      }
      patch = {
        status: body.status,
        program: body.program ?? null,
        started_at: body.startedAt ?? null,
        end_at: body.endAt ?? null,
      };
    } else {
      return NextResponse.json({ error: "event ไม่ถูกต้อง" }, { status: 400 });
    }

    const result = await updateMachine(machineNo, patch);

    if (event === "finish") {
      const shouldSend = await markNotificationOnce(machineNo, "finished");
      if (shouldSend) pushResult = await sendMachinePush(machineNo, "finished");
    }

    return NextResponse.json({ ok: true, machine: result?.[0] ?? null, push: pushResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "อัปเดตสถานะไม่สำเร็จ" }, { status: 500 });
  }
}
