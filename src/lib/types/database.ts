export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      character_progression: {
        Row: {
          character_id: string
          created_at: string
          id: string
          level: number
          picks: Json
          source: string
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          level: number
          picks?: Json
          source: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          level?: number
          picks?: Json
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_progression_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age: number | null
          assets: number
          attributes: Json
          background_notes: string
          career: string
          controller_user_id: string | null
          created_at: string
          credits: number
          cyberware: Json
          derived_stat_bonuses: Json
          downtime_uses_used: Json
          edge_current: number
          experience: number
          favorite_skills: Json
          game_id: string
          gender: string
          health_current: number | null
          id: string
          injuries: Json
          inventory: Json
          is_minion: boolean
          is_npc: boolean
          level: number
          malfunction_allocations: Json
          name: string
          notes: string
          pending_bonuses: Json
          portrait_url: string | null
          skills: Json
          talents: Json
          updated_at: string
          user_id: string
          visible_to_players: boolean
        }
        Insert: {
          age?: number | null
          assets?: number
          attributes?: Json
          background_notes?: string
          career?: string
          controller_user_id?: string | null
          created_at?: string
          credits?: number
          cyberware?: Json
          derived_stat_bonuses?: Json
          downtime_uses_used?: Json
          edge_current?: number
          experience?: number
          favorite_skills?: Json
          game_id: string
          gender?: string
          health_current?: number | null
          id?: string
          injuries?: Json
          inventory?: Json
          is_minion?: boolean
          is_npc?: boolean
          level?: number
          malfunction_allocations?: Json
          name?: string
          notes?: string
          pending_bonuses?: Json
          portrait_url?: string | null
          skills?: Json
          talents?: Json
          updated_at?: string
          user_id: string
          visible_to_players?: boolean
        }
        Update: {
          age?: number | null
          assets?: number
          attributes?: Json
          background_notes?: string
          career?: string
          controller_user_id?: string | null
          created_at?: string
          credits?: number
          cyberware?: Json
          derived_stat_bonuses?: Json
          downtime_uses_used?: Json
          edge_current?: number
          experience?: number
          favorite_skills?: Json
          game_id?: string
          gender?: string
          health_current?: number | null
          id?: string
          injuries?: Json
          inventory?: Json
          is_minion?: boolean
          is_npc?: boolean
          level?: number
          malfunction_allocations?: Json
          name?: string
          notes?: string
          pending_bonuses?: Json
          portrait_url?: string | null
          skills?: Json
          talents?: Json
          updated_at?: string
          user_id?: string
          visible_to_players?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "characters_controller_user_id_fkey"
            columns: ["controller_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dice_rolls: {
        Row: {
          character_id: string | null
          created_at: string
          game_id: string
          id: string
          is_hidden: boolean
          roll_data: Json
          skill_name: string | null
          user_id: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          is_hidden?: boolean
          roll_data: Json
          skill_name?: string | null
          user_id: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          is_hidden?: boolean
          roll_data?: Json
          skill_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dice_rolls_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dice_rolls_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dice_rolls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_members: {
        Row: {
          game_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_members_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_state: {
        Row: {
          assets: number
          combat: Json | null
          credits: number
          game_id: string
          inventory: Json
          pending_support: Json
          updated_at: string
        }
        Insert: {
          assets?: number
          combat?: Json | null
          credits?: number
          game_id: string
          inventory?: Json
          pending_support?: Json
          updated_at?: string
        }
        Update: {
          assets?: number
          combat?: Json | null
          credits?: number
          game_id?: string
          inventory?: Json
          pending_support?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_state_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          gm_id: string
          id: string
          invite_code: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gm_id: string
          id?: string
          invite_code?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gm_id?: string
          id?: string
          invite_code?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      character_portraits_character_id: {
        Args: { p_name: string }
        Returns: string
      }
      find_game_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          gm_id: string
          id: string
          invite_code: string
          name: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_game_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

