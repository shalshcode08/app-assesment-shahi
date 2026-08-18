"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Building2Icon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteHub,
  deleteRegion,
  saveHub,
  saveRegion,
} from "@/features/admin/actions/manage-locations";
import {
  ActionMessage,
  Badge,
  ConfirmButton,
  DismissibleNote,
  SubmitButton,
} from "@/features/admin/components/settings-primitives";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";
import type { AdminHub, AdminRegion } from "@/features/admin/data/get-admin-locations";
import {
  INITIAL_ADMIN_ACTION_STATE,
  type AdminActionState,
} from "@/features/admin/types";

type Editing =
  | { kind: "none" }
  | { kind: "new-region" }
  | { kind: "region"; id: string }
  | { kind: "new-hub"; regionId: string }
  | { kind: "hub"; id: string };

function usageLabel(trainerCount: number, attemptCount: number) {
  if (trainerCount === 0 && attemptCount === 0) {
    return "No trainers yet";
  }

  return `${trainerCount} trainer${trainerCount === 1 ? "" : "s"} · ${attemptCount} attempt${
    attemptCount === 1 ? "" : "s"
  }`;
}

function NameForm({
  action,
  hiddenFields,
  isActive,
  label,
  name,
  onDone,
  submitLabel,
}: {
  action: typeof saveRegion;
  hiddenFields: Record<string, string>;
  isActive: boolean;
  label: string;
  name: string;
  onDone: () => void;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ADMIN_ACTION_STATE);

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [onDone, state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3"
    >
      {Object.entries(hiddenFields).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-invalid={Boolean(state.errors?.name)}
          aria-label={label}
          autoFocus
          className="h-9 w-full max-w-72"
          defaultValue={name}
          maxLength={120}
          name="name"
          placeholder={label}
          required
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            className="size-3.5 accent-primary"
            defaultChecked={isActive}
            name="isActive"
            type="checkbox"
          />
          Visible to trainers
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onDone} size="lg" type="button" variant="ghost">
            Cancel
          </Button>
          <SubmitButton pendingLabel="Saving" size="lg">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>

      <ActionMessage state={state} />
    </form>
  );
}

function DeleteForm({
  action,
  field,
  id,
  label,
}: {
  action: typeof deleteRegion;
  field: string;
  id: string;
  label: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ADMIN_ACTION_STATE);
  // Dismissal is remembered by identity: the next action returns a fresh state
  // object, so a new refusal shows itself without an effect resetting anything.
  const [dismissed, setDismissed] = useState<AdminActionState | null>(null);
  const isDismissed = dismissed === state;

  return (
    // A refusal is anchored under its own button instead of joining the row,
    // which would stretch the row and push the controls out of line.
    <form action={formAction} className="relative">
      <input name={field} type="hidden" value={id} />
      <ConfirmButton
        aria-label={label}
        confirmLabel="Delete?"
        size="icon-lg"
        variant="ghost"
      >
        <Trash2Icon aria-hidden="true" />
      </ConfirmButton>
      {state.status === "error" && !isDismissed ? (
        <DismissibleNote
          className="absolute top-full right-0 z-10 mt-1 w-60"
          onDismiss={() => setDismissed(state)}
        >
          {state.message}
        </DismissibleNote>
      ) : null}
    </form>
  );
}

