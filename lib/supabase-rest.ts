import type { Announcement, Machine, RuleCategory, SiteRule } from "./types";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && serviceRoleKey);
}

function headers(extra?: Record<string, string>) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return {
    apikey: serviceRoleKey,
    ...(serviceRoleKey.startsWith("eyJ") ? { Authorization: `Bearer ${serviceRoleKey}` } : {}),
    "Content-Type": "application/json",
    ...extra,
  };
}

const machineSelect = "machine_no,name,machine_type,price_baht,status,program,started_at,end_at,is_maintenance,maintenance_note,updated_at";

export async function getMachines(): Promise<Machine[]> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(
    `${url}/rest/v1/machines?select=${machineSelect}&order=machine_no.asc`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function getMachine(machineNo: number): Promise<Machine | null> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(
    `${url}/rest/v1/machines?select=${machineSelect}&machine_no=eq.${machineNo}&limit=1`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function updateMachine(machineNo: number, patch: Record<string, unknown>) {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/machines?machine_no=eq.${machineNo}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase update failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function setMachineMaintenance(machineNo: number, isMaintenance: boolean, note: string | null): Promise<Machine> {
  const patch: Record<string, unknown> = {
    is_maintenance: isMaintenance,
    maintenance_note: isMaintenance ? note : null,
    status: "available",
    program: null,
    started_at: null,
    end_at: null,
    near_finish_notified_at: null,
    finish_notified_at: null,
  };
  const rows = await updateMachine(machineNo, patch);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Machine row not found");
  return rows[0];
}

export async function markNotificationOnce(machineNo: number, kind: "near_finish" | "finished") {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const column = kind === "near_finish" ? "near_finish_notified_at" : "finish_notified_at";
  const response = await fetch(
    `${url}/rest/v1/machines?machine_no=eq.${machineNo}&${column}=is.null`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ [column]: new Date().toISOString(), updated_at: new Date().toISOString() }),
      cache: "no-store",
    }
  );
  if (!response.ok) throw new Error(`Notification mark failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

type StoredPush = {
  endpoint: string;
  subscription: webpush.PushSubscription;
  machine_nos: number[];
};

// Structural type only; avoids importing web-push into client bundles.
namespace webpush {
  export type PushSubscription = {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
}

export async function upsertPushSubscription(subscription: webpush.PushSubscription, machineNos: number[]) {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      subscription,
      machine_nos: machineNos,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Push subscription upsert failed: ${response.status} ${await response.text()}`);
}

export async function getPushSubscriptionsForMachine(machineNo: number): Promise<StoredPush[]> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const filter = encodeURIComponent(`{${machineNo}}`);
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=endpoint,subscription,machine_nos&machine_nos=cs.${filter}`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Push subscription read failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function deletePushSubscription(endpoint: string) {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Push subscription delete failed: ${response.status} ${await response.text()}`);
}

export async function getAnnouncement(): Promise<Announcement | null> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(
    `${url}/rest/v1/site_announcements?select=id,title,body,tone,is_active,updated_at&id=eq.1&limit=1`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Announcement read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function updateAnnouncement(patch: Pick<Announcement, "title" | "body" | "tone" | "is_active">): Promise<Announcement> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/site_announcements?id=eq.1`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Announcement update failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Announcement row not found");
  return rows[0];
}

export async function getRules(): Promise<SiteRule[]> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(
    `${url}/rest/v1/site_rules?select=id,category,body,is_active,sort_order,updated_at&order=category.asc,sort_order.asc,id.asc`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Rules read failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function createRule(input: { category: RuleCategory; body: string; is_active: boolean; sort_order?: number }): Promise<SiteRule> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/site_rules`, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({
      category: input.category,
      body: input.body,
      is_active: input.is_active,
      sort_order: input.sort_order ?? 100,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Rule create failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Rule create returned no row");
  return rows[0];
}

export async function updateRule(id: number, patch: Partial<Pick<SiteRule, "category" | "body" | "is_active" | "sort_order">>): Promise<SiteRule> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/site_rules?id=eq.${id}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Rule update failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Rule row not found");
  return rows[0];
}

export async function deleteRule(id: number): Promise<void> {
  if (!url) throw new Error("SUPABASE_URL is not configured");
  const response = await fetch(`${url}/rest/v1/site_rules?id=eq.${id}`, {
    method: "DELETE",
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Rule delete failed: ${response.status} ${await response.text()}`);
}
