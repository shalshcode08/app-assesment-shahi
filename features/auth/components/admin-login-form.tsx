"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/features/auth/actions/admin-login";
import { INITIAL_ADMIN_LOGIN_STATE } from "@/features/auth/types";
import { cn } from "@/lib/utils";

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export function AdminLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction, isPending] = useActionState(
    adminLogin,
    INITIAL_ADMIN_LOGIN_STATE,
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="py-7">
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-36 overflow-hidden">
            <Image
              src="/assets/logo.png"
              alt="Shahi"
              width={100}
              height={80}
              className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <div className="mx-auto mb-1.5 flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[0.7rem] font-medium tracking-wide text-foreground/70 uppercase">
            <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
            Admin portal
          </div>
          <CardTitle className="text-lg font-semibold text-foreground/90">
            Admin Portal Login
          </CardTitle>
          <CardDescription className="text-xs sm:whitespace-nowrap">
            Restricted access. Sign in with your administrator credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <form action={formAction}>
            <FieldGroup>
              <Field data-invalid={Boolean(state.errors?.email)}>
                <FieldLabel
                  htmlFor="admin-email"
                  className="gap-1 text-xs font-semibold text-foreground/75"
                >
                  Admin Email Address
                  <RequiredMark />
                </FieldLabel>
                <div className="relative">
                  <MailIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/35"
                  />
                  <Input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="admin@shahi.co.in"
                    maxLength={254}
                    required
                    aria-invalid={Boolean(state.errors?.email)}
                    aria-describedby={
                      state.errors?.email ? "admin-email-error" : undefined
                    }
                    className="pl-8.5"
                  />
                </div>
                <FieldError
                  id="admin-email-error"
                  errors={state.errors?.email?.map((message) => ({ message }))}
                />
              </Field>

              <Field data-invalid={Boolean(state.errors?.password)}>
                <FieldLabel
                  htmlFor="admin-password"
                  className="gap-1 text-xs font-semibold text-foreground/75"
                >
                  Password
                  <RequiredMark />
                </FieldLabel>
                <div className="relative">
                  <LockIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/35"
                  />
                  <Input
                    id="admin-password"
                    name="password"
                    type={isPasswordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    maxLength={128}
                    required
                    aria-invalid={Boolean(state.errors?.password)}
                    aria-describedby={
                      state.errors?.password ? "admin-password-error" : undefined
                    }
                    className="pl-8.5 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    aria-pressed={isPasswordVisible}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-foreground/40 transition-colors hover:text-foreground/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {isPasswordVisible ? (
                      <EyeOffIcon aria-hidden="true" className="size-4" />
                    ) : (
                      <EyeIcon aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
                <FieldError
                  id="admin-password-error"
                  errors={state.errors?.password?.map((message) => ({
                    message,
                  }))}
                />
              </Field>

              {state.message ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-center text-xs leading-5 text-destructive"
                >
                  {state.message}
                </p>
              ) : null}

              <Field>
                <Button type="submit" className="h-10" disabled={isPending}>
                  {isPending ? (
                    <>
                      <LoaderCircleIcon
                        aria-hidden="true"
                        className="animate-spin"
                      />
                      Signing in
                    </>
                  ) : (
                    "Login to admin portal"
                  )}
                </Button>
                <FieldDescription className="pt-2 text-center text-xs text-muted-foreground/80">
                  Authorised administrators only
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Taking the assessment?{" "}
        <Link
          href="/"
          className="font-medium text-foreground/80 underline underline-offset-4 hover:text-foreground"
        >
          Candidate login
        </Link>
      </p>
    </div>
  );
}
