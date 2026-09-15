import type { Machine } from "./types";

export function getDemoMachines(): Machine[] {
  const now = Date.now();
  const minute = 60_000;
  const base = Math.floor(now / (40 * minute)) * 40 * minute;

  return [
    {
      machine_no: 1,
      name: "เครื่อง 01",
      machine_type: "washer",
      price_baht: 50,
      status: "running",
      program: "ซักปกติ",
      started_at: new Date(base + 8 * minute).toISOString(),
      end_at: new Date(base + 38 * minute).toISOString(),
      is_maintenance: false,
      maintenance_note: null,
      updated_at: new Date(now).toISOString(),
    },
    {
      machine_no: 2,
      name: "เครื่อง 02",
      machine_type: "washer",
      price_baht: 40,
      status: "available",
      program: null,
      started_at: null,
      end_at: null,
      is_maintenance: false,
      maintenance_note: null,
      updated_at: new Date(now).toISOString(),
    },
    {
      machine_no: 3,
      name: "เครื่อง 03",
      machine_type: "washer",
      price_baht: 30,
      status: "running",
      program: "ซักด่วน",
      started_at: new Date(now - 20 * minute).toISOString(),
      end_at: new Date(now + 4 * minute).toISOString(),
      is_maintenance: false,
      maintenance_note: null,
      updated_at: new Date(now).toISOString(),
    },
    {
      machine_no: 4,
      name: "เครื่อง 04",
      machine_type: "dryer",
      price_baht: 40,
      status: "finished",
      program: "อบผ้า",
      started_at: new Date(now - 48 * minute).toISOString(),
      end_at: new Date(now - 8 * minute).toISOString(),
      is_maintenance: false,
      maintenance_note: null,
      updated_at: new Date(now).toISOString(),
    },
  ];
}
