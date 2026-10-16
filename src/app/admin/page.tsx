import type { Metadata } from "next";
import AdminPortal from "@/components/admin/admin-portal";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin studio",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPortal />;
}
