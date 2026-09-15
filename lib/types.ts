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
  updated_at: string;
};
