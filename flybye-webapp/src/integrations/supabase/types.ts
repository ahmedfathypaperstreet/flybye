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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      airport_pois_cache: {
        Row: {
          category: string
          data: Json
          fetched_at: string
          iata: string
        }
        Insert: {
          category: string
          data: Json
          fetched_at?: string
          iata: string
        }
        Update: {
          category?: string
          data?: Json
          fetched_at?: string
          iata?: string
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string
          country: string
          iata_code: string
          icao_code: string | null
          latitude: number | null
          longitude: number | null
          name: string
          timezone: string | null
        }
        Insert: {
          city: string
          country: string
          iata_code: string
          icao_code?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          timezone?: string | null
        }
        Update: {
          city?: string
          country?: string
          iata_code?: string
          icao_code?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: []
      }
      flights: {
        Row: {
          arrival_airport: string
          arrival_time: string
          created_at: string
          departure_airport: string
          departure_time: string
          flight_number: string | null
          id: string
          layover_airport: string | null
          layover_duration_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_airport: string
          arrival_time: string
          created_at?: string
          departure_airport: string
          departure_time: string
          flight_number?: string | null
          id?: string
          layover_airport?: string | null
          layover_duration_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_airport?: string
          arrival_time?: string
          created_at?: string
          departure_airport?: string
          departure_time?: string
          flight_number?: string | null
          id?: string
          layover_airport?: string | null
          layover_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          airport: string
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          note: string | null
          terminal: string | null
          updated_at: string
          user_id: string
          zone: string | null
        }
        Insert: {
          airport: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          note?: string | null
          terminal?: string | null
          updated_at?: string
          user_id: string
          zone?: string | null
        }
        Update: {
          airport?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          note?: string | null
          terminal?: string | null
          updated_at?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          current_airport: string | null
          display_name: string
          home_airport: string | null
          id: string
          industry: string | null
          intent: Database["public"]["Enums"]["networking_intent"] | null
          is_banned: boolean
          last_seen_at: string
          linkedin_url: string | null
          present_until: string | null
          role: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          current_airport?: string | null
          display_name?: string
          home_airport?: string | null
          id: string
          industry?: string | null
          intent?: Database["public"]["Enums"]["networking_intent"] | null
          is_banned?: boolean
          last_seen_at?: string
          linkedin_url?: string | null
          present_until?: string | null
          role?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          current_airport?: string | null
          display_name?: string
          home_airport?: string | null
          id?: string
          industry?: string | null
          intent?: Database["public"]["Enums"]["networking_intent"] | null
          is_banned?: boolean
          last_seen_at?: string
          linkedin_url?: string | null
          present_until?: string | null
          role?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          document_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      discover_at_airport: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          current_airport: string | null
          display_name: string
          home_airport: string | null
          id: string
          industry: string | null
          intent: Database["public"]["Enums"]["networking_intent"] | null
          is_banned: boolean
          last_seen_at: string
          linkedin_url: string | null
          present_until: string | null
          role: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_or_create_conversation: {
        Args: { other: string }
        Returns: string
      }
      mark_conversation_read: {
        Args: { conv: string }
        Returns: undefined
      }
      touch_last_seen: {
        Args: never
        Returns: undefined
      }
    }
    Enums: {
      networking_intent: "hiring" | "partnerships" | "mentorship" | "networking"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      verification_status: "none" | "pending" | "approved" | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      networking_intent: ["hiring", "partnerships", "mentorship", "networking"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      verification_status: ["none", "pending", "approved", "rejected"],
    },
  },
} as const
