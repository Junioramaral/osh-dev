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
          modules: Json | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          modules?: Json | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          modules?: Json | null
          name?: string
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
          content: string
          created_at: string | null
          created_by: string | null
          db_categories: string[] | null
          db_engines: Database["public"]["Enums"]["db_engine"][] | null
          id: string
          keywords: string[] | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          app_modules?: string[] | null
          app_product_ids?: string[] | null
          app_versions?: string[] | null
          attachments?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          db_categories?: string[] | null
          db_engines?: Database["public"]["Enums"]["db_engine"][] | null
          id?: string
          keywords?: string[] | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          app_modules?: string[] | null
          app_product_ids?: string[] | null
          app_versions?: string[] | null
          attachments?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          db_categories?: string[] | null
          db_engines?: Database["public"]["Enums"]["db_engine"][] | null
          id?: string
          keywords?: string[] | null
          segment?: Database["public"]["Enums"]["ticket_segment"]
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          client_id: string
          created_at: string | null
          criticality: Database["public"]["Enums"]["criticality_level"] | null
          hostname: string
          id: string
          location: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          operating_system: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          hostname: string
          id?: string
          location?: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          operating_system?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["criticality_level"] | null
          hostname?: string
          id?: string
          location?: string | null
          machine_type?: Database["public"]["Enums"]["machine_type"]
          operating_system?: string | null
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
          client_id: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          segment: Database["public"]["Enums"]["ticket_segment"]
          specialization: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          segment: Database["public"]["Enums"]["ticket_segment"]
          specialization?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          segment?: Database["public"]["Enums"]["ticket_segment"]
          specialization?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
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
      ticket_time_logs: {
        Row: {
          analyst_id: string
          description: string | null
          hours: number
          id: string
          logged_at: string | null
          ticket_id: string
        }
        Insert: {
          analyst_id: string
          description?: string | null
          hours: number
          id?: string
          logged_at?: string | null
          ticket_id: string
        }
        Update: {
          analyst_id?: string
          description?: string | null
          hours?: number
          id?: string
          logged_at?: string | null
          ticket_id?: string
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
          db_engine: Database["public"]["Enums"]["db_engine"] | null
          db_environment: Database["public"]["Enums"]["environment_type"] | null
          db_instance_id: string | null
          db_machine_id: string | null
          description: string | null
          error_displayed: string | null
          evidences: Json | null
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
          reproduction_steps: string | null
          resolved_at: string | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          sla_first_response_deadline: string | null
          sla_first_response_met: boolean | null
          sla_resolution_deadline: string | null
          sla_resolution_met: boolean | null
          started_at: string
          status: Database["public"]["Enums"]["ticket_status"] | null
          subcategory: string | null
          team_id: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          title: string
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
          db_engine?: Database["public"]["Enums"]["db_engine"] | null
          db_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          db_instance_id?: string | null
          db_machine_id?: string | null
          description?: string | null
          error_displayed?: string | null
          evidences?: Json | null
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
          reproduction_steps?: string | null
          resolved_at?: string | null
          segment: Database["public"]["Enums"]["ticket_segment"]
          sla_first_response_deadline?: string | null
          sla_first_response_met?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_met?: boolean | null
          started_at: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subcategory?: string | null
          team_id?: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          title: string
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
          db_engine?: Database["public"]["Enums"]["db_engine"] | null
          db_environment?:
            | Database["public"]["Enums"]["environment_type"]
            | null
          db_instance_id?: string | null
          db_machine_id?: string | null
          description?: string | null
          error_displayed?: string | null
          evidences?: Json | null
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
          reproduction_steps?: string | null
          resolved_at?: string | null
          segment?: Database["public"]["Enums"]["ticket_segment"]
          sla_first_response_deadline?: string | null
          sla_first_response_met?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_met?: boolean | null
          started_at?: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subcategory?: string | null
          team_id?: string | null
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          title?: string
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
            foreignKeyName: "tickets_lock_owner_id_fkey"
            columns: ["lock_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extract_domain_from_email: { Args: { _email: string }; Returns: string }
      get_tenant_by_domain: { Args: { _email: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "tenant_admin"
        | "analyst_db"
        | "analyst_app"
        | "user"
      business_impact: "nenhum" | "baixo" | "medio" | "alto" | "critico"
      criticality_level: "baixa" | "media" | "alta" | "critica"
      db_engine: "Oracle" | "PostgreSQL" | "MySQL" | "MongoDB" | "SQL Server"
      environment_type: "prod" | "hom" | "qa" | "dev"
      frequency_type: "pontual" | "intermitente" | "continuo"
      lock_status: "locked" | "unlocked"
      machine_type: "servidor" | "vm" | "desktop" | "cloud"
      ticket_priority: "P1" | "P2" | "P3" | "P4"
      ticket_segment: "DB" | "APP"
      ticket_status:
        | "novo"
        | "em_atendimento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
      ticket_type: "incidente" | "duvida" | "solicitacao"
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
        "tenant_admin",
        "analyst_db",
        "analyst_app",
        "user",
      ],
      business_impact: ["nenhum", "baixo", "medio", "alto", "critico"],
      criticality_level: ["baixa", "media", "alta", "critica"],
      db_engine: ["Oracle", "PostgreSQL", "MySQL", "MongoDB", "SQL Server"],
      environment_type: ["prod", "hom", "qa", "dev"],
      frequency_type: ["pontual", "intermitente", "continuo"],
      lock_status: ["locked", "unlocked"],
      machine_type: ["servidor", "vm", "desktop", "cloud"],
      ticket_priority: ["P1", "P2", "P3", "P4"],
      ticket_segment: ["DB", "APP"],
      ticket_status: [
        "novo",
        "em_atendimento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
      ],
      ticket_type: ["incidente", "duvida", "solicitacao"],
      user_role: ["admin", "analista-db", "analista-app", "cliente"],
    },
  },
} as const
