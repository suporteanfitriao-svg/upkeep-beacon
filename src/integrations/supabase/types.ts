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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auto_release_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          property_id: string
          schedule_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          property_id: string
          schedule_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          property_id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_release_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_release_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_rate_audit_logs: {
        Row: {
          action: string
          cleaning_rate_id: string | null
          created_at: string
          id: string
          new_is_required: boolean
          new_rate_value: number
          previous_is_required: boolean | null
          previous_rate_value: number | null
          property_id: string
          team_member_id: string
          user_id: string
        }
        Insert: {
          action: string
          cleaning_rate_id?: string | null
          created_at?: string
          id?: string
          new_is_required: boolean
          new_rate_value: number
          previous_is_required?: boolean | null
          previous_rate_value?: number | null
          property_id: string
          team_member_id: string
          user_id: string
        }
        Update: {
          action?: string
          cleaning_rate_id?: string | null
          created_at?: string
          id?: string
          new_is_required?: boolean
          new_rate_value?: number
          previous_is_required?: boolean | null
          previous_rate_value?: number | null
          property_id?: string
          team_member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_rate_audit_logs_cleaning_rate_id_fkey"
            columns: ["cleaning_rate_id"]
            isOneToOne: false
            referencedRelation: "cleaning_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_rates: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          property_id: string
          rate_value: number
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          property_id: string
          rate_value: number
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          property_id?: string
          rate_value?: number
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_rates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_rates_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      default_checklists: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      house_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          priority: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          checklist_id: string | null
          checklist_state: Json | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          description: string | null
          history: Json | null
          id: string
          notes: string | null
          original_checklist_state: Json | null
          property_id: string | null
          property_name: string
          scheduled_date: string
          scheduled_time: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          verification_comment: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          checklist_id?: string | null
          checklist_state?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          description?: string | null
          history?: Json | null
          id?: string
          notes?: string | null
          original_checklist_state?: Json | null
          property_id?: string | null
          property_name: string
          scheduled_date: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verification_comment?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          checklist_id?: string | null
          checklist_state?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          description?: string | null
          history?: Json | null
          id?: string
          notes?: string | null
          original_checklist_state?: Json | null
          property_id?: string | null
          property_name?: string
          scheduled_date?: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verification_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "property_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          property_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          property_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          property_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_history: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          item_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          item_id: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string
          created_at: string
          details: string | null
          id: string
          is_active: boolean
          name: string
          photo_taken_at: string | null
          photo_url: string | null
          quantity: number
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_taken_at?: string | null
          photo_url?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_taken_at?: string | null
          photo_url?: string | null
          quantity?: number
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_issues: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          category: string
          created_at: string
          description: string
          id: string
          item_label: string | null
          photo_url: string | null
          progress_notes: Json | null
          property_id: string
          property_name: string
          reported_by: string | null
          reported_by_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          schedule_id: string | null
          severity: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          item_label?: string | null
          photo_url?: string | null
          progress_notes?: Json | null
          property_id: string
          property_name: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          schedule_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          item_label?: string | null
          photo_url?: string | null
          progress_notes?: Json | null
          property_id?: string
          property_name?: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          schedule_id?: string | null
          severity?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_settings: {
        Row: {
          auto_release_schedules: boolean
          created_at: string
          default_check_in_time: string | null
          default_check_out_time: string | null
          enable_notifications: boolean
          id: string
          require_photo_for_issues: boolean
          require_photo_per_category: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_release_schedules?: boolean
          created_at?: string
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          enable_notifications?: boolean
          id?: string
          require_photo_for_issues?: boolean
          require_photo_per_category?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_release_schedules?: boolean
          created_at?: string
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          enable_notifications?: boolean
          id?: string
          require_photo_for_issues?: boolean
          require_photo_per_category?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          property_id: string | null
          schedule_id: string | null
          team_member_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          property_id?: string | null
          schedule_id?: string | null
          team_member_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          property_id?: string | null
          schedule_id?: string | null
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_audit_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_audit_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_audit_logs_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activated_at: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          must_reset_password: boolean | null
          name: string | null
          reset_token_expires_at: string | null
          reset_token_hash: string | null
          team_member_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean | null
          must_reset_password?: boolean | null
          name?: string | null
          reset_token_expires_at?: string | null
          reset_token_hash?: string | null
          team_member_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          must_reset_password?: boolean | null
          name?: string | null
          reset_token_expires_at?: string | null
          reset_token_hash?: string | null
          team_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          airbnb_ical_url: string | null
          auto_release_before_checkout_enabled: boolean
          auto_release_before_checkout_minutes: number | null
          auto_release_on_checkout: boolean
          created_at: string
          default_check_in_time: string | null
          default_check_out_time: string | null
          global_access_password: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          password_mode: Database["public"]["Enums"]["property_password_mode"]
          property_code: string | null
          require_checklist: boolean
          require_photo_for_issues: boolean
          require_photo_per_category: boolean
          updated_at: string
        }
        Insert: {
          address?: string | null
          airbnb_ical_url?: string | null
          auto_release_before_checkout_enabled?: boolean
          auto_release_before_checkout_minutes?: number | null
          auto_release_on_checkout?: boolean
          created_at?: string
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          global_access_password?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          password_mode?: Database["public"]["Enums"]["property_password_mode"]
          property_code?: string | null
          require_checklist?: boolean
          require_photo_for_issues?: boolean
          require_photo_per_category?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          airbnb_ical_url?: string | null
          auto_release_before_checkout_enabled?: boolean
          auto_release_before_checkout_minutes?: number | null
          auto_release_on_checkout?: boolean
          created_at?: string
          default_check_in_time?: string | null
          default_check_out_time?: string | null
          global_access_password?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          password_mode?: Database["public"]["Enums"]["property_password_mode"]
          property_code?: string | null
          require_checklist?: boolean
          require_photo_for_issues?: boolean
          require_photo_per_category?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      property_checklists: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          items: Json
          name: string
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          items?: Json
          name?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          items?: Json
          name?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_checklists_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_config_audit_logs: {
        Row: {
          config_key: string
          created_at: string
          id: string
          new_value: string
          previous_value: string | null
          property_id: string
          role: string
          team_member_id: string | null
          user_id: string
        }
        Insert: {
          config_key: string
          created_at?: string
          id?: string
          new_value: string
          previous_value?: string | null
          property_id: string
          role: string
          team_member_id?: string | null
          user_id: string
        }
        Update: {
          config_key?: string
          created_at?: string
          id?: string
          new_value?: string
          previous_value?: string | null
          property_id?: string
          role?: string
          team_member_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_config_audit_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_config_audit_logs_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      property_ical_sources: {
        Row: {
          created_at: string
          custom_name: string | null
          ical_url: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          property_id: string
          reservations_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          ical_url: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          property_id: string
          reservations_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          ical_url?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          property_id?: string
          reservations_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_ical_sources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          description: string | null
          external_id: string | null
          guest_name: string | null
          id: string
          listing_name: string | null
          number_of_guests: number | null
          property_id: string | null
          status: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          guest_name?: string | null
          id?: string
          listing_name?: string | null
          number_of_guests?: number | null
          property_id?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          guest_name?: string | null
          id?: string
          listing_name?: string | null
          number_of_guests?: number | null
          property_id?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          access_password: string | null
          ack_by_team_members: Json | null
          admin_revert_reason: string | null
          category_photos: Json | null
          check_in_time: string
          check_out_time: string
          checklist_loaded_at: string | null
          checklist_state: Json | null
          checklists: Json | null
          cleaner_avatar: string | null
          cleaner_name: string | null
          cleaner_observations: string | null
          created_at: string
          end_at: string | null
          estimated_duration: number | null
          guest_name: string | null
          history: Json | null
          id: string
          important_info: string | null
          is_active: boolean | null
          listing_name: string | null
          maintenance_issues: Json | null
          maintenance_status: string | null
          notes: string | null
          number_of_guests: number | null
          priority: string | null
          property_address: string | null
          property_id: string | null
          property_name: string
          reservation_id: string | null
          responsible_team_member_id: string | null
          start_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          access_password?: string | null
          ack_by_team_members?: Json | null
          admin_revert_reason?: string | null
          category_photos?: Json | null
          check_in_time: string
          check_out_time: string
          checklist_loaded_at?: string | null
          checklist_state?: Json | null
          checklists?: Json | null
          cleaner_avatar?: string | null
          cleaner_name?: string | null
          cleaner_observations?: string | null
          created_at?: string
          end_at?: string | null
          estimated_duration?: number | null
          guest_name?: string | null
          history?: Json | null
          id?: string
          important_info?: string | null
          is_active?: boolean | null
          listing_name?: string | null
          maintenance_issues?: Json | null
          maintenance_status?: string | null
          notes?: string | null
          number_of_guests?: number | null
          priority?: string | null
          property_address?: string | null
          property_id?: string | null
          property_name: string
          reservation_id?: string | null
          responsible_team_member_id?: string | null
          start_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          access_password?: string | null
          ack_by_team_members?: Json | null
          admin_revert_reason?: string | null
          category_photos?: Json | null
          check_in_time?: string
          check_out_time?: string
          checklist_loaded_at?: string | null
          checklist_state?: Json | null
          checklists?: Json | null
          cleaner_avatar?: string | null
          cleaner_name?: string | null
          cleaner_observations?: string | null
          created_at?: string
          end_at?: string | null
          estimated_duration?: number | null
          guest_name?: string | null
          history?: Json | null
          id?: string
          important_info?: string | null
          is_active?: boolean | null
          listing_name?: string | null
          maintenance_issues?: Json | null
          maintenance_status?: string | null
          notes?: string | null
          number_of_guests?: number | null
          priority?: string | null
          property_address?: string | null
          property_id?: string | null
          property_name?: string
          reservation_id?: string | null
          responsible_team_member_id?: string | null
          start_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_responsible_team_member_id_fkey"
            columns: ["responsible_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          team_member_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          team_member_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          team_member_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_member_audit_logs_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_properties: {
        Row: {
          created_at: string
          id: string
          property_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_properties_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          activated_at: string | null
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          cpf: string
          created_at: string
          email: string
          has_all_properties: boolean
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          activated_at?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cpf: string
          created_at?: string
          email: string
          has_all_properties?: boolean
          id?: string
          is_active?: boolean
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          activated_at?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cpf?: string
          created_at?: string
          email?: string
          has_all_properties?: boolean
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
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
      waitlist: {
        Row: {
          challenges: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          name: string
          property_count: string
          property_link: string | null
          property_type: string | null
          property_type_other: string | null
          state: string | null
          whatsapp: string
        }
        Insert: {
          challenges?: string | null
          city?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          property_count: string
          property_link?: string | null
          property_type?: string | null
          property_type_other?: string | null
          state?: string | null
          whatsapp: string
        }
        Update: {
          challenges?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          property_count?: string
          property_link?: string | null
          property_type?: string | null
          property_type_other?: string | null
          state?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_schedule_history: {
        Args: {
          p_action: string
          p_from_status: string
          p_payload?: Json
          p_schedule_id: string
          p_team_member_id: string
          p_to_status: string
        }
        Returns: undefined
      }
      can_deactivate_checklist: {
        Args: { p_checklist_id?: string; p_property_id: string }
        Returns: Json
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_property_access: { Args: { p_property_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cleaner_assigned_to_schedule: {
        Args: { p_schedule_id: string }
        Returns: boolean
      }
      is_schedule_completed: {
        Args: { p_schedule_id: string }
        Returns: boolean
      }
      log_password_action: {
        Args: {
          p_action: string
          p_property_id: string
          p_schedule_id: string
          p_team_member_id: string
        }
        Returns: undefined
      }
      validate_schedule_status_transition: {
        Args: {
          p_from_status: string
          p_is_revert?: boolean
          p_to_status: string
          p_user_role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "cleaner"
      property_password_mode: "ical" | "manual" | "global"
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
      app_role: ["admin", "manager", "cleaner"],
      property_password_mode: ["ical", "manual", "global"],
    },
  },
} as const
