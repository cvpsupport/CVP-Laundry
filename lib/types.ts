export type MachineStatus = "available" | "running" | "finished" | "offline";
export type MachineType = "washer" | "dryer";

export type Machine = {
  machine_no: number;
  name: string;
  machine_type: MachineType;
  price_baht: number | null;
  status: MachineStatus;
  program: string | null;
  started_at: string | null;
  end_at: string | null;
  is_maintenance: boolean;
  maintenance_note: string | null;
  updated_at: string;
};

export type AnnouncementTone = "info" | "warning" | "maintenance";

export type Announcement = {
  id: number;
  title: string;
  body: string;
  tone: AnnouncementTone;
  is_active: boolean;
  updated_at: string;
};

export type RuleCategory = "general" | "dryer";

export type SiteRule = {
  id: number;
  category: RuleCategory;
  body: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};
