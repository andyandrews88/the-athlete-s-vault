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
      audit_responses: {
        Row: {
          back_squat_1rm: number | null
          created_at: string | null
          days_per_week: number | null
          deadlift_1rm: number | null
          hip_flexion: number | null
          id: string
          injuries: string | null
          max_burpees_60s: number | null
          max_double_unders: number | null
          max_pullups: number | null
          nutrition_consistency: number | null
          overhead_press_1rm: number | null
          primary_sport: string | null
          recovery_quality: number | null
          run_400m_seconds: number | null
          shoulder_flexion: number | null
          sleep_quality: number | null
          stress_level: number | null
          thoracic_rotation: number | null
          user_id: string
          years_training: number | null
        }
        Insert: {
          back_squat_1rm?: number | null
          created_at?: string | null
          days_per_week?: number | null
          deadlift_1rm?: number | null
          hip_flexion?: number | null
          id?: string
          injuries?: string | null
          max_burpees_60s?: number | null
          max_double_unders?: number | null
          max_pullups?: number | null
          nutrition_consistency?: number | null
          overhead_press_1rm?: number | null
          primary_sport?: string | null
          recovery_quality?: number | null
          run_400m_seconds?: number | null
          shoulder_flexion?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          thoracic_rotation?: number | null
          user_id: string
          years_training?: number | null
        }
        Update: {
          back_squat_1rm?: number | null
          created_at?: string | null
          days_per_week?: number | null
          deadlift_1rm?: number | null
          hip_flexion?: number | null
          id?: string
          injuries?: string | null
          max_burpees_60s?: number | null
          max_double_unders?: number | null
          max_pullups?: number | null
          nutrition_consistency?: number | null
          overhead_press_1rm?: number | null
          primary_sport?: string | null
          recovery_quality?: number | null
          run_400m_seconds?: number | null
          shoulder_flexion?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          thoracic_rotation?: number | null
          user_id?: string
          years_training?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          audit_score: number | null
          audit_tier: string | null
          avatar_url: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          equipment: string[] | null
          experience_level: string | null
          full_name: string | null
          goal: string | null
          id: string
          onboarding_complete: boolean | null
          referral_code: string | null
          role: string | null
          tier: string | null
        }
        Insert: {
          audit_score?: number | null
          audit_tier?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          goal?: string | null
          id: string
          onboarding_complete?: boolean | null
          referral_code?: string | null
          role?: string | null
          tier?: string | null
        }
        Update: {
          audit_score?: number | null
          audit_tier?: string | null
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          onboarding_complete?: boolean | null
          referral_code?: string | null
          role?: string | null
          tier?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
