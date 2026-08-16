import { z } from "zod";

const candidateNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*$/u;

export const guestLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your trainer email address.")
    .max(254, "Email address is too long.")
    .email("Enter a valid email address.")
    .transform((email) => email.toLowerCase()),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Full name must be 100 characters or fewer.")
    .regex(candidateNamePattern, "Enter a valid full name.")
    .transform((name) => name.replace(/\s+/g, " ")),
  hubId: z.uuid("Select a valid training center or hub."),
  regionId: z.uuid("Select a valid state or region."),
});

export type GuestLoginInput = z.infer<typeof guestLoginSchema>;
