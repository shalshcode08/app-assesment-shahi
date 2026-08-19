"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2Icon,
  LoaderCircleIcon,
  MailIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserRoundIcon,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { continueToExam } from "@/features/auth/actions/continue-to-exam";
import { INITIAL_LOGIN_STATE } from "@/features/auth/types";
import type { RegionOption } from "@/features/locations/types";
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

type LoginFormProps = React.ComponentProps<"div"> & {
  backendMessage?: string;
  backendReady: boolean;
  regions: RegionOption[];
};

export function LoginForm({
  backendMessage,
  backendReady,
  className,
  regions,
  ...props
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    continueToExam,
    INITIAL_LOGIN_STATE,
  );
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const availableHubs = useMemo(
    () =>
      regions.find((region) => region.id === selectedRegionId)?.hubs ?? [],
    [regions, selectedRegionId],
  );
  // Base UI renders the raw value in the trigger unless Select.Root is given an
  // items map, and the values here are ids rather than display names.
  const regionItems = useMemo(
    () => Object.fromEntries(regions.map((region) => [region.id, region.name])),
    [regions],
  );
  const hubItems = useMemo(
    () => Object.fromEntries(availableHubs.map((hub) => [hub.id, hub.name])),
    [availableHubs],
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="py-7">
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-36 overflow-hidden">
            <Image
              src="/assets/logo.png"
              alt="Shahi"
              width={80}
              height={60}
              className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground/90">
            Trainer Assessment Login
          </CardTitle>
          <CardDescription className="text-xs sm:whitespace-nowrap">
            Candidate portal. Enter your details and training location.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <form action={formAction}>
            <FieldGroup>
              <Field data-invalid={Boolean(state.errors?.fullName)}>
                <FieldLabel
                  htmlFor="full-name"
                  className="gap-1 text-xs font-semibold text-foreground/75"
                >
                  Candidate Full Name
                  <RequiredMark />
                </FieldLabel>
                <div className="relative">
                  <UserRoundIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/35"
                  />
                  <Input
                    id="full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    minLength={2}
                    maxLength={100}
                    required
                    aria-invalid={Boolean(state.errors?.fullName)}
                    aria-describedby={
                      state.errors?.fullName ? "full-name-error" : undefined
                    }
                    className="pl-8.5"
                  />
                </div>
                <FieldError id="full-name-error" errors={state.errors?.fullName?.map((message) => ({ message }))} />
              </Field>

              <Field data-invalid={Boolean(state.errors?.email)}>
                <FieldLabel
                  htmlFor="email"
                  className="gap-1 text-xs font-semibold text-foreground/75"
                >
                  Trainer Email Address
                  <RequiredMark />
                </FieldLabel>
                <div className="relative">
                  <MailIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/35"
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="m@example.com"
                    maxLength={254}
                    required
                    aria-invalid={Boolean(state.errors?.email)}
                    aria-describedby={
                      state.errors?.email ? "email-error" : undefined
                    }
                    className="pl-8.5"
                  />
                </div>
                <FieldError id="email-error" errors={state.errors?.email?.map((message) => ({ message }))} />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(state.errors?.regionId)}>
                  <FieldLabel
                    htmlFor="region"
                    className="gap-1 text-xs font-semibold text-foreground/75"
                  >
                    State / Region
                    <RequiredMark />
                  </FieldLabel>
                  <Select
                    name="regionId"
                    items={regionItems}
                    value={selectedRegionId}
                    onValueChange={(regionId) => {
                      setSelectedRegionId(regionId);
                      setSelectedHubId(null);
                    }}
                    required
                    disabled={!backendReady || isPending}
                  >
                    <SelectTrigger
                      id="region"
                      className="w-full"
                      aria-invalid={Boolean(state.errors?.regionId)}
                    >
                      <MapPinIcon
                        aria-hidden="true"
                        className="text-foreground/35"
                      />
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={state.errors?.regionId?.map((message) => ({ message }))} />
                </Field>

                <Field data-invalid={Boolean(state.errors?.hubId)}>
                  <FieldLabel
                    htmlFor="hub"
                    className="gap-1 text-xs font-semibold text-foreground/75"
                  >
                    Training Center / Hub
                    <RequiredMark />
                  </FieldLabel>
                  <Select
                    name="hubId"
                    items={hubItems}
                    value={selectedHubId}
                    onValueChange={setSelectedHubId}
                    required
                    disabled={
                      !backendReady || !selectedRegionId || isPending
                    }
                  >
                    <SelectTrigger
                      id="hub"
                      className="w-full"
                      aria-invalid={Boolean(state.errors?.hubId)}
                    >
                      <Building2Icon
                        aria-hidden="true"
                        className="text-foreground/35"
                      />
                      <SelectValue placeholder="Select hub" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {availableHubs.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id}>
                            {hub.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={state.errors?.hubId?.map((message) => ({ message }))} />
                </Field>
              </div>

              {state.message || backendMessage ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-center text-xs leading-5 text-destructive"
                >
                  {state.message ?? backendMessage}
                </p>
              ) : null}

              <Field>
                <Button
                  type="submit"
                  className="h-10"
                  disabled={!backendReady || isPending}
                >
                  {isPending ? (
                    <>
                      <LoaderCircleIcon
                        aria-hidden="true"
                        className="animate-spin"
                      />
                      Preparing assessment
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                <FieldDescription className="pt-2 text-center text-xs text-muted-foreground/80">
                  Login to take your assessment
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Managing this assessment?{" "}
        <Link
          href="/login/admin"
          className="inline-flex items-center gap-1 font-medium text-foreground/80 underline underline-offset-4 hover:text-foreground"
        >
          <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
          Login as admin
        </Link>
      </p>
    </div>
  );
}
