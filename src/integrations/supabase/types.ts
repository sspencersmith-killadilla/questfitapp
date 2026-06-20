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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_entries: {
        Row: {
          active_minutes: number
          created_at: string
          entry_date: string
          id: string
          intensity: string | null
          notes: string | null
          source: Database["public"]["Enums"]["activity_source"]
          steps: number
          user_id: string
          workout_type: string | null
        }
        Insert: {
          active_minutes?: number
          created_at?: string
          entry_date?: string
          id?: string
          intensity?: string | null
          notes?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          steps?: number
          user_id: string
          workout_type?: string | null
        }
        Update: {
          active_minutes?: number
          created_at?: string
          entry_date?: string
          id?: string
          intensity?: string | null
          notes?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          steps?: number
          user_id?: string
          workout_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          autoplay_next: boolean
          chosen_genre: Database["public"]["Enums"]["story_genre"] | null
          created_at: string
          display_name: string | null
          id: string
          narrator_voice_id: string
          onboarding_complete: boolean
          playback_speed: number
          starting_weight_kg: number | null
          updated_at: string
          weekly_goal_minutes: number
          weekly_goal_steps: number
          weekly_goal_workouts: number
        }
        Insert: {
          autoplay_next?: boolean
          chosen_genre?: Database["public"]["Enums"]["story_genre"] | null
          created_at?: string
          display_name?: string | null
          id: string
          narrator_voice_id?: string
          onboarding_complete?: boolean
          playback_speed?: number
          starting_weight_kg?: number | null
          updated_at?: string
          weekly_goal_minutes?: number
          weekly_goal_steps?: number
          weekly_goal_workouts?: number
        }
        Update: {
          autoplay_next?: boolean
          chosen_genre?: Database["public"]["Enums"]["story_genre"] | null
          created_at?: string
          display_name?: string | null
          id?: string
          narrator_voice_id?: string
          onboarding_complete?: boolean
          playback_speed?: number
          starting_weight_kg?: number | null
          updated_at?: string
          weekly_goal_minutes?: number
          weekly_goal_steps?: number
          weekly_goal_workouts?: number
        }
        Relationships: []
      }
      story_challenges: {
        Row: {
          created_at: string
          deadline: string
          id: string
          metric: Database["public"]["Enums"]["challenge_metric"]
          narrative_hook: string
          progress_value: number
          resolution_chapter_id: string | null
          resolved_at: string | null
          starts_on: string
          status: Database["public"]["Enums"]["challenge_status"]
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          metric: Database["public"]["Enums"]["challenge_metric"]
          narrative_hook: string
          progress_value?: number
          resolution_chapter_id?: string | null
          resolved_at?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          target_value: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          metric?: Database["public"]["Enums"]["challenge_metric"]
          narrative_hook?: string
          progress_value?: number
          resolution_chapter_id?: string | null
          resolved_at?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_challenges_resolution_chapter_id_fkey"
            columns: ["resolution_chapter_id"]
            isOneToOne: false
            referencedRelation: "story_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters: {
        Row: {
          activity_snapshot: Json
          audio_duration_seconds: number | null
          audio_error: string | null
          audio_path: string | null
          audio_status: Database["public"]["Enums"]["audio_status"]
          audio_voice_id: string | null
          chapter_type: Database["public"]["Enums"]["chapter_type"]
          content: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_snapshot?: Json
          audio_duration_seconds?: number | null
          audio_error?: string | null
          audio_path?: string | null
          audio_status?: Database["public"]["Enums"]["audio_status"]
          audio_voice_id?: string | null
          chapter_type: Database["public"]["Enums"]["chapter_type"]
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_snapshot?: Json
          audio_duration_seconds?: number | null
          audio_error?: string | null
          audio_path?: string | null
          audio_status?: Database["public"]["Enums"]["audio_status"]
          audio_voice_id?: string | null
          chapter_type?: Database["public"]["Enums"]["chapter_type"]
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      story_state: {
        Row: {
          current_arc: string | null
          last_generated_at: string | null
          protagonist_name: string | null
          rolling_summary: string
          story_bible: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          current_arc?: string | null
          last_generated_at?: string | null
          protagonist_name?: string | null
          rolling_summary?: string
          story_bible?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          current_arc?: string | null
          last_generated_at?: string | null
          protagonist_name?: string | null
          rolling_summary?: string
          story_bible?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          entry_date: string
          id: string
          muscle_kg: number | null
          source: Database["public"]["Enums"]["activity_source"]
          user_id: string
          weight_kg: number
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          entry_date?: string
          id?: string
          muscle_kg?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          user_id: string
          weight_kg: number
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          entry_date?: string
          id?: string
          muscle_kg?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          user_id?: string
          weight_kg?: number
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
      activity_source: "manual" | "withings" | "apple_health"
      audio_status: "idle" | "pending" | "ready" | "failed"
      challenge_metric: "active_minutes" | "steps" | "workouts"
      challenge_status: "active" | "completed" | "failed"
      chapter_type: "daily_teaser" | "weekly_chapter" | "prologue"
      story_genre: "fantasy" | "scifi" | "mystery" | "slice_of_life"
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
      activity_source: ["manual", "withings", "apple_health"],
      audio_status: ["idle", "pending", "ready", "failed"],
      challenge_metric: ["active_minutes", "steps", "workouts"],
      challenge_status: ["active", "completed", "failed"],
      chapter_type: ["daily_teaser", "weekly_chapter", "prologue"],
      story_genre: ["fantasy", "scifi", "mystery", "slice_of_life"],
    },
  },
} as const
