export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["address_kind"]
          payload_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["address_kind"]
          payload_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["address_kind"]
          payload_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          created_at: string
          email_domain: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email_domain: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email_domain?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          group_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          group_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          group_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_occurrences: {
        Row: {
          arrival_at: string
          created_at: string
          date: string
          departure_at: string
          id: string
          seats_total: number | null
          status: Database["public"]["Enums"]["occurrence_status"]
          trip_id: string
        }
        Insert: {
          arrival_at: string
          created_at?: string
          date: string
          departure_at: string
          id?: string
          seats_total?: number | null
          status?: Database["public"]["Enums"]["occurrence_status"]
          trip_id: string
        }
        Update: {
          arrival_at?: string
          created_at?: string
          date?: string
          departure_at?: string
          id?: string
          seats_total?: number | null
          status?: Database["public"]["Enums"]["occurrence_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_occurrences_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string | null
          destination_address_id: string
          estimated_duration_s: number | null
          flex_after_min: number
          flex_before_min: number
          group_id: string
          id: string
          is_active: boolean
          max_walk_min: number
          origin_address_id: string
          owner_id: string
          role: Database["public"]["Enums"]["trip_role"]
          seats: number | null
          slot: Database["public"]["Enums"]["trip_slot"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          weekdays: number[]
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          destination_address_id: string
          estimated_duration_s?: number | null
          flex_after_min?: number
          flex_before_min?: number
          group_id: string
          id?: string
          is_active?: boolean
          max_walk_min?: number
          origin_address_id: string
          owner_id: string
          role: Database["public"]["Enums"]["trip_role"]
          seats?: number | null
          slot: Database["public"]["Enums"]["trip_slot"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekdays: number[]
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string | null
          destination_address_id?: string
          estimated_duration_s?: number | null
          flex_after_min?: number
          flex_before_min?: number
          group_id?: string
          id?: string
          is_active?: boolean
          max_walk_min?: number
          origin_address_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["trip_role"]
          seats?: number | null
          slot?: Database["public"]["Enums"]["trip_slot"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "trips_destination_address_id_fkey"
            columns: ["destination_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_origin_address_id_fkey"
            columns: ["origin_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_attempts: {
        Row: {
          attempts: number
          email_hash: string
          purpose: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          email_hash: string
          purpose: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          email_hash?: string
          purpose?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      establishment_id_for_email: { Args: { p_email: string }; Returns: string }
      record_verification_failure: {
        Args: { p_email_hash: string; p_purpose: string }
        Returns: number
      }
      visible_group_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      address_kind: "home" | "work" | "school" | "other"
      occurrence_status: "scheduled" | "cancelled"
      trip_role: "driver" | "passenger"
      trip_slot: "morning" | "evening"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      address_kind: ["home", "work", "school", "other"],
      occurrence_status: ["scheduled", "cancelled"],
      trip_role: ["driver", "passenger"],
      trip_slot: ["morning", "evening"],
    },
  },
} as const
