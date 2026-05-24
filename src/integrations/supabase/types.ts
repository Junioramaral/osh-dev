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
      application_instances: {
        Row: {
          active_modules: Json | null
          client_id: string
          created_at: string | null
          criticality: Database["public"]["Enums"]["criticality_level"] | null
          environment: Database["public"]["Enums"]["environment_type"]
          id: string
          integrations: Json | null
          machine_id: string | null
          product_id: string
          updated_at: string | null
          version: string
        }
        Insert: {
          active_modules?: Json | null
          client_id: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          environment: Database["public"]["Enums"]["environment_type"]
          id?: string
          integrations?: Json | null
          machine_id?: string | null
          product_id: string
          updated_at?: string | null
          version: string
        }
        Update: {
          active_modules?: Json | null
          client_id?: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          environment?: Database["public"]["Enums"]["environment_type"]
          id?: string
          integrations?: Json | null
          machine_id?: string | null
          product_id?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_instances_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_instances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "application_products"
            referencedColumns: ["id"]
          },
        ]
      }
      application_products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          modules: Json | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          modules?: Json | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          modules?: Json | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_overtime: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_overtime?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_overtime?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          app_product_ids: string[] | null
          cnpj: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          db_engines: string[] | null
          domain: string | null
          id: string
          is_active: boolean | null
          max_users: number | null
          name: string
          receive_monthly_report: boolean | null
          segments: string[] | null
          sla_app_p1_first_response: number | null
          sla_app_p1_resolution: number | null
          sla_app_p2_first_response: number | null
          sla_app_p2_resolution: number | null
          sla_app_p3_first_response: number | null
          sla_app_p3_resolution: number | null
          sla_app_p4_first_response: number | null
          sla_app_p4_resolution: number | null
          sla_db_p1_first_response: number | null
          sla_db_p1_resolution: number | null
          sla_db_p2_first_response: number | null
          sla_db_p2_resolution: number | null
          sla_db_p3_first_response: number | null
          sla_db_p3_resolution: number | null
          sla_db_p4_first_response: number | null
          sla_db_p4_resolution: number | null
          status: string | null
          tags: string[] | null
          tenant_type: string | null
          updated_at: string | null
        }
        Insert: {
          app_product_ids?: string[] | null
          cnpj?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          db_engines?: string[] | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          name: string
          receive_monthly_report?: boolean | null
          segments?: string[] | null
          sla_app_p1_first_response?: number | null
          sla_app_p1_resolution?: number | null
          sla_app_p2_first_response?: number | null
          sla_app_p2_resolution?: number | null
          sla_app_p3_first_response?: number | null
          sla_app_p3_resolution?: number | null
          sla_app_p4_first_response?: number | null
          sla_app_p4_resolution?: number | null
          sla_db_p1_first_response?: number | null
          sla_db_p1_resolution?: number | null
          sla_db_p2_first_response?: number | null
          sla_db_p2_resolution?: number | null
          sla_db_p3_first_response?: number | null
          sla_db_p3_resolution?: number | null
          sla_db_p4_first_response?: number | null
          sla_db_p4_resolution?: number | null
          status?: string | null
          tags?: string[] | null
          tenant_type?: string | null
          updated_at?: string | null
        }
        Update: {
          app_product_ids?: string[] | null
          cnpj?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          db_engines?: string[] | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          name?: string
          receive_monthly_report?: boolean | null
          segments?: string[] | null
          sla_app_p1_first_response?: number | null
          sla_app_p1_resolution?: number | null
          sla_app_p2_first_response?: number | null
          sla_app_p2_resolution?: number | null
          sla_app_p3_first_response?: number | null
          sla_app_p3_resolution?: number | null
          sla_app_p4_first_response?: number | null
          sla_app_p4_resolution?: number | null
          sla_db_p1_first_response?: number | null
          sla_db_p1_resolution?: number | null
          sla_db_p2_first_response?: number | null
          sla_db_p2_resolution?: number | null
          sla_db_p3_first_response?: number | null
          sla_db_p3_resolution?: number | null
          sla_db_p4_first_response?: number | null
          sla_db_p4_resolution?: number | null
          status?: string | null
          tags?: string[] | null
          tenant_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      database_engines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      database_instances: {
        Row: {
          client_id: string
          created_at: string | null
          criticality: Database["public"]["Enums"]["criticality_level"] | null
          endpoint: string | null
          engine: Database["public"]["Enums"]["db_engine"]
          environment: Database["public"]["Enums"]["environment_type"]
          id: string
          instance_name: string
          machine_id: string | null
          port: number | null
          tags: string[] | null
          updated_at: string | null
          version: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          endpoint?: string | null
          engine: Database["public"]["Enums"]["db_engine"]
          environment: Database["public"]["Enums"]["environment_type"]
          id?: string
          instance_name: string
          machine_id?: string | null
          port?: number | null
          tags?: string[] | null
          updated_at?: string | null
          version: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          endpoint?: string | null
          engine?: Database["public"]["Enums"]["db_engine"]
          environment?: Database["public"]["Enums"]["environment_type"]
          id?: string
          instance_name?: string
          machine_id?: string | null
          port?: number | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_instances_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_articles: {
        Row: {
          app_modules: string[] | null
          app_product_ids: string[] | null
          app_versions: string[] | null
          attachments: Json | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          db_categories: string[] | null
          db_engines: Database["public"]["Enums"]["db_engine"][] | null
          faq_number: string
          id: string
          keywords: string[] | null
          problem: string | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          solution: string | null
          status: string | null
          symptoms: string
          title: string
          updated_at: string | null
          view_count: number | null
          visibility: Database["public"]["Enums"]["faq_visibility"] | null
        }
        Insert: {
          app_modules?: string[] | null
          app_product_ids?: string[] | null
          app_versions?: string[] | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          db_categories?: string[] | null
          db_engines?: Database["public"]["Enums"]["db_engine"][] | null
          faq_number: string
          id?: string
          keywords?: string[] | null
          problem?: string | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          solution?: string | null
          status?: string | null
          symptoms: string
          title: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["faq_visibility"] | null
        }
        Update: {
          app_modules?: string[] | null
          app_product_ids?: string[] | null
          app_versions?: string[] | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          db_categories?: string[] | null
          db_engines?: Database["public"]["Enums"]["db_engine"][] | null
          faq_number?: string
          id?: string
          keywords?: string[] | null
          problem?: string | null
          segment?: Database["public"]["Enums"]["ticket_segment"]
          solution?: string | null
          status?: string | null
          symptoms?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["faq_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_articles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_history: {
        Row: {
          action_type: string
          article_id: string
          created_at: string | null
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          article_id: string
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          article_id?: string
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "faq_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          additional_users: Json | null
          client_id: string
          created_at: string | null
          criticality: Database["public"]["Enums"]["criticality_level"] | null
          description: string | null
          environment: string | null
          hostname: string
          id: string
          ip_address: string | null
          location: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          operating_system: string | null
          root_password_secret_id: string | null
          root_username: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          additional_users?: Json | null
          client_id: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          description?: string | null
          environment?: string | null
          hostname: string
          id?: string
          ip_address?: string | null
          location?: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          operating_system?: string | null
          root_password_secret_id?: string | null
          root_username?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_users?: Json | null
          client_id?: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          description?: string | null
          environment?: string | null
          hostname?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          machine_type?: Database["public"]["Enums"]["machine_type"]
          operating_system?: string | null
          root_password_secret_id?: string | null
          root_username?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      report_send_logs: {
        Row: {
          client_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          month: number
          recipients: string[]
          report_type: string
          sent_at: string | null
          status: string
          year: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          month: number
          recipients?: string[]
          report_type?: string
          sent_at?: string | null
          status?: string
          year: number
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          month?: number
          recipients?: string[]
          report_type?: string
          sent_at?: string | null
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_send_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rfc_steps: {
        Row: {
          concluded_at: string | null
          concluded_by: string | null
          created_at: string | null
          descricao: string
          id: string
          observacao: string | null
          ordem: number
          procedimento: string | null
          scripts: string | null
          started_at: string | null
          started_by: string | null
          status_concluido: boolean
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          concluded_at?: string | null
          concluded_by?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          ordem?: number
          procedimento?: string | null
          scripts?: string | null
          started_at?: string | null
          started_by?: string | null
          status_concluido?: boolean
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          concluded_at?: string | null
          concluded_by?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          ordem?: number
          procedimento?: string | null
          scripts?: string | null
          started_at?: string | null
          started_by?: string | null
          status_concluido?: boolean
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfc_steps_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sla_holidays: {
        Row: {
          created_at: string | null
          holiday_date: string
          id: string
          is_automatic: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          holiday_date: string
          id?: string
          is_automatic?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          holiday_date?: string
          id?: string
          is_automatic?: boolean | null
          name?: string
        }
        Relationships: []
      }
      sla_notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgment_token: string | null
          alert_type: Database["public"]["Enums"]["sla_alert_type"]
          created_at: string | null
          email_content: Json | null
          id: string
          notification_level: number | null
          recipients: string[]
          sent_at: string
          sla_type: string
          ticket_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_token?: string | null
          alert_type: Database["public"]["Enums"]["sla_alert_type"]
          created_at?: string | null
          email_content?: Json | null
          id?: string
          notification_level?: number | null
          recipients: string[]
          sent_at?: string
          sla_type: string
          ticket_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_token?: string | null
          alert_type?: Database["public"]["Enums"]["sla_alert_type"]
          created_at?: string | null
          email_content?: Json | null
          id?: string
          notification_level?: number | null
          recipients?: string[]
          sent_at?: string
          sla_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          segment: string
          specialization: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          segment: string
          specialization?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          segment?: string
          specialization?: string | null
        }
        Relationships: []
      }
      teams_queues: {
        Row: {
          created_at: string | null
          id: string
          queue_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          queue_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          queue_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_queues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          segment: Database["public"]["Enums"]["ticket_segment"] | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          segment?: Database["public"]["Enums"]["ticket_segment"] | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          segment?: Database["public"]["Enums"]["ticket_segment"] | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          attachments: Json | null
          author_id: string | null
          content: string
          created_at: string | null
          email_message_id: string | null
          id: string
          is_internal: boolean | null
          sender_email: string | null
          sender_name: string | null
          source: Database["public"]["Enums"]["comment_source"] | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          content: string
          created_at?: string | null
          email_message_id?: string | null
          id?: string
          is_internal?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          source?: Database["public"]["Enums"]["comment_source"] | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          email_message_id?: string | null
          id?: string
          is_internal?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          source?: Database["public"]["Enums"]["comment_source"] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sla_pauses: {
        Row: {
          created_at: string
          id: string
          pause_minutes: number | null
          paused_at: string
          paused_by: string | null
          resumed_at: string | null
          resumed_by: string | null
          status_during_pause: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pause_minutes?: number | null
          paused_at: string
          paused_by?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          status_during_pause: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pause_minutes?: number | null
          paused_at?: string
          paused_by?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          status_during_pause?: string
          ticket_id?: string
        }
        Relationships: []
      }
      ticket_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_time_logs: {
        Row: {
          analyst_id: string
          description: string | null
          end_time: string
          hours: number
          id: string
          logged_at: string | null
          project_id: string | null
          start_time: string
          ticket_id: string
          work_date: string
        }
        Insert: {
          analyst_id: string
          description?: string | null
          end_time?: string
          hours: number
          id?: string
          logged_at?: string | null
          project_id?: string | null
          start_time?: string
          ticket_id: string
          work_date?: string
        }
        Update: {
          analyst_id?: string
          description?: string | null
          end_time?: string
          hours?: number
          id?: string
          logged_at?: string | null
          project_id?: string | null
          start_time?: string
          ticket_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_time_logs_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_time_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          analyst_id: string | null
          app_environment:
            | Database["public"]["Enums"]["environment_type"]
            | null
          app_instance_id: string | null
          app_machine_id: string | null
          app_module: string | null
          app_product_id: string | null
          app_version: string | null
          business_impact: Database["public"]["Enums"]["business_impact"]
          category: string
          client_id: string
          contact_email: string
          contact_name: string
          created_at: string | null
          csat_comment: string | null
          csat_rating: number | null
          csat_submitted_at: string | null
          db_engine: Database["public"]["Enums"]["db_engine"] | null
          db_environment: Database["public"]["Enums"]["environment_type"] | null
          db_instance_id: string | null
          db_machine_id: string | null
          description: string | null
          error_displayed: string | null
          evidences: Json | null
          faq_article_id: string | null
          feedback_token: string | null
          first_response_at: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id: string
          lock_at: string | null
          lock_owner_id: string | null
          lock_status: Database["public"]["Enums"]["lock_status"] | null
          lock_ttl: number | null
          opening_reason: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          problem_faced: string
          queue_id: string | null
          record_type: string
          reproduction_steps: string | null
          resolved_at: string | null
          resolved_by: string | null
          rfc_progress: number | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          sla_adjusted_at: string | null
          sla_adjusted_by: string | null
          sla_adjustment_reason: string | null
          sla_first_response_deadline: string | null
          sla_first_response_deadline_original: string | null
          sla_first_response_met: boolean | null
          sla_paused_at: string | null
          sla_paused_total_minutes: number
          sla_resolution_deadline: string | null
          sla_resolution_deadline_original: string | null
          sla_resolution_met: boolean | null
          started_at: string
          status: Database["public"]["Enums"]["ticket_status"] | null
          subcategory: string | null
          team_id: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          title: string
          unlocked_at: string | null
          updated_at: string | null
          version: number | null
          workaround: string | null
        }
        Insert: {
          analyst_id?: string | null
          app_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          app_instance_id?: string | null
          app_machine_id?: string | null
          app_module?: string | null
          app_product_id?: string | null
          app_version?: string | null
          business_impact: Database["public"]["Enums"]["business_impact"]
          category: string
          client_id: string
          contact_email: string
          contact_name: string
          created_at?: string | null
          csat_comment?: string | null
          csat_rating?: number | null
          csat_submitted_at?: string | null
          db_engine?: Database["public"]["Enums"]["db_engine"] | null
          db_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          db_instance_id?: string | null
          db_machine_id?: string | null
          description?: string | null
          error_displayed?: string | null
          evidences?: Json | null
          faq_article_id?: string | null
          feedback_token?: string | null
          first_response_at?: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id?: string
          lock_at?: string | null
          lock_owner_id?: string | null
          lock_status?: Database["public"]["Enums"]["lock_status"] | null
          lock_ttl?: number | null
          opening_reason: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          problem_faced: string
          queue_id?: string | null
          record_type?: string
          reproduction_steps?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rfc_progress?: number | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          sla_adjusted_at?: string | null
          sla_adjusted_by?: string | null
          sla_adjustment_reason?: string | null
          sla_first_response_deadline?: string | null
          sla_first_response_deadline_original?: string | null
          sla_first_response_met?: boolean | null
          sla_paused_at?: string | null
          sla_paused_total_minutes?: number
          sla_resolution_deadline?: string | null
          sla_resolution_deadline_original?: string | null
          sla_resolution_met?: boolean | null
          started_at: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subcategory?: string | null
          team_id?: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          title: string
          unlocked_at?: string | null
          updated_at?: string | null
          version?: number | null
          workaround?: string | null
        }
        Update: {
          analyst_id?: string | null
          app_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          app_instance_id?: string | null
          app_machine_id?: string | null
          app_module?: string | null
          app_product_id?: string | null
          app_version?: string | null
          business_impact?: Database["public"]["Enums"]["business_impact"]
          category?: string
          client_id?: string
          contact_email?: string
          contact_name?: string
          created_at?: string | null
          csat_comment?: string | null
          csat_rating?: number | null
          csat_submitted_at?: string | null
          db_engine?: Database["public"]["Enums"]["db_engine"] | null
          db_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          db_instance_id?: string | null
          db_machine_id?: string | null
          description?: string | null
          error_displayed?: string | null
          evidences?: Json | null
          faq_article_id?: string | null
          feedback_token?: string | null
          first_response_at?: string | null
          frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          lock_at?: string | null
          lock_owner_id?: string | null
          lock_status?: Database["public"]["Enums"]["lock_status"] | null
          lock_ttl?: number | null
          opening_reason?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          problem_faced?: string
          queue_id?: string | null
          record_type?: string
          reproduction_steps?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rfc_progress?: number | null
          segment?: Database["public"]["Enums"]["ticket_segment"]
          sla_adjusted_at?: string | null
          sla_adjusted_by?: string | null
          sla_adjustment_reason?: string | null
          sla_first_response_deadline?: string | null
          sla_first_response_deadline_original?: string | null
          sla_first_response_met?: boolean | null
          sla_paused_at?: string | null
          sla_paused_total_minutes?: number
          sla_resolution_deadline?: string | null
          sla_resolution_deadline_original?: string | null
          sla_resolution_met?: boolean | null
          started_at?: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subcategory?: string | null
          team_id?: string | null
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          title?: string
          unlocked_at?: string | null
          updated_at?: string | null
          version?: number | null
          workaround?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_app_instance_id_fkey"
            columns: ["app_instance_id"]
            isOneToOne: false
            referencedRelation: "application_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_app_machine_id_fkey"
            columns: ["app_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "application_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_db_instance_id_fkey"
            columns: ["db_instance_id"]
            isOneToOne: false
            referencedRelation: "database_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_db_machine_id_fkey"
            columns: ["db_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_faq_article_id_fkey"
            columns: ["faq_article_id"]
            isOneToOne: false
            referencedRelation: "faq_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_lock_owner_id_fkey"
            columns: ["lock_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_queues: {
        Row: {
          created_at: string | null
          id: string
          queue_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          queue_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          queue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_business_minutes: {
        Args: { _minutes: number; _start_time: string }
        Returns: string
      }
      can_analyst_view_ticket: {
        Args: { _ticket_queue_id: string; _user_id: string }
        Returns: boolean
      }
      create_machine_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: string
      }
      decrypt_machine_secret: { Args: { secret_id: string }; Returns: string }
      extract_domain_from_email: { Args: { _email: string }; Returns: string }
      get_analyst_public_info: {
        Args: { _analyst_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          team_id: string
        }[]
      }
      get_analyst_queue_ids: { Args: { _user_id: string }; Returns: string[] }
      get_tenant_by_domain: { Args: { _email: string }; Returns: string }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_faq_view_count: {
        Args: { article_id: string }
        Returns: undefined
      }
      is_analyst: { Args: { _user_id: string }; Returns: boolean }
      is_otimizzo_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_viewer: { Args: { _user_id: string }; Returns: boolean }
      update_machine_secret: {
        Args: { new_value: string; secret_id: string }
        Returns: undefined
      }
      validate_ticket_upload_path: {
        Args: { _path: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "user"
        | "tenant_admin"
        | "analyst_db"
        | "analyst_app"
        | "viewer"
      business_impact: "nenhum" | "baixo" | "medio" | "alto" | "critico"
      comment_source: "portal" | "email"
      criticality_level: "baixa" | "media" | "alta" | "critica"
      db_engine: "Oracle" | "PostgreSQL" | "MySQL" | "MongoDB" | "SQL Server"
      environment_type: "prod" | "hom" | "qa" | "dev"
      faq_visibility: "private" | "client_specific" | "global"
      frequency_type: "pontual" | "intermitente" | "continuo"
      lock_status: "locked" | "unlocked"
      machine_type: "servidor" | "vm" | "desktop" | "cloud"
      sla_alert_type: "warning" | "overdue"
      ticket_priority: "P1" | "P2" | "P3" | "P4"
      ticket_segment: "DB" | "APP"
      ticket_status:
        | "novo"
        | "em_atendimento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
        | "aguardando_aprovacao"
        | "aprovado"
        | "liberado"
      ticket_type:
        | "incidente"
        | "duvida"
        | "solicitacao"
        | "problema"
        | "service_request"
      user_role: "admin" | "analista-db" | "analista-app" | "cliente"
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
      app_role: [
        "super_admin",
        "user",
        "tenant_admin",
        "analyst_db",
        "analyst_app",
        "viewer",
      ],
      business_impact: ["nenhum", "baixo", "medio", "alto", "critico"],
      comment_source: ["portal", "email"],
      criticality_level: ["baixa", "media", "alta", "critica"],
      db_engine: ["Oracle", "PostgreSQL", "MySQL", "MongoDB", "SQL Server"],
      environment_type: ["prod", "hom", "qa", "dev"],
      faq_visibility: ["private", "client_specific", "global"],
      frequency_type: ["pontual", "intermitente", "continuo"],
      lock_status: ["locked", "unlocked"],
      machine_type: ["servidor", "vm", "desktop", "cloud"],
      sla_alert_type: ["warning", "overdue"],
      ticket_priority: ["P1", "P2", "P3", "P4"],
      ticket_segment: ["DB", "APP"],
      ticket_status: [
        "novo",
        "em_atendimento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
        "aguardando_aprovacao",
        "aprovado",
        "liberado",
      ],
      ticket_type: [
        "incidente",
        "duvida",
        "solicitacao",
        "problema",
        "service_request",
      ],
      user_role: ["admin", "analista-db", "analista-app", "cliente"],
    },
  },
} as const
