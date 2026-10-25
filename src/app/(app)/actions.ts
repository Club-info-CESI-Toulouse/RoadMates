"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { acceptRequest, cancelRequest, sendRequest, type RequestResult } from "@/lib/requests/server";

const id = z.uuid();
const date = z.iso.date();
const SIGNED_OUT: RequestResult = { ok: false, error: "Session expirée, reconnecte-toi" };
const INVALID: RequestResult = { ok: false, error: "Demande invalide" };

function done(result: RequestResult) {
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/trajets");
    revalidatePath("/proposition", "layout");
  }
  return result;
}

export async function sendRequestAction(myTripId: string, otherTripId: string, day: string): Promise<RequestResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  if (!id.safeParse(myTripId).success || !id.safeParse(otherTripId).success || !date.safeParse(day).success)
    return INVALID;
  return done(await sendRequest(userId, myTripId, otherTripId, day));
}

export async function acceptRequestAction(requestId: string): Promise<RequestResult> {
  if (!(await getUserId())) return SIGNED_OUT;
  if (!id.safeParse(requestId).success) return INVALID;
  return done(await acceptRequest(requestId));
}

export async function cancelRequestAction(requestId: string): Promise<RequestResult> {
  if (!(await getUserId())) return SIGNED_OUT;
  if (!id.safeParse(requestId).success) return INVALID;
  return done(await cancelRequest(requestId));
}
