"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircleIcon, LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminLogout } from "@/features/auth/actions/admin-logout";

function SubmitButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      size="lg"
      disabled={pending}
      className={className}
    >
      {pending ? (
        <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
      ) : (
        <LogOutIcon aria-hidden="true" />
      )}
      {pending ? "Logging out" : "Logout"}
    </Button>
  );
}

export function AdminLogoutButton({ className }: { className?: string }) {
  return (
    <form action={adminLogout} className={className}>
      <SubmitButton className={className} />
    </form>
  );
}
