export const ADDRESS_KINDS = ["home", "work", "school"] as const;
export type AddressKind = (typeof ADDRESS_KINDS)[number];

export const ADDRESS_LABELS: Record<AddressKind, string> = {
  home: "Domicile",
  work: "Travail",
  school: "École",
};
