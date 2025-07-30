/**
 * Database Types for TeaKE - Supabase Generated Types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TagType = 'red_flag' | 'good_vibes' | 'unsure';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone?: string | null
          email?: string | null
          nickname?: string | null
          verified: boolean
          verification_status: 'pending' | 'approved' | 'rejected'
          id_image_url?: string | null
          id_type?: 'school_id' | 'national_id' | null
          rejection_reason?: string | null
          verified_at?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone?: string | null
          email?: string | null
          nickname?: string | null
          verified?: boolean
          verification_status?: 'pending' | 'approved' | 'rejected'
          id_image_url?: string | null
          id_type?: 'school_id' | 'national_id' | null
          rejection_reason?: string | null
          verified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          nickname?: string | null
          verified?: boolean
          verification_status?: 'pending' | 'approved' | 'rejected'
          id_image_url?: string | null
          id_type?: 'school_id' | 'national_id' | null
          rejection_reason?: string | null
          verified_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      guys: {
        Row: {
          id: string
          name?: string | null
          phone?: string | null
          socials?: string | null
          location?: string | null
          age?: number | null
          created_by_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          phone?: string | null
          socials?: string | null
          location?: string | null
          age?: number | null
          created_by_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          socials?: string | null
          location?: string | null
          age?: number | null
          created_by_user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guys_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          guy_id: string
          user_id: string
          text: string
          tags: TagType[]
          image_url?: string | null
          anonymous: boolean
          nickname?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          guy_id: string
          user_id: string
          text: string
          tags: TagType[]
          image_url?: string | null
          anonymous?: boolean
          nickname?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          guy_id?: string
          user_id?: string
          text?: string
          tags?: TagType[]
          image_url?: string | null
          anonymous?: boolean
          nickname?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_guy_id_fkey"
            columns: ["guy_id"]
            isOneToOne: false
            referencedRelation: "guys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          story_id: string
          user_id: string
          text: string
          anonymous: boolean
          nickname?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          text: string
          anonymous?: boolean
          nickname?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          text?: string
          anonymous?: boolean
          nickname?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          text: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          text: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          text?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tag_type: 'red_flag' | 'good_vibes' | 'unsure'
      verification_status: 'pending' | 'approved' | 'rejected'
      id_type: 'school_id' | 'national_id'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}