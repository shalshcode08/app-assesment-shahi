import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your admin email address.")
    .max(254, "Email address is too long.")
    .email("Enter a valid email address.")
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password is too long."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