function HubRow({
  editing,
  hub,
  setEditing,
}: {
  editing: Editing;
  hub: AdminHub & { regionId: string };
  setEditing: (editing: Editing) => void;
}) {
  if (editing.kind === "hub" && editing.id === hub.id) {
    return (
      <li>
        <NameForm
          action={saveHub}
          hiddenFields={{ hubId: hub.id, regionId: hub.regionId }}
          isActive={hub.isActive}
          label="Centre name"
          name={hub.name}
          onDone={() => setEditing({ kind: "none" })}
          submitLabel="Save centre"
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
      <Building2Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-teal-700/80 dark:text-teal-400/80"
      />
      <span className="text-sm text-foreground">{hub.name}</span>
      {hub.isActive ? null : <Badge tone="amber">Hidden</Badge>}
      <span className="text-xs text-muted-foreground tabular-nums">
        {usageLabel(hub.trainerCount, hub.attemptCount)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          aria-label={`Edit ${hub.name}`}
          onClick={() => setEditing({ id: hub.id, kind: "hub" })}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <PencilIcon aria-hidden="true" />
        </Button>
        <DeleteForm
          action={deleteHub}
          field="hubId"
          id={hub.id}
          label={`Delete ${hub.name}`}
        />
      </div>
    </li>
  );
}

function RegionCard({
  editing,
  region,
  setEditing,
}: {
  editing: Editing;
  region: AdminRegion;
  setEditing: (editing: Editing) => void;
}) {
  const isEditingRegion = editing.kind === "region" && editing.id === region.id;

  return (
    <section className={`${SURFACE} p-4`}>
      {isEditingRegion ? (
        <NameForm
          action={saveRegion}
          hiddenFields={{ regionId: region.id }}
          isActive={region.isActive}
          label="State name"
          name={region.name}
          onDone={() => setEditing({ kind: "none" })}
          submitLabel="Save state"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <MapPinIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-green-600/80 dark:text-green-400/80"
          />
          <h3 className="text-sm font-medium text-foreground">{region.name}</h3>
          {region.isActive ? null : <Badge tone="amber">Hidden</Badge>}
          <Badge>
            {region.hubs.length} centre{region.hubs.length === 1 ? "" : "s"}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <UsersIcon aria-hidden="true" className="size-3.5" />
            {usageLabel(region.trainerCount, region.attemptCount)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              onClick={() => setEditing({ kind: "new-hub", regionId: region.id })}
              size="lg"
              type="button"
              variant="outline"
            >
              <PlusIcon aria-hidden="true" />
              Centre
            </Button>
            <Button
              aria-label={`Edit ${region.name}`}
              onClick={() => setEditing({ id: region.id, kind: "region" })}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <PencilIcon aria-hidden="true" />
            </Button>
            <DeleteForm
              action={deleteRegion}
              field="regionId"
              id={region.id}
              label={`Delete ${region.name}`}
            />
          </div>
        </div>
      )}

      <ul className="mt-2 flex flex-col gap-1 border-t border-border/50 pt-2">
        {region.hubs.length === 0 &&
        !(editing.kind === "new-hub" && editing.regionId === region.id) ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">
            No centres yet. Trainers can only pick a state once it has at least
            one centre.
          </li>
        ) : null}

        {region.hubs.map((hub) => (
          <HubRow
            editing={editing}
            hub={{ ...hub, regionId: region.id }}
            key={hub.id}
            setEditing={setEditing}
          />
        ))}

        {editing.kind === "new-hub" && editing.regionId === region.id ? (
          <li>
            <NameForm
              action={saveHub}
              hiddenFields={{ hubId: "", regionId: region.id }}
              isActive
              label="Centre name"
              name=""
              onDone={() => setEditing({ kind: "none" })}
              submitLabel="Add centre"
            />
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export function LocationsManager({ regions }: { regions: AdminRegion[] }) {
  const [editing, setEditing] = useState<Editing>({ kind: "none" });
  const centreCount = regions.reduce(
    (total, region) => total + region.hubs.length,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className={`${SURFACE} flex flex-wrap items-center gap-3 p-4`}>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPinIcon
              aria-hidden="true"
              className="size-4 text-green-600 dark:text-green-400"
            />
            States and training centres
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {regions.length} state{regions.length === 1 ? "" : "s"} ·{" "}
            {centreCount} centre{centreCount === 1 ? "" : "s"}. The options a
            trainer picks from on the login screen.
          </p>
        </div>
        <Button
          className="ml-auto"
          onClick={() => setEditing({ kind: "new-region" })}
          size="lg"
          type="button"
        >
          <PlusIcon aria-hidden="true" />
          Add state
        </Button>
      </div>

      {editing.kind === "new-region" ? (
        <NameForm
          action={saveRegion}
          hiddenFields={{ regionId: "" }}
          isActive
          label="State name"
          name=""
          onDone={() => setEditing({ kind: "none" })}
          submitLabel="Add state"
        />
      ) : null}

      {regions.length === 0 ? (
        <p className={`${SURFACE} p-6 text-center text-sm text-muted-foreground`}>
          No states yet. Add the first one to open the login screen for trainers.
        </p>
      ) : null}

      {regions.map((region) => (
        <RegionCard
          editing={editing}
          key={region.id}
          region={region}
          setEditing={setEditing}
        />
      ))}
    </div>
  );
}
