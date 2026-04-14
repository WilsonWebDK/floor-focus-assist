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
      communication_logs: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: Database["public"]["Enums"]["comm_direction"]
          followup_at: string | null
          followup_needed: boolean | null
          full_note: string | null
          id: string
          lead_id: string | null
          summary: string
          type: Database["public"]["Enums"]["comm_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["comm_direction"]
          followup_at?: string | null
          followup_needed?: boolean | null
          full_note?: string | null
          id?: string
          lead_id?: string | null
          summary: string
          type?: Database["public"]["Enums"]["comm_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["comm_direction"]
          followup_at?: string | null
          followup_needed?: boolean | null
          full_note?: string | null
          id?: string
          lead_id?: string | null
          summary?: string
          type?: Database["public"]["Enums"]["comm_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          general_notes: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          general_notes?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          general_notes?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          content_text: string | null
          created_at: string
          embedding: string | null
          file_path: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          file_path: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          content_text?: string | null
          created_at?: string
          embedding?: string | null
          file_path?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          actual_costs: number | null
          address: string | null
          ai_analysis_flags: Json | null
          assigned_to: string | null
          category: string | null
          city: string | null
          complexity_flag: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          desired_look: string | null
          doorsteps_count: number | null
          elevator_info: string | null
          email: string | null
          floor_history: string | null
          floor_level: number | null
          floor_separation_type: string | null
          floor_type: string | null
          google_calendar_event_id: string | null
          google_calendar_link: string | null
          has_elevator: boolean | null
          id: string
          image_urls: string[] | null
          internal_notes: string | null
          is_priority: boolean | null
          job_type: string | null
          last_contacted_at: string | null
          lead_message: string | null
          missing_info_summary: string | null
          name: string
          next_action_type: string | null
          next_followup_at: string | null
          parking_info: string | null
          parking_status: Database["public"]["Enums"]["parking_status"] | null
          phone: string | null
          postal_code: string | null
          power_13a_available: boolean | null
          priority_score: number | null
          quality_expectation: string | null
          quiz_slug: string | null
          quote_content: string | null
          revenue: number | null
          source: Database["public"]["Enums"]["lead_source"]
          square_meters: number | null
          stairs_count: number | null
          status: Database["public"]["Enums"]["lead_status"]
          suggested_price: Json | null
          suggested_questions: string[] | null
          time_requirement: string | null
          treatment_preference: string | null
          updated_at: string
          urgency_flag: boolean | null
          urgency_status: string | null
        }
        Insert: {
          actual_costs?: number | null
          address?: string | null
          ai_analysis_flags?: Json | null
          assigned_to?: string | null
          category?: string | null
          city?: string | null
          complexity_flag?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          desired_look?: string | null
          doorsteps_count?: number | null
          elevator_info?: string | null
          email?: string | null
          floor_history?: string | null
          floor_level?: number | null
          floor_separation_type?: string | null
          floor_type?: string | null
          google_calendar_event_id?: string | null
          google_calendar_link?: string | null
          has_elevator?: boolean | null
          id?: string
          image_urls?: string[] | null
          internal_notes?: string | null
          is_priority?: boolean | null
          job_type?: string | null
          last_contacted_at?: string | null
          lead_message?: string | null
          missing_info_summary?: string | null
          name: string
          next_action_type?: string | null
          next_followup_at?: string | null
          parking_info?: string | null
          parking_status?: Database["public"]["Enums"]["parking_status"] | null
          phone?: string | null
          postal_code?: string | null
          power_13a_available?: boolean | null
          priority_score?: number | null
          quality_expectation?: string | null
          quiz_slug?: string | null
          quote_content?: string | null
          revenue?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          square_meters?: number | null
          stairs_count?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          suggested_price?: Json | null
          suggested_questions?: string[] | null
          time_requirement?: string | null
          treatment_preference?: string | null
          updated_at?: string
          urgency_flag?: boolean | null
          urgency_status?: string | null
        }
        Update: {
          actual_costs?: number | null
          address?: string | null
          ai_analysis_flags?: Json | null
          assigned_to?: string | null
          category?: string | null
          city?: string | null
          complexity_flag?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          desired_look?: string | null
          doorsteps_count?: number | null
          elevator_info?: string | null
          email?: string | null
          floor_history?: string | null
          floor_level?: number | null
          floor_separation_type?: string | null
          floor_type?: string | null
          google_calendar_event_id?: string | null
          google_calendar_link?: string | null
          has_elevator?: boolean | null
          id?: string
          image_urls?: string[] | null
          internal_notes?: string | null
          is_priority?: boolean | null
          job_type?: string | null
          last_contacted_at?: string | null
          lead_message?: string | null
          missing_info_summary?: string | null
          name?: string
          next_action_type?: string | null
          next_followup_at?: string | null
          parking_info?: string | null
          parking_status?: Database["public"]["Enums"]["parking_status"] | null
          phone?: string | null
          postal_code?: string | null
          power_13a_available?: boolean | null
          priority_score?: number | null
          quality_expectation?: string | null
          quiz_slug?: string | null
          quote_content?: string | null
          revenue?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          square_meters?: number | null
          stairs_count?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          suggested_price?: Json | null
          suggested_questions?: string[] | null
          time_requirement?: string | null
          treatment_preference?: string | null
          updated_at?: string
          urgency_flag?: boolean | null
          urgency_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string
          id: string
          related_id: string
          related_type: string
          status: Database["public"]["Enums"]["reminder_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at: string
          id?: string
          related_id: string
          related_type: string
          status?: Database["public"]["Enums"]["reminder_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string
          id?: string
          related_id?: string
          related_type?: string
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string
        }
        Relationships: []
      }
      sales_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          disclaimer: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          disclaimer?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          disclaimer?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          can_do_carpentry: boolean | null
          capacity_notes: string | null
          cities_served: string[] | null
          created_at: string
          created_by: string | null
          email: string | null
          general_notes: string | null
          id: string
          name: string
          phone: string | null
          quality_score: number | null
          reliability_notes: string | null
          score_danish_language: number | null
          score_floor_laying: number | null
          score_floor_sanding: number | null
          score_reliability: number | null
          score_surface_treatment: number | null
          score_terrace: number | null
          skills: string[] | null
          speaks_good_danish: boolean | null
          updated_at: string
        }
        Insert: {
          can_do_carpentry?: boolean | null
          capacity_notes?: string | null
          cities_served?: string[] | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          general_notes?: string | null
          id?: string
          name: string
          phone?: string | null
          quality_score?: number | null
          reliability_notes?: string | null
          score_danish_language?: number | null
          score_floor_laying?: number | null
          score_floor_sanding?: number | null
          score_reliability?: number | null
          score_surface_treatment?: number | null
          score_terrace?: number | null
          skills?: string[] | null
          speaks_good_danish?: boolean | null
          updated_at?: string
        }
        Update: {
          can_do_carpentry?: boolean | null
          capacity_notes?: string | null
          cities_served?: string[] | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          general_notes?: string | null
          id?: string
          name?: string
          phone?: string | null
          quality_score?: number | null
          reliability_notes?: string | null
          score_danish_language?: number | null
          score_floor_laying?: number | null
          score_floor_sanding?: number | null
          score_reliability?: number | null
          score_surface_treatment?: number | null
          score_terrace?: number | null
          skills?: string[] | null
          speaks_good_danish?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          webhook_setting_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          status_code?: number | null
          webhook_setting_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_setting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_setting_id_fkey"
            columns: ["webhook_setting_id"]
            isOneToOne: false
            referencedRelation: "webhook_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          is_active: boolean | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      comm_direction: "inbound" | "outbound" | "internal"
      comm_type: "phone_call" | "email" | "sms" | "meeting" | "note" | "other"
      lead_source:
        | "website_form"
        | "quiz_funnel"
        | "manual"
        | "referral"
        | "phone"
        | "email"
        | "other"
      lead_status:
        | "new"
        | "needs_qualification"
        | "contacted"
        | "kontaktet_tlf"
        | "kontaktet_mail"
        | "kontaktet_sms"
        | "opkald_mislykkedes"
        | "inspection_scheduled"
        | "waiting_for_customer"
        | "ready_for_pricing"
        | "mangler_pris"
        | "offer_sent"
        | "won"
        | "lost"
      parking_status: "free" | "paid" | "permit_required" | "unknown"
      reminder_status: "pending" | "completed" | "snoozed" | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      comm_direction: ["inbound", "outbound", "internal"],
      comm_type: ["phone_call", "email", "sms", "meeting", "note", "other"],
      lead_source: [
        "website_form",
        "quiz_funnel",
        "manual",
        "referral",
        "phone",
        "email",
        "other",
      ],
      lead_status: [
        "new",
        "needs_qualification",
        "contacted",
        "kontaktet_tlf",
        "kontaktet_mail",
        "kontaktet_sms",
        "opkald_mislykkedes",
        "inspection_scheduled",
        "waiting_for_customer",
        "ready_for_pricing",
        "mangler_pris",
        "offer_sent",
        "won",
        "lost",
      ],
      parking_status: ["free", "paid", "permit_required", "unknown"],
      reminder_status: ["pending", "completed", "snoozed", "cancelled"],
    },
  },
} as const
