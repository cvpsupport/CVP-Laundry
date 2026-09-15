import webpush from "web-push";
import { deletePushSubscription, getMachine, getPushSubscriptionsForMachine } from "./supabase-rest";

export type PushKind = "near_finish" | "finished";

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:owner@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendMachinePush(machineNo: number, kind: PushKind, minutes = 5) {
  if (!configureWebPush()) return { sent: 0, skipped: true };

  const [rows, machine] = await Promise.all([
    getPushSubscriptionsForMachine(machineNo),
    getMachine(machineNo),
  ]);
  const isDryer = machine?.machine_type === "dryer";
  const kindLabel = isDryer ? "เครื่องอบผ้า" : "เครื่องซักผ้า";
  const action = isDryer ? "อบ" : "ซัก";
  const title = kind === "near_finish"
    ? `${kindLabel} ${String(machineNo).padStart(2, "0")} ใกล้เสร็จแล้ว`
    : `${kindLabel} ${String(machineNo).padStart(2, "0")} ${action}เสร็จแล้ว`;
  const body = kind === "near_finish"
    ? `เหลือประมาณ ${minutes} นาที เตรียมกลับมารับผ้าได้เลย`
    : isDryer ? "อบเสร็จแล้ว นำผ้าออกจากเครื่องอบได้เลย" : "ซักเสร็จแล้ว กรุณานำผ้าออกจากเครื่อง";

  const payload = JSON.stringify({
    title,
    body,
    tag: `machine-${machineNo}-${kind}`,
    url: `/?machine=${machineNo}`,
  });

  let sent = 0;
  await Promise.all(rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, payload, { TTL: 300 });
      sent += 1;
    } catch (error: any) {
      const status = error?.statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscription(row.endpoint).catch(() => undefined);
      } else {
        console.error("Push failed", status, error?.message || error);
      }
    }
  }));

  return { sent, skipped: false };
}
