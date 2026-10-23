// Placeholder until linked: regenerate with `npm run db:types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      establishments: Table<
        {
          id: string;
          name: string;
          email_domain: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        },
        "name" | "email_domain"
      >;
      groups: Table<
        { id: string; establishment_id: string; name: string; created_at: string },
        "establishment_id" | "name"
      >;
      profiles: Table<
        {
          id: string;
          group_id: string | null;
          display_name: string;
          created_at: string;
          updated_at: string;
        },
        "id" | "display_name"
      >;
      addresses: Table<
        {
          id: string;
          user_id: string;
          kind: Database["public"]["Enums"]["address_kind"];
          payload_encrypted: string;
          created_at: string;
          updated_at: string;
        },
        "user_id" | "kind" | "payload_encrypted"
      >;
      trips: Table<
        {
          id: string;
          owner_id: string;
          group_id: string;
          role: Database["public"]["Enums"]["trip_role"];
          seats: number | null;
          slot: Database["public"]["Enums"]["trip_slot"];
          origin_address_id: string;
          destination_address_id: string;
          weekdays: number[];
          departure_time: string | null;
          arrival_time: string | null;
          estimated_duration_s: number | null;
          flex_before_min: number;
          flex_after_min: number;
          max_walk_min: number;
          valid_from: string | null;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        | "owner_id"
        | "group_id"
        | "role"
        | "slot"
        | "origin_address_id"
        | "destination_address_id"
        | "weekdays"
      >;
      trip_occurrences: Table<
        {
          id: string;
          trip_id: string;
          date: string;
          departure_at: string;
          arrival_at: string;
          seats_total: number | null;
          status: Database["public"]["Enums"]["occurrence_status"];
          created_at: string;
        },
        "trip_id" | "date" | "departure_at" | "arrival_at"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      visible_group_ids: { Args: Record<string, never>; Returns: string[] };
    };
    Enums: {
      trip_role: "driver" | "passenger";
      trip_slot: "morning" | "evening";
      address_kind: "home" | "work" | "school" | "other";
      occurrence_status: "scheduled" | "cancelled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
