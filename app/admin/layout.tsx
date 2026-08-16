import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AdminShell } from "@/features/admin/components/admin-shell";
import { getAdminSession } from "@/features/admin/data/get-admin-session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  const session = await getAdminSession();

  if (!session) {
    redirect("/login/admin");
  }

  return (
    <AdminShell
      adminEmail={session.email}
      adminName={session.fullName ?? session.email}
    >
      {children}
    </AdminShell>
  );
}
