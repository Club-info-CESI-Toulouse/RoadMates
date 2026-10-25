import type { AddressIcon } from "@/lib/addresses/constants";

const GLYPHS: Record<AddressIcon, React.ReactNode> = {
  home: <path d="M12 6.5 7.5 10.2V15h3v-3h3v3h3v-4.8Z" />,
  work: (
    <>
      <path d="M10 8V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7" y="8.5" width="10" height="6.5" rx="1.2" />
    </>
  ),
  star: <path d="m12 6 1.8 3.7 4 .6-2.9 2.8.7 4L12 15.2 8.4 17l.7-4-2.9-2.8 4-.6Z" />,
};

// Map-pin shaped icon for a named address (brand yellow, glyph in black).
export function AddressPin({ icon, className = "size-10" }: { icon: AddressIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      <path
        d="M12 2a8 8 0 0 0-8 8c0 5.6 6.6 11.3 7.3 11.8a1.1 1.1 0 0 0 1.4 0C13.4 21.3 20 15.6 20 10a8 8 0 0 0-8-8Z"
        fill="var(--primary)"
      />
      <g fill="var(--primary-foreground)" color="var(--primary-foreground)">
        {GLYPHS[icon]}
      </g>
    </svg>
  );
}
