import type { Metadata } from "next";
import AdminAnnouncement from "../../components/AdminAnnouncement";

export const metadata: Metadata = {
  title: "Admin | CVP Laundry",
  description: "จัดการประกาศหน้า CVP Laundry",
};

export default function AdminPage() {
  return <AdminAnnouncement />;
}
