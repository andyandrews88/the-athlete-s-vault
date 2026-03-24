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
      ai_knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          source: string | null
          source_type: string | null
          title: string
          word_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          source?: string | null
          source_type?: string | null
          title: string
          word_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          source?: string | null
          source_type?: string | null
          title?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string | null
          date: string
          id: string
          prompt_count: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          prompt_count?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          prompt_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bookmarks: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      channel_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          parent_message_id: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_message_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
        }
        Relationships: []
      }
      coaching_applications: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          status: string
          stripe_session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          stripe_session_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          stripe_session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      content_items: {
        Row: {
          content_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: string | null
          id: string
          is_new_drop: boolean | null
          source: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          url: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_new_drop?: boolean | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_new_drop?: boolean | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sends: {
        Row: {
          content_id: string
          id: string
          sent_at: string | null
          sent_by: string | null
          sent_to: string | null
          sent_to_all: boolean | null
        }
        Insert: {
          content_id: string
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to?: string | null
          sent_to_all?: boolean | null
        }
        Update: {
          content_id?: string
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          sent_to?: string | null
          sent_to_all?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "content_sends_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sends_sent_to_fkey"
            columns: ["sent_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          calories: number | null
          completed: boolean | null
          distance_m: number | null
          duration_secs: number | null
          height_cm: number | null
          id: string
          is_pr: boolean | null
          reps: number | null
          rir: number | null
          rpe: number | null
          session_exercise_id: string
          set_num: number
          set_type: string
          side: string | null
          speed_mps: number | null
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          completed?: boolean | null
          distance_m?: number | null
          duration_secs?: number | null
          height_cm?: number | null
          id?: string
          is_pr?: boolean | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_num: number
          set_type?: string
          side?: string | null
          speed_mps?: number | null
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          completed?: boolean | null
          distance_m?: number | null
          duration_secs?: number | null
          height_cm?: number | null
          id?: string
          is_pr?: boolean | null
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_num?: number
          set_type?: string
          side?: string | null
          speed_mps?: number | null
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
          approved: boolean | null
          category: string | null
          created_by: string | null
          difficulty_coefficient: number | null
          equipment_type: string | null
          exercise_type: string
          id: string
          is_custom: boolean | null
          is_plyometric: boolean | null
          is_timed: boolean | null
          is_unilateral: boolean | null
          movement_pattern: string | null
          muscle_group: string | null
          name: string
          plyo_metric: string | null
          status: string | null
          submitted_by: string | null
          video_url: string | null
        }
        Insert: {
          approved?: boolean | null
          category?: string | null
          created_by?: string | null
          difficulty_coefficient?: number | null
          equipment_type?: string | null
          exercise_type?: string
          id?: string
          is_custom?: boolean | null
          is_plyometric?: boolean | null
          is_timed?: boolean | null
          is_unilateral?: boolean | null
          movement_pattern?: string | null
          muscle_group?: string | null
          name: string
          plyo_metric?: string | null
          status?: string | null
          submitted_by?: string | null
          video_url?: string | null
        }
        Update: {
          approved?: boolean | null
          category?: string | null
          created_by?: string | null
          difficulty_coefficient?: number | null
          equipment_type?: string | null
          exercise_type?: string
          id?: string
          is_custom?: boolean | null
          is_plyometric?: boolean | null
          is_timed?: boolean | null
          is_unilateral?: boolean | null
          movement_pattern?: string | null
          muscle_group?: string | null
          name?: string
          plyo_metric?: string | null
          status?: string | null
          submitted_by?: string | null
          video_url?: string | null
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
      hand_portion_entries: {
        Row: {
          category: string
          created_at: string | null
          date: string
          estimated_calories: number | null
          estimated_carbs: number | null
          estimated_fat: number | null
          estimated_protein: number | null
          food_name: string | null
          id: string
          meal_type: string
          notes: string | null
          portions: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          date?: string
          estimated_calories?: number | null
          estimated_carbs?: number | null
          estimated_fat?: number | null
          estimated_protein?: number | null
          food_name?: string | null
          id?: string
          meal_type: string
          notes?: string | null
          portions: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          date?: string
          estimated_calories?: number | null
          estimated_carbs?: number | null
          estimated_fat?: number | null
          estimated_protein?: number | null
          food_name?: string | null
          id?: string
          meal_type?: string
          notes?: string | null
          portions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_portion_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          amount: number
          client_id: string
          coach_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_url: string | null
          notes: string | null
          package_id: string | null
          paid_at: string | null
          sessions_count: number | null
          status: string | null
        }
        Insert: {
          amount: number
          client_id: string
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          sessions_count?: number | null
          status?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          sessions_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
        ]
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          checkin_reminder: boolean | null
          coaching_notes: boolean | null
          id: string
          streak_reminder: boolean | null
          updated_at: string | null
          user_id: string
          weekly_review: boolean | null
        }
        Insert: {
          checkin_reminder?: boolean | null
          coaching_notes?: boolean | null
          id?: string
          streak_reminder?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_review?: boolean | null
        }
        Update: {
          checkin_reminder?: boolean | null
          coaching_notes?: boolean | null
          id?: string
          streak_reminder?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_review?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          poll_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          poll_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          poll_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          channel_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          message_id: string | null
          options: Json
          question: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string | null
          options?: Json
          question: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_id?: string | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          price_lkr: number | null
          price_usd: number | null
          service_name: string
          show_on_landing: boolean | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          price_lkr?: number | null
          price_usd?: number | null
          service_name: string
          show_on_landing?: boolean | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          price_lkr?: number | null
          price_usd?: number | null
          service_name?: string
          show_on_landing?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          audit_score: number | null
          audit_tier: string | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          equipment: string[] | null
          experience_level: string | null
          full_name: string | null
          goal: string | null
          id: string
          internal_notes: string | null
          onboarding_complete: boolean | null
          referral_code: string | null
          rest_timer_secs: number
          role: string | null
          status: string | null
          tier: string | null
          weight_unit: string
        }
        Insert: {
          audit_score?: number | null
          audit_tier?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          goal?: string | null
          id: string
          internal_notes?: string | null
          onboarding_complete?: boolean | null
          referral_code?: string | null
          rest_timer_secs?: number
          role?: string | null
          status?: string | null
          tier?: string | null
          weight_unit?: string
        }
        Update: {
          audit_score?: number | null
          audit_tier?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          internal_notes?: string | null
          onboarding_complete?: boolean | null
          referral_code?: string | null
          rest_timer_secs?: number
          role?: string | null
          status?: string | null
          tier?: string | null
          weight_unit?: string
        }
        Relationships: []
      }
      programme_templates: {
        Row: {
          created_at: string | null
          days_per_week: number | null
          description: string | null
          difficulty: string | null
          display_order: number | null
          duration_weeks: number | null
          id: string
          is_active: boolean | null
          name: string
          required_tier: string | null
          sample_week: Json | null
          slug: string
          tagline: string | null
          tags: string[] | null
          video_url: string | null
          what_to_expect: string | null
          who_its_for: string | null
        }
        Insert: {
          created_at?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          required_tier?: string | null
          sample_week?: Json | null
          slug: string
          tagline?: string | null
          tags?: string[] | null
          video_url?: string | null
          what_to_expect?: string | null
          who_its_for?: string | null
        }
        Update: {
          created_at?: string | null
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          display_order?: number | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_tier?: string | null
          sample_week?: Json | null
          slug?: string
          tagline?: string | null
          tags?: string[] | null
          video_url?: string | null
          what_to_expect?: string | null
          who_its_for?: string | null
        }
        Relationships: []
      }
      programme_weeks: {
        Row: {
          id: string
          notes: string | null
          template_id: string | null
          week_number: number
        }
        Insert: {
          id?: string
          notes?: string | null
          template_id?: string | null
          week_number: number
        }
        Update: {
          id?: string
          notes?: string | null
          template_id?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "programme_weeks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programme_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_workouts: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          name: string
          prescribed_exercises: Json
          programme_id: string
          section: string | null
          template_id: string | null
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          name: string
          prescribed_exercises?: Json
          programme_id: string
          section?: string | null
          template_id?: string | null
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          name?: string
          prescribed_exercises?: Json
          programme_id?: string
          section?: string | null
          template_id?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programme_workouts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "training_programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programme_templates"
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
      pt_packages: {
        Row: {
          client_id: string
          coach_id: string | null
          created_at: string | null
          currency: string | null
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          price_per_session: number | null
          sessions_total: number
          sessions_used: number | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          client_id: string
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          price_per_session?: number | null
          sessions_total: number
          sessions_used?: number | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string | null
          created_at?: string | null
          currency?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          price_per_session?: number | null
          sessions_total?: number
          sessions_used?: number | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_packages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_sessions: {
        Row: {
          client_id: string
          coach_id: string | null
          completed: boolean | null
          created_at: string | null
          date: string
          duration_mins: number | null
          focus_areas: string | null
          id: string
          notes: string | null
          package_id: string | null
        }
        Insert: {
          client_id: string
          coach_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          date: string
          duration_mins?: number | null
          focus_areas?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          date?: string
          duration_mins?: number | null
          focus_areas?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          display_order: number | null
          exercise_id: string
          id: string
          notes: string | null
          session_id: string
          superset_group: string | null
        }
        Insert: {
          display_order?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          session_id: string
          superset_group?: string | null
        }
        Update: {
          display_order?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
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
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programmes: {
        Row: {
          created_at: string | null
          created_by: string | null
          days_per_week: number | null
          description: string | null
          id: string
          is_active: boolean
          is_free: boolean | null
          is_template: boolean | null
          name: string
          template_id: string | null
          user_id: string
          weeks: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean | null
          is_template?: boolean | null
          name: string
          template_id?: string | null
          user_id: string
          weeks?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean | null
          is_template?: boolean | null
          name?: string
          template_id?: string | null
          user_id?: string
          weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_programmes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programme_templates"
            referencedColumns: ["id"]
          },
        ]
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
          workout_notes: string | null
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
          workout_notes?: string | null
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
          workout_notes?: string | null
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
