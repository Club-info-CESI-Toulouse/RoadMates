// App icon artwork (CESI yellow + black), rendered to PNG by next/og.
// `padding` shrinks the mark so maskable icons survive circular cropping.
export function BrandIcon({ size, padding = 0 }: { size: number; padding?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fee131",
        color: "#000000",
        fontSize: (size - padding * 2) * 0.62,
        fontWeight: 800,
        letterSpacing: "-0.05em",
      }}
    >
      R_
    </div>
  );
}
