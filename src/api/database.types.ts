export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      adventure_screens: {
        Row: {
          bloc: number;
          config_json: Json;
          created_at: string;
          id: string;
          is_completed: boolean;
          phase: Database['public']['Enums']['phase_type'];
          position: number;
          result_json: Json | null;
          room_id: string;
          screen_type: Database['public']['Enums']['screen_type'];
        };
        Insert: {
          bloc: number;
          config_json?: Json;
          created_at?: string;
          id?: string;
          is_completed?: boolean;
          phase: Database['public']['Enums']['phase_type'];
          position: number;
          result_json?: Json | null;
          room_id: string;
          screen_type: Database['public']['Enums']['screen_type'];
        };
        Update: {
          bloc?: number;
          config_json?: Json;
          created_at?: string;
          id?: string;
          is_completed?: boolean;
          phase?: Database['public']['Enums']['phase_type'];
          position?: number;
          result_json?: Json | null;
          room_id?: string;
          screen_type?: Database['public']['Enums']['screen_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'adventure_screens_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      card_definitions: {
        Row: {
          base_block: number | null;
          base_burn: number | null;
          base_damage: number | null;
          base_heal: number | null;
          cost: number;
          description: string;
          id: string;
          is_aoe: boolean;
          is_rare: boolean;
          is_signature: boolean;
          is_starter: boolean;
          name: string;
          starter_role: Database['public']['Enums']['role_id'] | null;
          trait: string;
          upgrade_description: string;
          upgrade_name: string;
          upgrade_threshold: number;
          upgraded_block: number | null;
          upgraded_burn: number | null;
          upgraded_damage: number | null;
          upgraded_heal: number | null;
        };
        Insert: {
          base_block?: number | null;
          base_burn?: number | null;
          base_damage?: number | null;
          base_heal?: number | null;
          cost?: number;
          description?: string;
          id: string;
          is_aoe?: boolean;
          is_rare?: boolean;
          is_signature?: boolean;
          is_starter?: boolean;
          name: string;
          starter_role?: Database['public']['Enums']['role_id'] | null;
          trait: string;
          upgrade_description?: string;
          upgrade_name?: string;
          upgrade_threshold?: number;
          upgraded_block?: number | null;
          upgraded_burn?: number | null;
          upgraded_damage?: number | null;
          upgraded_heal?: number | null;
        };
        Update: {
          base_block?: number | null;
          base_burn?: number | null;
          base_damage?: number | null;
          base_heal?: number | null;
          cost?: number;
          description?: string;
          id?: string;
          is_aoe?: boolean;
          is_rare?: boolean;
          is_signature?: boolean;
          is_starter?: boolean;
          name?: string;
          starter_role?: Database['public']['Enums']['role_id'] | null;
          trait?: string;
          upgrade_description?: string;
          upgrade_name?: string;
          upgrade_threshold?: number;
          upgraded_block?: number | null;
          upgraded_burn?: number | null;
          upgraded_damage?: number | null;
          upgraded_heal?: number | null;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          created_at: string;
          exp: number;
          gold: number;
          hp: number;
          hp_max: number;
          id: string;
          level: number;
          name: string;
          player_id: Database['public']['Enums']['player_id'];
          room_id: string;
          taunt_turns_left: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          exp?: number;
          gold?: number;
          hp?: number;
          hp_max?: number;
          id?: string;
          level?: number;
          name: string;
          player_id: Database['public']['Enums']['player_id'];
          room_id: string;
          taunt_turns_left?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          exp?: number;
          gold?: number;
          hp?: number;
          hp_max?: number;
          id?: string;
          level?: number;
          name?: string;
          player_id?: Database['public']['Enums']['player_id'];
          room_id?: string;
          taunt_turns_left?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'characters_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      combat_turns: {
        Row: {
          created_at: string;
          id: string;
          phase: string;
          room_id: string;
          screen_id: string;
          turn_number: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          phase?: string;
          room_id: string;
          screen_id: string;
          turn_number?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          phase?: string;
          room_id?: string;
          screen_id?: string;
          turn_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'combat_turns_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'combat_turns_screen_id_fkey';
            columns: ['screen_id'];
            isOneToOne: false;
            referencedRelation: 'adventure_screens';
            referencedColumns: ['id'];
          },
        ];
      };
      enemies: {
        Row: {
          attack: number;
          created_at: string;
          hp: number;
          hp_max: number;
          id: string;
          is_dead: boolean;
          level: number;
          name: string;
          position: number;
          room_id: string;
          screen_id: string | null;
        };
        Insert: {
          attack?: number;
          created_at?: string;
          hp: number;
          hp_max: number;
          id?: string;
          is_dead?: boolean;
          level?: number;
          name: string;
          position: number;
          room_id: string;
          screen_id?: string | null;
        };
        Update: {
          attack?: number;
          created_at?: string;
          hp?: number;
          hp_max?: number;
          id?: string;
          is_dead?: boolean;
          level?: number;
          name?: string;
          position?: number;
          room_id?: string;
          screen_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enemies_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enemies_screen_id_fkey';
            columns: ['screen_id'];
            isOneToOne: false;
            referencedRelation: 'adventure_screens';
            referencedColumns: ['id'];
          },
        ];
      };
      enemy_combat_state: {
        Row: {
          block: number;
          burn: number;
          hp: number;
          hp_max: number;
          icon: string;
          id: string;
          intent_index: number;
          is_dead: boolean;
          name: string;
          position: number;
          room_id: string;
          screen_id: string;
          strength: number;
          template_id: string;
          vulnerable: number;
          weakened: number;
        };
        Insert: {
          block?: number;
          burn?: number;
          hp: number;
          hp_max: number;
          icon?: string;
          id?: string;
          intent_index?: number;
          is_dead?: boolean;
          name: string;
          position?: number;
          room_id: string;
          screen_id: string;
          strength?: number;
          template_id: string;
          vulnerable?: number;
          weakened?: number;
        };
        Update: {
          block?: number;
          burn?: number;
          hp?: number;
          hp_max?: number;
          icon?: string;
          id?: string;
          intent_index?: number;
          is_dead?: boolean;
          name?: string;
          position?: number;
          room_id?: string;
          screen_id?: string;
          strength?: number;
          template_id?: string;
          vulnerable?: number;
          weakened?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'enemy_combat_state_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      enemy_templates: {
        Row: {
          base_hp: number;
          base_strength: number;
          icon: string;
          id: string;
          intent_pattern: number[];
          name: string;
          scaling_per_fight: number;
          strength_scaling: number;
        };
        Insert: {
          base_hp: number;
          base_strength?: number;
          icon?: string;
          id: string;
          intent_pattern?: number[];
          name: string;
          scaling_per_fight?: number;
          strength_scaling?: number;
        };
        Update: {
          base_hp?: number;
          base_strength?: number;
          icon?: string;
          id?: string;
          intent_pattern?: number[];
          name?: string;
          scaling_per_fight?: number;
          strength_scaling?: number;
        };
        Relationships: [];
      };
      player_combat_state: {
        Row: {
          attune_charges: number;
          attune_target_trait: string | null;
          block: number;
          burn: number;
          discard_pile: Json;
          draw_pile: Json;
          energy: number;
          free_reroll: boolean;
          hand: Json;
          id: string;
          identity_id: string;
          max_energy: number;
          player_id: Database['public']['Enums']['player_id'];
          regen: number;
          room_id: string;
          screen_id: string;
          starting_block: number;
          thorns: number;
          trait_charges: Json;
          vulnerable: number;
          weakened: number;
        };
        Insert: {
          attune_charges?: number;
          attune_target_trait?: string | null;
          block?: number;
          burn?: number;
          discard_pile?: Json;
          draw_pile?: Json;
          energy?: number;
          free_reroll?: boolean;
          hand?: Json;
          id?: string;
          identity_id?: string;
          max_energy?: number;
          player_id: Database['public']['Enums']['player_id'];
          regen?: number;
          room_id: string;
          screen_id: string;
          starting_block?: number;
          thorns?: number;
          trait_charges?: Json;
          vulnerable?: number;
          weakened?: number;
        };
        Update: {
          attune_charges?: number;
          attune_target_trait?: string | null;
          block?: number;
          burn?: number;
          discard_pile?: Json;
          draw_pile?: Json;
          energy?: number;
          free_reroll?: boolean;
          hand?: Json;
          id?: string;
          identity_id?: string;
          max_energy?: number;
          player_id?: Database['public']['Enums']['player_id'];
          regen?: number;
          room_id?: string;
          screen_id?: string;
          starting_block?: number;
          thorns?: number;
          trait_charges?: Json;
          vulnerable?: number;
          weakened?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'player_combat_state_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      player_turn_state: {
        Row: {
          actions_remaining: number;
          combat_turn_id: string;
          has_ended_turn: boolean;
          id: string;
          player_id: Database['public']['Enums']['player_id'];
        };
        Insert: {
          actions_remaining?: number;
          combat_turn_id: string;
          has_ended_turn?: boolean;
          id?: string;
          player_id: Database['public']['Enums']['player_id'];
        };
        Update: {
          actions_remaining?: number;
          combat_turn_id?: string;
          has_ended_turn?: boolean;
          id?: string;
          player_id?: Database['public']['Enums']['player_id'];
        };
        Relationships: [
          {
            foreignKeyName: 'player_turn_state_combat_turn_id_fkey';
            columns: ['combat_turn_id'];
            isOneToOne: false;
            referencedRelation: 'combat_turns';
            referencedColumns: ['id'];
          },
        ];
      };
      push_notification_dispatches: {
        Row: {
          created_at: string;
          event_id: number;
          room_id: string;
          scene_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: number;
          room_id: string;
          scene_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: number;
          room_id?: string;
          scene_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notification_dispatches_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          created_at: string;
          expo_push_token: string;
          platform: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expo_push_token: string;
          platform?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expo_push_token?: string;
          platform?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      room_events: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          id: number;
          payload_json: Json;
          room_id: string;
          type: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: number;
          payload_json?: Json;
          room_id: string;
          type: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          id?: number;
          payload_json?: Json;
          room_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_events_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      room_messages: {
        Row: {
          created_at: string;
          id: number;
          kind: Database['public']['Enums']['room_message_kind'];
          player_id: Database['public']['Enums']['player_id'] | null;
          room_id: string;
          scene_id: string;
          text: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          kind?: Database['public']['Enums']['room_message_kind'];
          player_id?: Database['public']['Enums']['player_id'] | null;
          room_id: string;
          scene_id: string;
          text: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          kind?: Database['public']['Enums']['room_message_kind'];
          player_id?: Database['public']['Enums']['player_id'] | null;
          room_id?: string;
          scene_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      room_players: {
        Row: {
          display_name: string | null;
          id: string;
          is_bot: boolean;
          is_connected: boolean;
          joined_at: string;
          player_id: Database['public']['Enums']['player_id'];
          role_id: Database['public']['Enums']['role_id'] | null;
          room_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          display_name?: string | null;
          id?: string;
          is_bot?: boolean;
          is_connected?: boolean;
          joined_at?: string;
          player_id: Database['public']['Enums']['player_id'];
          role_id?: Database['public']['Enums']['role_id'] | null;
          room_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          display_name?: string | null;
          id?: string;
          is_bot?: boolean;
          is_connected?: boolean;
          joined_at?: string;
          player_id?: Database['public']['Enums']['player_id'];
          role_id?: Database['public']['Enums']['role_id'] | null;
          room_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_players_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms: {
        Row: {
          code: string;
          created_at: string;
          current_bloc: number;
          current_screen_position: number;
          host_user_id: string;
          id: string;
          status: Database['public']['Enums']['room_status'];
          target_player_count: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          current_bloc?: number;
          current_screen_position?: number;
          host_user_id: string;
          id?: string;
          status?: Database['public']['Enums']['room_status'];
          target_player_count?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          current_bloc?: number;
          current_screen_position?: number;
          host_user_id?: string;
          id?: string;
          status?: Database['public']['Enums']['room_status'];
          target_player_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _apply_roll: {
        Args: { p_damage: number };
        Returns: Record<string, unknown>;
      };
      _draw_hand: {
        Args: { p_discard_pile: Json; p_draw_pile: Json; p_hand_size?: number };
        Returns: Json;
      };
      _draw_spell_hand: {
        Args: { p_role_id: Database['public']['Enums']['role_id'] };
        Returns: string[];
      };
      admin_delete_all_rooms: { Args: never; Returns: undefined };
      advance_screen: { Args: { p_room_id: string }; Returns: Json };
      apply_screen_effect: {
        Args: {
          p_exp_delta?: number;
          p_gold_delta?: number;
          p_hp_delta?: number;
          p_room_id: string;
        };
        Returns: Json;
      };
      cancel_adventure: { Args: { p_room_id: string }; Returns: boolean };
      combat_bot_turn: {
        Args: {
          p_bot_player_id: Database['public']['Enums']['player_id'];
          p_room_id: string;
        };
        Returns: Json;
      };
      combat_check_level_up: { Args: { p_char_id: string }; Returns: undefined };
      combat_end_turn: { Args: { p_room_id: string }; Returns: Json };
      combat_enemy_phase: { Args: { p_room_id: string }; Returns: Json };
      combat_generate_rewards: { Args: { p_room_id: string }; Returns: Json };
      combat_init_turn: {
        Args: { p_room_id: string; p_screen_id: string };
        Returns: undefined;
      };
      combat_play_card: {
        Args: {
          p_attune_trait?: string;
          p_hand_index: number;
          p_room_id: string;
          p_target_enemy_idx?: number;
          p_use_attune?: boolean;
        };
        Returns: Json;
      };
      combat_reroll_hand: { Args: { p_room_id: string }; Returns: undefined };
      combat_select_reward: {
        Args: { p_reward_id: string; p_reward_type: string; p_room_id: string };
        Returns: Json;
      };
      combat_use_convergence:
        | {
            Args: { p_room_id: string; p_target_enemy_id?: string };
            Returns: Json;
          }
        | {
            Args: { p_room_id: string; p_target_enemy_idx?: number };
            Returns: Json;
          };
      create_playtest: {
        Args: {
          p_bloc?: number;
          p_bot_count?: number;
          p_display_name?: string;
          p_enemy_count?: number;
          p_role_id?: Database['public']['Enums']['role_id'];
          p_screen_type: Database['public']['Enums']['screen_type'];
        };
        Returns: string;
      };
      create_room: {
        Args: {
          p_display_name?: string;
          p_role_id?: Database['public']['Enums']['role_id'];
        };
        Returns: {
          room_code: string;
          room_id: string;
        }[];
      };
      delete_room: { Args: { p_room_id: string }; Returns: boolean };
      generate_adventure: { Args: { p_room_id: string }; Returns: number };
      generate_room_code: { Args: { p_length?: number }; Returns: string };
      is_room_member: { Args: { p_room_id: string }; Returns: boolean };
      join_room: {
        Args: {
          p_code: string;
          p_display_name?: string;
          p_role_id?: Database['public']['Enums']['role_id'];
        };
        Returns: string;
      };
      leave_room: { Args: { p_room_id: string }; Returns: boolean };
      list_available_rooms: {
        Args: never;
        Returns: {
          created_at: string;
          host_name: string;
          player_count: number;
          room_code: string;
          room_id: string;
          room_status: Database['public']['Enums']['room_status'];
        }[];
      };
      list_my_rooms: {
        Args: never;
        Returns: {
          created_at: string;
          host_name: string;
          is_host: boolean;
          player_count: number;
          room_code: string;
          room_id: string;
          room_status: Database['public']['Enums']['room_status'];
        }[];
      };
      peek_room: {
        Args: { p_code: string };
        Returns: {
          player_count: number;
          room_id: string;
          room_status: Database['public']['Enums']['room_status'];
          taken_roles: Database['public']['Enums']['role_id'][];
        }[];
      };
      random_core_screen_type: {
        Args: never;
        Returns: Database['public']['Enums']['screen_type'];
      };
      random_int: { Args: { p_max: number; p_min: number }; Returns: number };
      reset_combat: { Args: { p_room_id: string }; Returns: undefined };
      rest_heal: {
        Args: { p_restore_percent?: number; p_room_id: string };
        Returns: number;
      };
      seed_enemies: { Args: { p_room_id: string }; Returns: number };
      seed_enemies_for_screen: {
        Args: { p_room_id: string; p_screen_id: string };
        Returns: number;
      };
      send_room_emote: {
        Args: { p_emote: string; p_room_id: string; p_scene_id: string };
        Returns: number;
      };
      set_push_subscription: {
        Args: { p_platform?: string; p_token: string };
        Returns: boolean;
      };
      shop_purchase: {
        Args: {
          p_exp_delta?: number;
          p_hp_delta?: number;
          p_item_cost: number;
          p_room_id: string;
        };
        Returns: Json;
      };
      story_confirm_option: {
        Args: {
          p_next_scene_id: string;
          p_option_id: string;
          p_room_id: string;
          p_scene_id: string;
          p_step_id: string;
        };
        Returns: number;
      };
      story_continue_scene: {
        Args: { p_room_id: string; p_scene_id: string };
        Returns: number;
      };
      story_current_scene_id: { Args: { p_room_id: string }; Returns: string };
      story_last_reset_id: { Args: { p_room_id: string }; Returns: number };
      story_next_scene_id: { Args: { p_scene_id: string }; Returns: string };
      story_reset: {
        Args: { p_room_id: string; p_start_scene_id?: string };
        Returns: number;
      };
      story_resolve_combat: {
        Args: {
          p_next_scene_id: string;
          p_option_id: string;
          p_room_id: string;
          p_scene_id: string;
        };
        Returns: number;
      };
      story_resolve_timed_scene: {
        Args: {
          p_force: boolean;
          p_next_scene_id: string;
          p_option_id: string;
          p_room_id: string;
          p_scene_id: string;
        };
        Returns: number;
      };
      story_select_option: {
        Args: {
          p_option_id: string;
          p_room_id: string;
          p_scene_id: string;
          p_step_id: string;
        };
        Returns: number;
      };
      story_select_role: {
        Args: {
          p_role_id: Database['public']['Enums']['role_id'];
          p_room_id: string;
        };
        Returns: boolean;
      };
      story_set_display_name: {
        Args: { p_display_name: string; p_room_id: string };
        Returns: boolean;
      };
      story_set_target_player_count: {
        Args: { p_room_id: string; p_target_player_count: number };
        Returns: number;
      };
      story_start_adventure: {
        Args: { p_room_id: string; p_start_scene_id?: string };
        Returns: number;
      };
      story_start_timer: {
        Args: {
          p_duration_seconds: number;
          p_room_id: string;
          p_scene_id: string;
          p_step_id: string;
        };
        Returns: number;
      };
      story_take_action: {
        Args: {
          p_action_id: string;
          p_room_id: string;
          p_scene_id: string;
          p_step_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      phase_type: 'early' | 'core' | 'resolve';
      player_id: 'p1' | 'p2' | 'p3';
      role_id: 'sage' | 'warrior' | 'ranger';
      room_message_kind: 'player' | 'separator' | 'system';
      room_status: 'lobby' | 'in_progress' | 'finished';
      screen_type: 'combat' | 'narrative_choice' | 'puzzle' | 'shop' | 'boss_fight' | 'rest';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      phase_type: ['early', 'core', 'resolve'],
      player_id: ['p1', 'p2', 'p3'],
      role_id: ['sage', 'warrior', 'ranger'],
      room_message_kind: ['player', 'separator', 'system'],
      room_status: ['lobby', 'in_progress', 'finished'],
      screen_type: ['combat', 'narrative_choice', 'puzzle', 'shop', 'boss_fight', 'rest'],
    },
  },
} as const;
