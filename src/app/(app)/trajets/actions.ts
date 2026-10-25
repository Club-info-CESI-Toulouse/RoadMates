"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import {
  commuteSchema,
  daysSchema,
  directionSchema,
  slotValuesSchema,
  type CommuteInput,
  type SlotValues,
} from "@/lib/commutes/schema";
import {
  deleteMyCommute,
  deleteMySlot,
  saveMyCommute,
  saveMySlots,
  setMyCommuteActive,
} from "@/lib/commutes/server";

export type FormResult = { ok: true; id?: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> };
export type Schedule = { direction: "morning" | "evening"; days: number[]; values: SlotValues };

const idSchema = z.uuid();
const SIGNED_OUT: FormResult = { ok: false, error: "Session expirée, reconnecte-toi" };

function issues(error: z.ZodError): FormResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { ok: false, fieldErrors, error: "Corrige les champs signalés" };
}

const refresh = () => revalidatePath("/", "layout");

export async function saveCommuteAction(input: CommuteInput, id?: string): Promise<FormResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  if (id && !idSchema.safeParse(id).success) return { ok: false, error: "Trajet introuvable" };
  const parsed = commuteSchema.safeParse(input);
  if (!parsed.success) return issues(parsed.error);
  const result = await saveMyCommute(userId, parsed.data, id);
  if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.field ? { [result.field]: result.error } : undefined };
  refresh();
  return result;
}

/** Creates a commute and its week schedules in one go (creation screen). */
export async function createCommuteAction(input: CommuteInput, schedules: Schedule[]): Promise<FormResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  const parsed = commuteSchema.safeParse(input);
  if (!parsed.success) return issues(parsed.error);
  const checked = [];
  for (const s of schedules) {
    const direction = directionSchema.safeParse(s.direction);
    const days = daysSchema.safeParse(s.days);
    const values = slotValuesSchema.safeParse(s.values);
    if (!direction.success || !days.success) return { ok: false, error: "Choisis au moins un jour" };
    if (!values.success) return issues(values.error);
    checked.push({ direction: direction.data, days: days.data, values: values.data });
  }

  const created = await saveMyCommute(userId, parsed.data);
  if (!created.ok || !created.id) return { ok: false, error: created.ok ? undefined : created.error };
  for (const s of checked) {
    const result = await saveMySlots(userId, created.id, s.direction, s.days, s.values);
    if (!result.ok) {
      await deleteMyCommute(userId, created.id);
      return { ok: false, error: result.error, fieldErrors: result.field ? { [result.field]: result.error } : undefined };
    }
  }
  refresh();
  return { ok: true, id: created.id };
}

export async function saveSlotsAction(commuteId: string, schedule: Schedule): Promise<FormResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  const direction = directionSchema.safeParse(schedule.direction);
  const days = daysSchema.safeParse(schedule.days);
  const values = slotValuesSchema.safeParse(schedule.values);
  if (!idSchema.safeParse(commuteId).success || !direction.success) return { ok: false, error: "Trajet introuvable" };
  if (!days.success) return { ok: false, error: days.error.issues[0].message };
  if (!values.success) return issues(values.error);
  const result = await saveMySlots(userId, commuteId, direction.data, days.data, values.data);
  if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.field ? { [result.field]: result.error } : undefined };
  refresh();
  return { ok: true };
}

export async function deleteSlotAction(slotId: string) {
  const userId = await getUserId();
  if (!userId || !idSchema.safeParse(slotId).success) return;
  await deleteMySlot(userId, slotId);
  refresh();
}

export async function deleteCommuteAction(id: string) {
  const userId = await getUserId();
  if (!userId || !idSchema.safeParse(id).success) return;
  await deleteMyCommute(userId, id);
  refresh();
}

export async function toggleCommuteAction(id: string, isActive: boolean) {
  const userId = await getUserId();
  if (!userId || !idSchema.safeParse(id).success) return;
  await setMyCommuteActive(userId, id, isActive);
  refresh();
}
