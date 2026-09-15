import type { Metadata } from "next";
import AdminAnnouncement from "../../components/AdminAnnouncement";

export const metadata: Metadata = {
  title: "Admin | CVP Laundry",
  description: "จัดการประกาศ กฎระเบียบ และสถานะปิดปรับปรุงของ CVP Laundry",
};

export default function AdminPage() {
  return <AdminAnnouncement />;
}
