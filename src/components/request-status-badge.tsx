const STATUS = {
  accepted: { label: "Accepté", className: "bg-green-700" },
  pending: { label: "En attente", className: "bg-orange-600" },
  cancelled: { label: "Annulé", className: "bg-red-600" },
} as const;

export function RequestStatusBadge({ status }: { status: keyof typeof STATUS }) {
  const { label, className } = STATUS[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${className}`}>{label}</span>;
}
