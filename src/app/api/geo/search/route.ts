import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { latLonSchema, searchAddresses } from "@/lib/geo";

const querySchema = z.object({
  q: z.string().trim().min(3).max(200),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  if (!(await getUserId())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ places: [] });
  const near = latLonSchema.safeParse(parsed.data);

  try {
    const places = await searchAddresses(parsed.data.q, near.success ? near.data : undefined);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "geocoding_unavailable" }, { status: 502 });
  }
}
