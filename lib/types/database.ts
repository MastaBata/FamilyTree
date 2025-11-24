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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_verified: boolean
          subscription_status: string
          subscription_expires_at: string | null
          storage_used_bytes: number
          storage_limit_bytes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          subscription_status?: string
          subscription_expires_at?: string | null
          storage_used_bytes?: number
          storage_limit_bytes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          subscription_status?: string
          subscription_expires_at?: string | null
          storage_used_bytes?: number
          storage_limit_bytes?: number
          created_at?: string
          updated_at?: string
        }
      }
      trees: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          share_code: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          share_code?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          share_code?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tree_members: {
        Row: {
          id: string
          tree_id: string
          user_id: string
          role: string
          linked_person_id: string | null
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          user_id: string
          role?: string
          linked_person_id?: string | null
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          user_id?: string
          role?: string
          linked_person_id?: string | null
          invited_by?: string | null
          joined_at?: string
        }
      }
      persons: {
        Row: {
          id: string
          tree_id: string
          first_name: string
          last_name: string | null
          middle_name: string | null
          maiden_name: string | null
          gender: string | null
          birth_date: string | null
          birth_date_approximate: boolean
          death_date: string | null
          death_date_approximate: boolean
          is_alive: boolean
          birth_place: string | null
          death_place: string | null
          current_location: string | null
          bio: string | null
          occupation: string | null
          religion: string | null
          avatar_url: string | null
          is_verified: boolean
          verified_at: string | null
          verified_by: string | null
          linked_user_id: string | null
          position_x: number
          position_y: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          first_name: string
          last_name?: string | null
          middle_name?: string | null
          maiden_name?: string | null
          gender?: string | null
          birth_date?: string | null
          birth_date_approximate?: boolean
          death_date?: string | null
          death_date_approximate?: boolean
          is_alive?: boolean
          birth_place?: string | null
          death_place?: string | null
          current_location?: string | null
          bio?: string | null
          occupation?: string | null
          religion?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          linked_user_id?: string | null
          position_x?: number
          position_y?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          first_name?: string
          last_name?: string | null
          middle_name?: string | null
          maiden_name?: string | null
          gender?: string | null
          birth_date?: string | null
          birth_date_approximate?: boolean
          death_date?: string | null
          death_date_approximate?: boolean
          is_alive?: boolean
          birth_place?: string | null
          death_place?: string | null
          current_location?: string | null
          bio?: string | null
          occupation?: string | null
          religion?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          linked_user_id?: string | null
          position_x?: number
          position_y?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      relations: {
        Row: {
          id: string
          tree_id: string
          person1_id: string
          person2_id: string
          relation_type: string
          marriage_date: string | null
          divorce_date: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          person1_id: string
          person2_id: string
          relation_type: string
          marriage_date?: string | null
          divorce_date?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          person1_id?: string
          person2_id?: string
          relation_type?: string
          marriage_date?: string | null
          divorce_date?: string | null
          is_current?: boolean
          created_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          person_id: string
          uploaded_by: string | null
          url: string
          thumbnail_url: string | null
          original_filename: string | null
          file_size_bytes: number | null
          title: string | null
          description: string | null
          taken_at: string | null
          is_primary: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          person_id: string
          uploaded_by?: string | null
          url: string
          thumbnail_url?: string | null
          original_filename?: string | null
          file_size_bytes?: number | null
          title?: string | null
          description?: string | null
          taken_at?: string | null
          is_primary?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          uploaded_by?: string | null
          url?: string
          thumbnail_url?: string | null
          original_filename?: string | null
          file_size_bytes?: number | null
          title?: string | null
          description?: string | null
          taken_at?: string | null
          is_primary?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          person_id: string
          uploaded_by: string | null
          url: string
          original_filename: string | null
          file_type: string | null
          file_size_bytes: number | null
          title: string | null
          description: string | null
          duration_seconds: number | null
          transcription: string | null
          created_at: string
        }
        Insert: {
          id?: string
          person_id: string
          uploaded_by?: string | null
          url: string
          original_filename?: string | null
          file_type?: string | null
          file_size_bytes?: number | null
          title?: string | null
          description?: string | null
          duration_seconds?: number | null
          transcription?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          uploaded_by?: string | null
          url?: string
          original_filename?: string | null
          file_type?: string | null
          file_size_bytes?: number | null
          title?: string | null
          description?: string | null
          duration_seconds?: number | null
          transcription?: string | null
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          tree_id: string
          code: string
          role: string
          invited_by: string | null
          invited_email: string | null
          used_by: string | null
          used_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tree_id: string
          code: string
          role?: string
          invited_by?: string | null
          invited_email?: string | null
          used_by?: string | null
          used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tree_id?: string
          code?: string
          role?: string
          invited_by?: string | null
          invited_email?: string | null
          used_by?: string | null
          used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
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
