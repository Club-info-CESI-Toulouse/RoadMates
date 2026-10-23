import { BRAND_ICON_SVG } from "./brand-svg";

const SRC = `data:image/svg+xml;base64,${Buffer.from(BRAND_ICON_SVG).toString("base64")}`;

// App icon artwork (docs/logo_roadmates), rendered to PNG by next/og.
// The artwork already keeps the safe zone required by maskable icons.
export function BrandIcon({ size }: { size: number; padding?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SRC} width={size} height={size} alt="" />;
}
