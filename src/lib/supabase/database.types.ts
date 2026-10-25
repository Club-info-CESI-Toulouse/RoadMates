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
          confirmed: boolean
          created_at: string
          icon: Database["public"]["Enums"]["address_icon"]
          id: string
          kind: Database["public"]["Enums"]["address_kind"]
          name: string
          payload_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          icon?: Database["public"]["Enums"]["address_icon"]
          id?: string
          kind?: Database["public"]["Enums"]["address_kind"]
          name: string
          payload_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          icon?: Database["public"]["Enums"]["address_icon"]
          id?: string
          kind?: Database["public"]["Enums"]["address_kind"]
          name?: string
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
      conversations: {
        Row: {
          a_read_at: string | null
          b_read_at: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          a_read_at?: string | null
          b_read_at?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          last_sender_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          a_read_at?: string | null
          b_read_at?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          last_sender_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_last_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
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
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          kind: string
          payload: Json
          read_at: string | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_address_seeded: boolean
          display_name: string
          email_enabled: boolean
          group_id: string | null
          id: string
          push_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_address_seeded?: boolean
          display_name: string
          email_enabled?: boolean
          group_id?: string | null
          id: string
          push_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_address_seeded?: boolean
          display_name?: string
          email_enabled?: boolean
          group_id?: string | null
          id?: string
          push_enabled?: boolean
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_cache: {
        Row: {
          created_at: string
          key: string
          payload_encrypted: string
        }
        Insert: {
          created_at?: string
          key: string
          payload_encrypted: string
        }
        Update: {
          created_at?: string
          key?: string
          payload_encrypted?: string
        }
        Relationships: []
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
      trip_requests: {
        Row: {
          cancel_reason: Database["public"]["Enums"]["cancel_reason"] | null
          cancelled_by: string | null
          created_at: string
          date: string
          detour_m: number
          detour_min: number
          distance_m: number
          driver_departure_at: string
          driver_id: string
          driver_trip_id: string
          dropoff_at: string
          dropoff_label: string | null
          dropoff_lat: number
          dropoff_lon: number
          id: string
          occurrence_id: string
          passenger_id: string
          passenger_trip_id: string
          pickup_at: string
          pickup_label: string | null
          pickup_lat: number
          pickup_lon: number
          score: number
          sender_id: string
          slot: Database["public"]["Enums"]["trip_slot"]
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          walk_min: number
        }
        Insert: {
          cancel_reason?: Database["public"]["Enums"]["cancel_reason"] | null
          cancelled_by?: string | null
          created_at?: string
          date: string
          detour_m: number
          detour_min: number
          distance_m: number
          driver_departure_at: string
          driver_id: string
          driver_trip_id: string
          dropoff_at: string
          dropoff_label?: string | null
          dropoff_lat: number
          dropoff_lon: number
          id?: string
          occurrence_id: string
          passenger_id: string
          passenger_trip_id: string
          pickup_at: string
          pickup_label?: string | null
          pickup_lat: number
          pickup_lon: number
          score: number
          sender_id: string
          slot: Database["public"]["Enums"]["trip_slot"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          walk_min: number
        }
        Update: {
          cancel_reason?: Database["public"]["Enums"]["cancel_reason"] | null
          cancelled_by?: string | null
          created_at?: string
          date?: string
          detour_m?: number
          detour_min?: number
          distance_m?: number
          driver_departure_at?: string
          driver_id?: string
          driver_trip_id?: string
          dropoff_at?: string
          dropoff_label?: string | null
          dropoff_lat?: number
          dropoff_lon?: number
          id?: string
          occurrence_id?: string
          passenger_id?: string
          passenger_trip_id?: string
          pickup_at?: string
          pickup_label?: string | null
          pickup_lat?: number
          pickup_lon?: number
          score?: number
          sender_id?: string
          slot?: Database["public"]["Enums"]["trip_slot"]
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          walk_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "trip_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_driver_trip_id_fkey"
            columns: ["driver_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "trip_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_passenger_trip_id_fkey"
            columns: ["passenger_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      accept_trip_request: { Args: { p_id: string }; Returns: undefined }
      cancel_trip_request: { Args: { p_id: string }; Returns: undefined }
      change_class: { Args: { p_name: string }; Returns: string }
      class_names: { Args: never; Returns: string[] }
      create_trip_request: {
        Args: {
          p_date: string
          p_detour_m: number
          p_detour_min: number
          p_distance_m: number
          p_driver_departure: string
          p_driver_trip: string
          p_dropoff_at: string
          p_dropoff_label: string
          p_dropoff_lat: number
          p_dropoff_lon: number
          p_max_pending: number
          p_occurrence_arrival: string
          p_occurrence_departure: string
          p_passenger_trip: string
          p_pickup_at: string
          p_pickup_label: string
          p_pickup_lat: number
          p_pickup_lon: number
          p_score: number
          p_sender: string
          p_walk_min: number
        }
        Returns: string
      }
      establishment_id_for_email: { Args: { p_email: string }; Returns: string }
      expire_trip_requests: { Args: never; Returns: undefined }
      get_or_create_conversation: { Args: { p_other: string }; Returns: string }
      group_for_class: {
        Args: { p_establishment: string; p_name: string }
        Returns: string
      }
      mark_conversation_read: { Args: { p_id: string }; Returns: undefined }
      my_ride_stats: {
        Args: never
        Returns: {
          distance_m: number
          partners: number
          rides: number
        }[]
      }
      occurrence_load: {
        Args: { p_date: string; p_trip_ids: string[] }
        Returns: {
          accepted: number
          fixed_departure: string
          seats_total: number
          trip_id: string
        }[]
      }
      purge_old_notifications: { Args: never; Returns: undefined }
      record_verification_failure: {
        Args: { p_email_hash: string; p_purpose: string }
        Returns: number
      }
      settle_occurrence: { Args: { p_request: string }; Returns: undefined }
      unread_conversations_count: { Args: never; Returns: number }
      visible_group_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      address_icon: "home" | "work" | "star"
      address_kind: "home" | "work" | "school" | "other"
      cancel_reason:
        | "declined"
        | "withdrawn"
        | "cancelled"
        | "full"
        | "past"
        | "passenger_matched"
        | "schedule_changed"
      occurrence_status: "scheduled" | "cancelled"
      request_status: "pending" | "accepted" | "cancelled"
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
      address_icon: ["home", "work", "star"],
      address_kind: ["home", "work", "school", "other"],
      cancel_reason: [
        "declined",
        "withdrawn",
        "cancelled",
        "full",
        "past",
        "passenger_matched",
        "schedule_changed",
      ],
      occurrence_status: ["scheduled", "cancelled"],
      request_status: ["pending", "accepted", "cancelled"],
      trip_role: ["driver", "passenger"],
      trip_slot: ["morning", "evening"],
    },
  },
} as const
