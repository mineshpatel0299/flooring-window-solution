// Database types generated from Supabase schema
// This file should be regenerated using: npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          type: 'floor' | 'window'
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          type: 'floor' | 'window'
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          type?: 'floor' | 'window'
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      textures: {
        Row: {
          id: string
          name: string
          slug: string
          category_id: string | null
          type: 'floor' | 'window'
          image_url: string
          thumbnail_url: string | null
          description: string | null
          material_type: string | null
          color: string | null
          pattern: string | null
          width_cm: number | null
          height_cm: number | null
          is_active: boolean
          is_featured: boolean
          sort_order: number
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category_id?: string | null
          type: 'floor' | 'window'
          image_url: string
          thumbnail_url?: string | null
          description?: string | null
          material_type?: string | null
          color?: string | null
          pattern?: string | null
          width_cm?: number | null
          height_cm?: number | null
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category_id?: string | null
          type?: 'floor' | 'window'
          image_url?: string
          thumbnail_url?: string | null
          description?: string | null
          material_type?: string | null
          color?: string | null
          pattern?: string | null
          width_cm?: number | null
          height_cm?: number | null
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          session_token: string
          fingerprint: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_token: string
          fingerprint?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_token?: string
          fingerprint?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          session_id: string | null
          name: string
          type: 'floor' | 'window'
          original_image_url: string
          processed_image_url: string | null
          thumbnail_url: string | null
          segmentation_data: Json | null
          texture_id: string | null
          canvas_settings: Json | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          name?: string
          type: 'floor' | 'window'
          original_image_url: string
          processed_image_url?: string | null
          thumbnail_url?: string | null
          segmentation_data?: Json | null
          texture_id?: string | null
          canvas_settings?: Json | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          name?: string
          type?: 'floor' | 'window'
          original_image_url?: string
          processed_image_url?: string | null
          thumbnail_url?: string | null
          segmentation_data?: Json | null
          texture_id?: string | null
          canvas_settings?: Json | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
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
  }
}
