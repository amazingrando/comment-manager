export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          figma_user_id: string;
          email: string;
          handle: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          figma_user_id: string;
          email: string;
          handle: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          figma_user_id?: string;
          email?: string;
          handle?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      column_sets: {
        Row: {
          id: string;
          user_id: string;
          file_key: string | null;
          columns: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_key?: string | null;
          columns: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_key?: string | null;
          columns?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      figma_user_tokens: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string | null;
          expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      plugin_oauth_handoffs: {
        Row: {
          read_key: string;
          write_key_hash: string;
          payload: Json | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          read_key: string;
          write_key_hash: string;
          payload?: Json | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          read_key?: string;
          write_key_hash?: string;
          payload?: Json | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          file_key: string;
          figma_comment_id: string;
          column_id: string;
          sort_rank: number;
          reply_count: number;
          figma_message: string;
          node_id: string | null;
          page_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_key: string;
          figma_comment_id: string;
          column_id: string;
          sort_rank?: number;
          reply_count?: number;
          figma_message?: string;
          node_id?: string | null;
          page_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_key?: string;
          figma_comment_id?: string;
          column_id?: string;
          sort_rank?: number;
          reply_count?: number;
          figma_message?: string;
          node_id?: string | null;
          page_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type ColumnSet = Database["public"]["Tables"]["column_sets"]["Row"];
export type AppUser = Database["public"]["Tables"]["users"]["Row"];
