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
      brand_fonts: {
        Row: {
          allowed_brands: string[]
          created_at: string
          format: string | null
          id: string
          name: string
          store_id: string | null
          url: string
          user_id: string
        }
        Insert: {
          allowed_brands?: string[]
          created_at?: string
          format?: string | null
          id?: string
          name: string
          store_id?: string | null
          url: string
          user_id: string
        }
        Update: {
          allowed_brands?: string[]
          created_at?: string
          format?: string | null
          id?: string
          name?: string
          store_id?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_fonts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guidelines: {
        Row: {
          accent_color: string | null
          arrow_style: string | null
          badge_style: string | null
          body_font_id: string | null
          brand: string
          created_at: string
          id: string
          logo_url: string | null
          name: string | null
          price_font_id: string | null
          primary_color: string | null
          secondary_color: string | null
          title_font_id: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          arrow_style?: string | null
          badge_style?: string | null
          body_font_id?: string | null
          brand: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string | null
          price_font_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          title_font_id?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          arrow_style?: string | null
          badge_style?: string | null
          body_font_id?: string | null
          brand?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string | null
          price_font_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          title_font_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_guidelines_body_font_id_fkey"
            columns: ["body_font_id"]
            isOneToOne: false
            referencedRelation: "brand_fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guidelines_price_font_id_fkey"
            columns: ["price_font_id"]
            isOneToOne: false
            referencedRelation: "brand_fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guidelines_title_font_id_fkey"
            columns: ["title_font_id"]
            isOneToOne: false
            referencedRelation: "brand_fonts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          communication_style: string | null
          created_at: string
          custom_font_name: string | null
          custom_font_url: string | null
          font_family: string | null
          font_price: string | null
          font_primary: string | null
          font_secondary: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          slogan: string | null
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication_style?: string | null
          created_at?: string
          custom_font_name?: string | null
          custom_font_url?: string | null
          font_family?: string | null
          font_price?: string | null
          font_primary?: string | null
          font_secondary?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication_style?: string | null
          created_at?: string
          custom_font_name?: string | null
          custom_font_url?: string | null
          font_family?: string | null
          font_price?: string | null
          font_primary?: string | null
          font_secondary?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_posts: {
        Row: {
          channel: string
          created_at: string
          generated_content_id: string | null
          id: string
          scheduled_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          generated_content_id?: string | null
          id?: string
          scheduled_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          generated_content_id?: string | null
          id?: string
          scheduled_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_posts_generated_content_id_fkey"
            columns: ["generated_content_id"]
            isOneToOne: false
            referencedRelation: "generated_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_items: {
        Row: {
          campaign_id: string
          catalog_promotion_id: string | null
          category: string | null
          created_at: string
          creation_mode: string | null
          discount_percent: number | null
          end_date: string | null
          final_visual_url: string | null
          generated_caption: string | null
          id: string
          old_price: number | null
          product_name: string
          promo_price: number | null
          recommended_date: string | null
          recommended_format: string | null
          recommended_platform: string | null
          recommended_time: string | null
          scheduled_post_id: string | null
          source_image_url: string | null
          start_date: string | null
          status: string
          store_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          catalog_promotion_id?: string | null
          category?: string | null
          created_at?: string
          creation_mode?: string | null
          discount_percent?: number | null
          end_date?: string | null
          final_visual_url?: string | null
          generated_caption?: string | null
          id?: string
          old_price?: number | null
          product_name: string
          promo_price?: number | null
          recommended_date?: string | null
          recommended_format?: string | null
          recommended_platform?: string | null
          recommended_time?: string | null
          scheduled_post_id?: string | null
          source_image_url?: string | null
          start_date?: string | null
          status?: string
          store_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          catalog_promotion_id?: string | null
          category?: string | null
          created_at?: string
          creation_mode?: string | null
          discount_percent?: number | null
          end_date?: string | null
          final_visual_url?: string | null
          generated_caption?: string | null
          id?: string
          old_price?: number | null
          product_name?: string
          promo_price?: number | null
          recommended_date?: string | null
          recommended_format?: string | null
          recommended_platform?: string | null
          recommended_time?: string | null
          scheduled_post_id?: string | null
          source_image_url?: string | null
          start_date?: string | null
          status?: string
          store_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recommendations: {
        Row: {
          caption: string | null
          catalog_promotion_id: string
          created_at: string
          creative_angle: string | null
          id: string
          recommended_date: string | null
          recommended_format: string | null
          recommended_platform: string | null
          recommended_time: string | null
          scheduled_post_id: string | null
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
          visual_brief: string | null
        }
        Insert: {
          caption?: string | null
          catalog_promotion_id: string
          created_at?: string
          creative_angle?: string | null
          id?: string
          recommended_date?: string | null
          recommended_format?: string | null
          recommended_platform?: string | null
          recommended_time?: string | null
          scheduled_post_id?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
          visual_brief?: string | null
        }
        Update: {
          caption?: string | null
          catalog_promotion_id?: string
          created_at?: string
          creative_angle?: string | null
          id?: string
          recommended_date?: string | null
          recommended_format?: string | null
          recommended_platform?: string | null
          recommended_time?: string | null
          scheduled_post_id?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
          visual_brief?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recommendations_catalog_promotion_id_fkey"
            columns: ["catalog_promotion_id"]
            isOneToOne: false
            referencedRelation: "catalog_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          catalog_import_id: string | null
          created_at: string
          id: string
          name: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          catalog_import_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          catalog_import_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_imports: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          page_count: number | null
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          page_count?: number | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          page_count?: number | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_pages: {
        Row: {
          analyzed_at: string | null
          catalog_import_id: string
          created_at: string
          error_message: string | null
          id: string
          notes: string | null
          page_image_url: string | null
          page_number: number
          promotions_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string | null
          catalog_import_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          page_image_url?: string | null
          page_number: number
          promotions_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analyzed_at?: string | null
          catalog_import_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          page_image_url?: string | null
          page_number?: number
          promotions_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_pages_catalog_import_id_fkey"
            columns: ["catalog_import_id"]
            isOneToOne: false
            referencedRelation: "catalog_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_promotions: {
        Row: {
          catalog_import_id: string
          category: string | null
          confidence: number | null
          created_at: string
          creation_mode: string | null
          crop_coordinates: Json | null
          detection_source: string
          discount_percent: number | null
          end_date: string | null
          id: string
          missing_fields: Json | null
          old_price: number | null
          page_image_url: string | null
          page_number: number | null
          product_image_url: string | null
          product_name: string
          promo_price: number | null
          recommendation_reason: string | null
          selected: boolean
          social_score: number | null
          start_date: string | null
          store_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          catalog_import_id: string
          category?: string | null
          confidence?: number | null
          created_at?: string
          creation_mode?: string | null
          crop_coordinates?: Json | null
          detection_source?: string
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          missing_fields?: Json | null
          old_price?: number | null
          page_image_url?: string | null
          page_number?: number | null
          product_image_url?: string | null
          product_name: string
          promo_price?: number | null
          recommendation_reason?: string | null
          selected?: boolean
          social_score?: number | null
          start_date?: string | null
          store_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          catalog_import_id?: string
          category?: string | null
          confidence?: number | null
          created_at?: string
          creation_mode?: string | null
          crop_coordinates?: Json | null
          detection_source?: string
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          missing_fields?: Json | null
          old_price?: number | null
          page_image_url?: string | null
          page_number?: number | null
          product_image_url?: string | null
          product_name?: string
          promo_price?: number | null
          recommendation_reason?: string | null
          selected?: boolean
          social_score?: number | null
          start_date?: string | null
          store_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_promotions_catalog_import_id_fkey"
            columns: ["catalog_import_id"]
            isOneToOne: false
            referencedRelation: "catalog_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      created_visuals: {
        Row: {
          config_json: Json
          created_at: string
          format: string
          id: string
          image_url: string | null
          promotion_id: string | null
          source_image_url: string | null
          source_type: string
          store_id: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          format: string
          id?: string
          image_url?: string | null
          promotion_id?: string | null
          source_image_url?: string | null
          source_type?: string
          store_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          format?: string
          id?: string
          image_url?: string | null
          promotion_id?: string | null
          source_image_url?: string | null
          source_type?: string
          store_id?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creation_presets: {
        Row: {
          brand: string
          config_json: Json
          created_at: string
          format: string
          graphic_asset_ids: string[]
          id: string
          is_active: boolean
          name: string
          price_font_id: string | null
          template_id: string | null
          title_font_id: string | null
          updated_at: string
        }
        Insert: {
          brand?: string
          config_json?: Json
          created_at?: string
          format: string
          graphic_asset_ids?: string[]
          id?: string
          is_active?: boolean
          name: string
          price_font_id?: string | null
          template_id?: string | null
          title_font_id?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          config_json?: Json
          created_at?: string
          format?: string
          graphic_asset_ids?: string[]
          id?: string
          is_active?: boolean
          name?: string
          price_font_id?: string | null
          template_id?: string | null
          title_font_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_presets_price_font_id_fkey"
            columns: ["price_font_id"]
            isOneToOne: false
            referencedRelation: "font_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_presets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_presets_title_font_id_fkey"
            columns: ["title_font_id"]
            isOneToOne: false
            referencedRelation: "font_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      font_assets: {
        Row: {
          brand: string | null
          created_at: string
          family: string
          file_url: string
          id: string
          is_active: boolean
          name: string
          style: string
          updated_at: string
          usage: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          family: string
          file_url: string
          id?: string
          is_active?: boolean
          name: string
          style?: string
          updated_at?: string
          usage?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          family?: string
          file_url?: string
          id?: string
          is_active?: boolean
          name?: string
          style?: string
          updated_at?: string
          usage?: string
        }
        Relationships: []
      }
      generated_contents: {
        Row: {
          content_text: string
          content_type: string
          created_at: string
          id: string
          promotion_id: string | null
          reel_idea: string | null
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_text: string
          content_type: string
          created_at?: string
          id?: string
          promotion_id?: string | null
          reel_idea?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_text?: string
          content_type?: string
          created_at?: string
          id?: string
          promotion_id?: string | null
          reel_idea?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_contents_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      graphic_assets: {
        Row: {
          brand: string | null
          created_at: string
          file_url: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          file_url: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          file_url?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_connections: {
        Row: {
          created_at: string
          fb_user_id: string | null
          fb_user_name: string | null
          id: string
          ig_business_id: string | null
          ig_username: string | null
          page_access_token: string | null
          page_id: string | null
          page_name: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_access_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_access_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          ig_business_id?: string | null
          ig_username?: string | null
          page_access_token?: string | null
          page_id?: string | null
          page_name?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_access_token?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          free_posts_used: number
          id: string
          name: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          free_posts_used?: number
          id: string
          name?: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          free_posts_used?: number
          id?: string
          name?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          category: string | null
          created_at: string
          end_date: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          old_price: number | null
          photo_url: string | null
          price: number | null
          product_name: string
          start_date: string | null
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          old_price?: number | null
          photo_url?: string | null
          price?: number | null
          product_name: string
          start_date?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          old_price?: number | null
          photo_url?: string | null
          price?: number | null
          product_name?: string
          start_date?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string
          created_at: string
          format: string | null
          generated_content_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          platforms: string[]
          post_type: string
          promotion_id: string | null
          scheduled_at: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          format?: string | null
          generated_content_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          platforms?: string[]
          post_type?: string
          promotion_id?: string | null
          scheduled_at: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          format?: string | null
          generated_content_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          platforms?: string[]
          post_type?: string
          promotion_id?: string | null
          scheduled_at?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          banner: string
          city: string | null
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          name: string
          store_brand: string | null
          strong_departments: string[]
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banner: string
          city?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          name: string
          store_brand?: string | null
          strong_departments?: string[]
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banner?: string
          city?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          name?: string
          store_brand?: string | null
          strong_departments?: string[]
          tone?: string | null
          updated_at?: string
          user_id?: string
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
      visual_templates: {
        Row: {
          allowed_brands: string[]
          brand: string | null
          category: string
          config_json: Json
          created_at: string
          format: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          preview_url: string | null
          updated_at: string
        }
        Insert: {
          allowed_brands?: string[]
          brand?: string | null
          category: string
          config_json?: Json
          created_at?: string
          format: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          preview_url?: string | null
          updated_at?: string
        }
        Update: {
          allowed_brands?: string[]
          brand?: string | null
          category?: string
          config_json?: Json
          created_at?: string
          format?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          preview_url?: string | null
          updated_at?: string
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
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
