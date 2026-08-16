import type { Metadata } from "next";

import { AdminLoginForm } from "@/features/auth/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Portal Login | Shahi",
  description: "Sign in to the Shahi trainer assessment admin portal.",
};

export default function AdminLoginPage() {
  return (
    <main className="flex w-full flex-1 items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <AdminLoginForm />
      </div>
    </main>
  );
}
