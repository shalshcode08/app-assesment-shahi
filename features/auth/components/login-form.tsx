import Image from "next/image";
import {
  Building2Icon,
  MailIcon,
  MapPinIcon,
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
import {
  HUB_OPTIONS,
  STATE_OPTIONS,
} from "@/features/auth/constants/login-options";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="py-7">
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-3 h-12 w-36 overflow-hidden">
            <Image
              src="/assets/logo.png"
              alt="Shahi"
              width={80}
              height={60}
              className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground/90">Trainer Assessment Login</CardTitle>
          <CardDescription className="whitespace-nowrap text-xs">
            Enter candidate details and select a training location.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel
                  htmlFor="full-name"
                  className="gap-1 text-xs font-medium text-foreground/75"
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
                    required
                    className="pl-8.5"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="email"
                  className="gap-1 text-xs font-medium text-foreground/75"
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
                    placeholder="m@example.com"
                    required
                    className="pl-8.5"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="state"
                    className="gap-1 text-xs font-medium text-foreground/75"
                  >
                    State / Region
                    <RequiredMark />
                  </FieldLabel>
                  <Select name="state" required>
                    <SelectTrigger id="state" className="w-full">
                      <MapPinIcon
                        aria-hidden="true"
                        className="text-foreground/35"
                      />
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {STATE_OPTIONS.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="hub"
                    className="gap-1 text-xs font-medium text-foreground/75"
                  >
                    Training Center / Hub
                    <RequiredMark />
                  </FieldLabel>
                  <Select name="hub" required>
                    <SelectTrigger id="hub" className="w-full">
                      <Building2Icon
                        aria-hidden="true"
                        className="text-foreground/35"
                      />
                      <SelectValue placeholder="Select hub"/>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {HUB_OPTIONS.map((hub) => (
                          <SelectItem key={hub.value} value={hub.value}>
                            {hub.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <Button type="submit" className="h-10">
                  Login
                </Button>
                <FieldDescription className="pt-2 text-center text-xs text-muted-foreground/80">
                  Login to take your assessment
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
