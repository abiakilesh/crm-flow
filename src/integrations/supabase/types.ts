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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_fund_payments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          paid_amount: number
          paid_date: string
          project_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          paid_amount?: number
          paid_date: string
          project_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          paid_amount?: number
          paid_date?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_fund_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      call_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          phone_number: string
          project_id: string | null
          serial_no: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone_number: string
          project_id?: string | null
          serial_no: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone_number?: string
          project_id?: string | null
          serial_no?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_date: string
          call_time: string
          caller_id: string | null
          created_at: string
          customer_name: string | null
          duration_minutes: number | null
          feedback: string | null
          follow_up_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          phone_number: string | null
          project_id: string | null
          recording_url: string | null
          status: string
        }
        Insert: {
          call_date?: string
          call_time?: string
          caller_id?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone_number?: string | null
          project_id?: string | null
          recording_url?: string | null
          status?: string
        }
        Update: {
          call_date?: string
          call_time?: string
          caller_id?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          phone_number?: string | null
          project_id?: string | null
          recording_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance: {
        Row: {
          company_name: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          paid_status: string
          project_id: string | null
          share_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          paid_status?: string
          project_id?: string | null
          share_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          paid_status?: string
          project_id?: string | null
          share_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_uploads: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          source: string | null
          total_count: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          source?: string | null
          total_count?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          source?: string | null
          total_count?: number
          uploaded_by?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          feedback: string | null
          follow_up_at: string | null
          id: string
          lead_by: string | null
          lead_id: string
          mobile: string | null
          place: string | null
          project_id: string | null
          review: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          upload_batch_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          feedback?: string | null
          follow_up_at?: string | null
          id?: string
          lead_by?: string | null
          lead_id?: string
          mobile?: string | null
          place?: string | null
          project_id?: string | null
          review?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          upload_batch_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          feedback?: string | null
          follow_up_at?: string | null
          id?: string
          lead_by?: string | null
          lead_id?: string
          mobile?: string | null
          place?: string | null
          project_id?: string | null
          review?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          upload_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_leads: {
        Row: {
          campaign_name: string
          client_logo_url: string | null
          client_name: string
          conversion: string
          cost_per_result: number
          created_at: string
          created_by: string | null
          id: string
          impression: number
          month: string
          project_id: string | null
          reach: number
          report_date: string
          result: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          campaign_name?: string
          client_logo_url?: string | null
          client_name: string
          conversion?: string
          cost_per_result?: number
          created_at?: string
          created_by?: string | null
          id?: string
          impression?: number
          month?: string
          project_id?: string | null
          reach?: number
          report_date?: string
          result?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          client_logo_url?: string | null
          client_name?: string
          conversion?: string
          cost_per_result?: number
          created_at?: string
          created_by?: string | null
          id?: string
          impression?: number
          month?: string
          project_id?: string | null
          reach?: number
          report_date?: string
          result?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          manager_id: string | null
          phone: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          phone?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          follow_up_1: string | null
          follow_up_2: string | null
          id: string
          lead_id: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          follow_up_1?: string | null
          follow_up_2?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          follow_up_1?: string | null
          follow_up_2?: string | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          created_at: string
          customer_name: string
          follow_up_date: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          image_urls: string[]
          interest_level: Database["public"]["Enums"]["interest_level"]
          lead_id: string | null
          location: string | null
          manager_id: string | null
          phone_number: string
          project_name: string | null
          property_name: string | null
          remarks: string | null
          sales_id: string
          status: string
          updated_at: string
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          follow_up_date?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          image_urls?: string[]
          interest_level?: Database["public"]["Enums"]["interest_level"]
          lead_id?: string | null
          location?: string | null
          manager_id?: string | null
          phone_number: string
          project_name?: string | null
          property_name?: string | null
          remarks?: string | null
          sales_id: string
          status?: string
          updated_at?: string
          visit_date: string
          visit_time?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          follow_up_date?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          image_urls?: string[]
          interest_level?: Database["public"]["Enums"]["interest_level"]
          lead_id?: string | null
          location?: string | null
          manager_id?: string | null
          phone_number?: string
          project_name?: string | null
          property_name?: string | null
          remarks?: string | null
          sales_id?: string
          status?: string
          updated_at?: string
          visit_date?: string
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          login_at: string
          logout_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "member" | "client" | "sales"
      interest_level:
        | "Very Interested"
        | "Interested"
        | "Need Follow-up"
        | "Not Interested"
      lead_status:
        | "New"
        | "Contacted"
        | "Follow-up"
        | "Interested"
        | "Not Interested"
        | "Closed"
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
      app_role: ["admin", "manager", "member", "client", "sales"],
      interest_level: [
        "Very Interested",
        "Interested",
        "Need Follow-up",
        "Not Interested",
      ],
      lead_status: [
        "New",
        "Contacted",
        "Follow-up",
        "Interested",
        "Not Interested",
        "Closed",
      ],
    },
  },
} as const
