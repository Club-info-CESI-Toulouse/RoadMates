import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

export const contentType = "image/png";

const VARIANTS = {
  "32": { size: 32, padding: 0 },
  "192": { size: 192, padding: 0 },
  "512": { size: 512, padding: 0 },
  maskable: { size: 512, padding: 80 },
} as const;

export function generateImageMetadata() {
  return Object.entries(VARIANTS).map(([id, { size }]) => ({
    id,
    size: { width: size, height: size },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const { size, padding } = VARIANTS[(await id) as keyof typeof VARIANTS] ?? VARIANTS["192"];
  return new ImageResponse(<BrandIcon size={size} padding={padding} />, {
    width: size,
    height: size,
  });
}
