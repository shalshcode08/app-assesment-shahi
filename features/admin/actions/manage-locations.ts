"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callAdminRpc } from "@/features/admin/actions/admin-rpc";
import type { AdminActionState } from "@/features/admin/types";

const SETTINGS_PATH = "/admin/settings";

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
  .transform((value) => value === "on" || value === "true");

const regionSchema = z.object({
  isActive: checkbox,
  name: z.string().trim().min(1, "Enter a state name.").max(120),
  regionId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
});

const hubSchema = regionSchema.extend({
  hubId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  name: z.string().trim().min(1, "Enter a centre name.").max(120),
  regionId: z.uuid("Pick the state this centre belongs to."),
});

function invalid(error: z.ZodError): AdminActionState {
  return {
    errors: error.flatten().fieldErrors as Record<string, string[]>,
    message: "Check the highlighted fields and try again.",
    status: "error",
  };
}

export async function saveRegion(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const fields = regionSchema.safeParse({
    isActive: formData.get("isActive"),
    name: formData.get("name"),
    regionId: formData.get("regionId") ?? "",
  });

  if (!fields.success) {
    return invalid(fields.error);
  }

  const outcome = await callAdminRpc("save_admin_region", {
    p_is_active: fields.data.isActive,
    p_name: fields.data.name,
    p_region_id: fields.data.regionId,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return {
    message: fields.data.regionId ? "State updated." : "State added.",
    status: "success",
  };
}

export async function deleteRegion(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const regionId = z.uuid().safeParse(formData.get("regionId"));

  if (!regionId.success) {
    return { message: "That state no longer exists.", status: "error" };
  }

  const outcome = await callAdminRpc("delete_admin_region", {
    p_region_id: regionId.data,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return { message: "State removed.", status: "success" };
}

export async function saveHub(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const fields = hubSchema.safeParse({
    hubId: formData.get("hubId") ?? "",
    isActive: formData.get("isActive"),
    name: formData.get("name"),
    regionId: formData.get("regionId"),
  });

  if (!fields.success) {
    return invalid(fields.error);
  }

  const outcome = await callAdminRpc("save_admin_hub", {
    p_hub_id: fields.data.hubId,
    p_is_active: fields.data.isActive,
    p_name: fields.data.name,
    p_region_id: fields.data.regionId,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return {
    message: fields.data.hubId ? "Centre updated." : "Centre added.",
    status: "success",
  };
}

export async function deleteHub(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const hubId = z.uuid().safeParse(formData.get("hubId"));

  if (!hubId.success) {
    return { message: "That centre no longer exists.", status: "error" };
  }

  const outcome = await callAdminRpc("delete_admin_hub", {
    p_hub_id: hubId.data,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return { message: "Centre removed.", status: "success" };
}
