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
          age: number | null
          back_squat_1rm: number | null
          back_squat_est_reps: number | null
          back_squat_est_wt: number | null
          biological_sex: string | null
          body_weight: number | null
          cardio_benchmark: string | null
          cardio_time_min: number | null
          cardio_time_sec: number | null
          created_at: string | null
          days_per_week: number | null
          dead_hang_seconds: number | null
          deadlift_1rm: number | null
          deadlift_est_reps: number | null
          deadlift_est_wt: number | null
          deep_squat_hold: string | null
          front_squat_1rm: number | null
          front_squat_est_reps: number | null
          front_squat_est_wt: number | null
          height_cm: number | null
          hip_flexion: number | null
          id: string
          injuries: string | null
          max_burpees_60s: number | null
          max_double_unders: number | null
          max_pullups: number | null
          nutrition_consistency: number | null
          overhead_press_1rm: number | null
          overhead_reach: string | null
          pistol_squat: string | null
          primary_goal: string | null
          primary_sport: string | null
          recovery_quality: number | null
          run_400m_seconds: number | null
          shoulder_flexion: number | null
          sleep_category: string | null
          sleep_quality: number | null
          stress_level: number | null
          strict_press_1rm: number | null
          strict_press_est_reps: number | null
          strict_press_est_wt: number | null
          thoracic_rotation: number | null
          training_experience: string | null
          user_id: string
          weight_unit: string | null
          years_training: number | null
        }
        Insert: {
          age?: number | null
          back_squat_1rm?: number | null
          back_squat_est_reps?: number | null
          back_squat_est_wt?: number | null
          biological_sex?: string | null
          body_weight?: number | null
          cardio_benchmark?: string | null
          cardio_time_min?: number | null
          cardio_time_sec?: number | null
          created_at?: string | null
          days_per_week?: number | null
          dead_hang_seconds?: number | null
          deadlift_1rm?: number | null
          deadlift_est_reps?: number | null
          deadlift_est_wt?: number | null
          deep_squat_hold?: string | null
          front_squat_1rm?: number | null
          front_squat_est_reps?: number | null
          front_squat_est_wt?: number | null
          height_cm?: number | null
          hip_flexion?: number | null
          id?: string
          injuries?: string | null
          max_burpees_60s?: number | null
          max_double_unders?: number | null
          max_pullups?: number | null
          nutrition_consistency?: number | null
          overhead_press_1rm?: number | null
          overhead_reach?: string | null
          pistol_squat?: string | null
          primary_goal?: string | null
          primary_sport?: string | null
          recovery_quality?: number | null
          run_400m_seconds?: number | null
          shoulder_flexion?: number | null
          sleep_category?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          strict_press_1rm?: number | null
          strict_press_est_reps?: number | null
          strict_press_est_wt?: number | null
          thoracic_rotation?: number | null
          training_experience?: string | null
          user_id: string
          weight_unit?: string | null
          years_training?: number | null
        }
        Update: {
          age?: number | null
          back_squat_1rm?: number | null
          back_squat_est_reps?: number | null
          back_squat_est_wt?: number | null
          biological_sex?: string | null
          body_weight?: number | null
          cardio_benchmark?: string | null
          cardio_time_min?: number | null
          cardio_time_sec?: number | null
          created_at?: string | null
          days_per_week?: number | null
          dead_hang_seconds?: number | null
          deadlift_1rm?: number | null
          deadlift_est_reps?: number | null
          deadlift_est_wt?: number | null
          deep_squat_hold?: string | null
          front_squat_1rm?: number | null
          front_squat_est_reps?: number | null
          front_squat_est_wt?: number | null
          height_cm?: number | null
          hip_flexion?: number | null
          id?: string
          injuries?: string | null
          max_burpees_60s?: number | null
          max_double_unders?: number | null
          max_pullups?: number | null
          nutrition_consistency?: number | null
          overhead_press_1rm?: number | null
          overhead_reach?: string | null
          pistol_squat?: string | null
          primary_goal?: string | null
          primary_sport?: string | null
          recovery_quality?: number | null
          run_400m_seconds?: number | null
          shoulder_flexion?: number | null
          sleep_category?: string | null
          sleep_quality?: number | null
          stress_level?: number | null
          strict_press_1rm?: number | null
          strict_press_est_reps?: number | null
          strict_press_est_wt?: number | null
          thoracic_rotation?: number | null
          training_experience?: string | null
          user_id?: string
          weight_unit?: string | null
          years_training?: number | null
        }
        Relationships: []
      }
      audit_results: {
        Row: {
          conditioning_score: number
          created_at: string | null
          id: string
          lifestyle_score: number
          mobility_score: number
          raw_data: Json | null
          score: number
          strength_score: number
          tier: string
          user_id: string
        }
        Insert: {
          conditioning_score?: number
          created_at?: string | null
          id?: string
          lifestyle_score?: number
          mobility_score?: number
          raw_data?: Json | null
          score?: number
          strength_score?: number
          tier?: string
          user_id: string
        }
        Update: {
          conditioning_score?: number
          created_at?: string | null
          id?: string
          lifestyle_score?: number
          mobility_score?: number
          raw_data?: Json | null
          score?: number
          strength_score?: number
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          chest_cm: number | null
          created_at: string | null
          date: string
          hips_cm: number | null
          id: string
          left_arm_cm: number | null
          left_thigh_cm: number | null
          neck_cm: number | null
          right_arm_cm: number | null
          right_thigh_cm: number | null
          user_id: string
          waist_cm: number | null
        }
        Insert: {
          chest_cm?: number | null
          created_at?: string | null
          date?: string
          hips_cm?: number | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          neck_cm?: number | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
        }
        Update: {
          chest_cm?: number | null
          created_at?: string | null
          date?: string
          hips_cm?: number | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          neck_cm?: number | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
        }
        Relationships: []
      }
      body_weight_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      breathwork_sessions: {
        Row: {
          completed_at: string | null
          duration_secs: number
          id: string
          method: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_secs?: number
          id?: string
          method: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_secs?: number
          id?: string
          method?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_notes: {
        Row: {
          coach_id: string | null
          content: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          user_id: string
        }
        Update: {
          coach_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string | null
          date: string
          drive: number
          energy: number
          hydration_litres: number | null
          id: string
          mood: number
          note: string | null
          nutrition_habits: Json | null
          sleep: number
          sleep_hours: number | null
          soreness: number
          stress: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          drive?: number
          energy?: number
          hydration_litres?: number | null
          id?: string
          mood?: number
          note?: string | null
          nutrition_habits?: Json | null
          sleep?: number
          sleep_hours?: number | null
          soreness?: number
          stress?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          drive?: number
          energy?: number
          hydration_litres?: number | null
          id?: string
          mood?: number
          note?: string | null
          nutrition_habits?: Json | null
          sleep?: number
          sleep_hours?: number | null
          soreness?: number
          stress?: number
          user_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          completed: boolean | null
          id: string
          is_pr: boolean | null
          reps: number | null
          rir: number | null
          session_exercise_id: string
          set_num: number
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          is_pr?: boolean | null
          reps?: number | null
          rir?: number | null
          session_exercise_id: string
          set_num: number
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          is_pr?: boolean | null
          reps?: number | null
          rir?: number | null
          session_exercise_id?: string
          set_num?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_by: string | null
          difficulty_coefficient: number | null
          id: string
          is_custom: boolean | null
          movement_pattern: string | null
          name: string
        }
        Insert: {
          category?: string | null
          created_by?: string | null
          difficulty_coefficient?: number | null
          id?: string
          is_custom?: boolean | null
          movement_pattern?: string | null
          name: string
        }
        Update: {
          category?: string | null
          created_by?: string | null
          difficulty_coefficient?: number | null
          id?: string
          is_custom?: boolean | null
          movement_pattern?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          id: string
          metric: string | null
          target_value: number | null
          title: string
          unit: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed: boolean | null
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          date?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      hand_portion_logs: {
        Row: {
          carb_portions: number | null
          date: string
          fat_portions: number | null
          id: string
          meal: string
          protein_portions: number | null
          user_id: string
          veggie_portions: number | null
        }
        Insert: {
          carb_portions?: number | null
          date?: string
          fat_portions?: number | null
          id?: string
          meal: string
          protein_portions?: number | null
          user_id: string
          veggie_portions?: number | null
        }
        Update: {
          carb_portions?: number | null
          date?: string
          fat_portions?: number | null
          id?: string
          meal?: string
          protein_portions?: number | null
          user_id?: string
          veggie_portions?: number | null
        }
        Relationships: []
      }
      inbody_scans: {
        Row: {
          basal_metabolic_rate: number | null
          bmi: number | null
          body_fat_kg: number | null
          body_fat_pct: number | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          skeletal_muscle_kg: number | null
          total_body_water: number | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          basal_metabolic_rate?: number | null
          bmi?: number | null
          body_fat_kg?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          skeletal_muscle_kg?: number | null
          total_body_water?: number | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          basal_metabolic_rate?: number | null
          bmi?: number | null
          body_fat_kg?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          skeletal_muscle_kg?: number | null
          total_body_water?: number | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      macro_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          date: string
          fat_g: number | null
          food_name: string
          id: string
          meal: string
          protein_g: number | null
          serving_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          date?: string
          fat_g?: number | null
          food_name: string
          id?: string
          meal: string
          protein_g?: number | null
          serving_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          date?: string
          fat_g?: number | null
          food_name?: string
          id?: string
          meal?: string
          protein_g?: number | null
          serving_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          calories: number | null
          carbs_g: number | null
          fat_g: number | null
          id: string
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          id?: string
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          id?: string
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string | null
          exercise_id: string
          id: string
          reps: number | null
          session_id: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          achieved_at?: string | null
          exercise_id: string
          id?: string
          reps?: number | null
          session_id?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          achieved_at?: string | null
          exercise_id?: string
          id?: string
          reps?: number | null
          session_id?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      programme_workouts: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          name: string
          prescribed_exercises: Json
          programme_id: string
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          name: string
          prescribed_exercises?: Json
          programme_id: string
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          name?: string
          prescribed_exercises?: Json
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_workouts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          angle: string
          created_at: string | null
          date: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          angle: string
          created_at?: string | null
          date?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          angle?: string
          created_at?: string | null
          date?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          display_order: number | null
          exercise_id: string
          id: string
          session_id: string
          superset_group: string | null
        }
        Insert: {
          display_order?: number | null
          exercise_id: string
          id?: string
          session_id: string
          superset_group?: string | null
        }
        Update: {
          display_order?: number | null
          exercise_id?: string
          id?: string
          session_id?: string
          superset_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programmes: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_template: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          programme_id: string | null
          session_type: string | null
          total_ntu: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          programme_id?: string | null
          session_type?: string | null
          total_ntu?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          programme_id?: string | null
          session_type?: string | null
          total_ntu?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_reflections: {
        Row: {
          challenges: string | null
          created_at: string | null
          focus_next_week: string | null
          id: string
          user_id: string
          week_start: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string | null
          focus_next_week?: string | null
          id?: string
          user_id: string
          week_start: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string | null
          focus_next_week?: string | null
          id?: string
          user_id?: string
          week_start?: string
          wins?: string | null
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          generated_at: string | null
          highlights: Json | null
          id: string
          summary: string | null
          user_id: string
        }
        Insert: {
          generated_at?: string | null
          highlights?: Json | null
          id?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          generated_at?: string | null
          highlights?: Json | null
          id?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
