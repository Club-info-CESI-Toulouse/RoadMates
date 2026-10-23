import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { latLonSchema, reverseGeocode } from "@/lib/geo";

const querySchema = latLonSchema.extend({ lat: z.coerce.number(), lon: z.coerce.number() });

export async function GET(request: NextRequest) {
  if (!(await getUserId())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = querySchema.pipe(latLonSchema).safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    return NextResponse.json({ place: await reverseGeocode(parsed.data) });
  } catch {
    return NextResponse.json({ error: "geocoding_unavailable" }, { status: 502 });
  }
}
