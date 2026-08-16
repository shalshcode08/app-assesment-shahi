"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircleIcon, LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions/logout";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending}>
      {pending ? (
        <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
      ) : (
        <LogOutIcon aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {pending ? "Logging out" : "Logout"}
      </span>
      <span className="sr-only sm:hidden">Logout</span>
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}
