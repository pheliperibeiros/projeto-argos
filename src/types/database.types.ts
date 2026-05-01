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
      audit_logs: {
        Row: {
          acao: string
          created_at: string | null
          entidade: string
          entidade_id: string | null
          id: string
          ip: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      caso_investigado: {
        Row: {
          caso_id: string
          investigado_id: string
        }
        Insert: {
          caso_id: string
          investigado_id: string
        }
        Update: {
          caso_id?: string
          investigado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caso_investigado_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caso_investigado_investigado_id_fkey"
            columns: ["investigado_id"]
            isOneToOne: false
            referencedRelation: "investigados"
            referencedColumns: ["id"]
          },
        ]
      }
      casos: {
        Row: {
          codinome: string
          created_at: string | null
          e_proc: string
          e_proc_investigacao: string | null
          id: string
          integrar_e: string
          natureza: Database["public"]["Enums"]["natureza_caso"] | null
          status: Database["public"]["Enums"]["status_caso"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          codinome: string
          created_at?: string | null
          e_proc: string
          e_proc_investigacao?: string | null
          id?: string
          integrar_e: string
          natureza?: Database["public"]["Enums"]["natureza_caso"] | null
          status?: Database["public"]["Enums"]["status_caso"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          codinome?: string
          created_at?: string | null
          e_proc?: string
          e_proc_investigacao?: string | null
          id?: string
          integrar_e?: string
          natureza?: Database["public"]["Enums"]["natureza_caso"] | null
          status?: Database["public"]["Enums"]["status_caso"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cautelares: {
        Row: {
          ativo: boolean | null
          caso_id: string
          created_at: string | null
          id: string
          investigado_id: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_cautelar"] | null
          tipo: Database["public"]["Enums"]["tipo_cautelar"]
        }
        Insert: {
          ativo?: boolean | null
          caso_id: string
          created_at?: string | null
          id?: string
          investigado_id: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_cautelar"] | null
          tipo: Database["public"]["Enums"]["tipo_cautelar"]
        }
        Update: {
          ativo?: boolean | null
          caso_id?: string
          created_at?: string | null
          id?: string
          investigado_id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_cautelar"] | null
          tipo?: Database["public"]["Enums"]["tipo_cautelar"]
        }
        Relationships: [
          {
            foreignKeyName: "cautelares_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cautelares_investigado_id_fkey"
            columns: ["investigado_id"]
            isOneToOne: false
            referencedRelation: "investigados"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_historico_casos: {
        Row: {
          ano_mes: string
          ap: number | null
          nf: number | null
          pic: number | null
        }
        Insert: {
          ano_mes: string
          ap?: number | null
          nf?: number | null
          pic?: number | null
        }
        Update: {
          ano_mes?: string
          ap?: number | null
          nf?: number | null
          pic?: number | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          id: string
          investigado_id: string
          lat: number | null
          lng: number | null
          logradouro: string
          origem: string
        }
        Insert: {
          id?: string
          investigado_id: string
          lat?: number | null
          lng?: number | null
          logradouro: string
          origem: string
        }
        Update: {
          id?: string
          investigado_id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_investigado_id_fkey"
            columns: ["investigado_id"]
            isOneToOne: false
            referencedRelation: "investigados"
            referencedColumns: ["id"]
          },
        ]
      }
      investigados: {
        Row: {
          abertura: string | null
          capital_social: number | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          faccionado: string | null
          filiacao: string | null
          id: string
          natureza_juridica: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          observacoes: string | null
          papel_organizacao: string | null
          razao_social: string | null
          situacao: string | null
          tipo: Database["public"]["Enums"]["tipo_investigado"]
          ultima_consulta_ws: string | null
          updated_at: string | null
          vulgo: string | null
        }
        Insert: {
          abertura?: string | null
          capital_social?: number | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          faccionado?: string | null
          filiacao?: string | null
          id?: string
          natureza_juridica?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes?: string | null
          papel_organizacao?: string | null
          razao_social?: string | null
          situacao?: string | null
          tipo: Database["public"]["Enums"]["tipo_investigado"]
          ultima_consulta_ws?: string | null
          updated_at?: string | null
          vulgo?: string | null
        }
        Update: {
          abertura?: string | null
          capital_social?: number | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          faccionado?: string | null
          filiacao?: string | null
          id?: string
          natureza_juridica?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          observacoes?: string | null
          papel_organizacao?: string | null
          razao_social?: string | null
          situacao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_investigado"]
          ultima_consulta_ws?: string | null
          updated_at?: string | null
          vulgo?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["role_usuario"]
          username: string
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["role_usuario"]
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role_usuario"]
          username?: string
        }
        Relationships: []
      }
      socios_empresa: {
        Row: {
          empresa_id: string
          id: string
          socio_id: string
        }
        Insert: {
          empresa_id: string
          id?: string
          socio_id: string
        }
        Update: {
          empresa_id?: string
          id?: string
          socio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "investigados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_empresa_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "investigados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      autocomplete_investigados: {
        Args: { p_term: string }
        Returns: {
          cnpj: string
          cpf: string
          id: string
          nome: string
        }[]
      }
      autocomplete_investigados_v2: {
        Args: { p_term: string }
        Returns: {
          cnpj: string
          cpf: string
          id: string
          nome: string
        }[]
      }
      f_unaccent: { Args: { "": string }; Returns: string }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["role_usuario"]
      }
      search_investigados_v2: {
        Args: { p_campo?: string; p_papel?: string; p_term: string }
        Returns: {
          caso_id: string
          cnpj: string
          codinome_caso: string
          cpf: string
          e_proc: string
          id: string
          integrar_e: string
          nome: string
          papel_organizacao: string
          tem_cautelar: boolean
          vulgo: string
        }[]
      }
      search_investigados_v3: {
        Args: { p_campo?: string; p_papel?: string; p_term: string }
        Returns: {
          caso_id: string
          cnpj: string
          codinome_caso: string
          cpf: string
          e_proc: string
          id: string
          integrar_e: string
          nome: string
          papel_organizacao: string
          tem_cautelar: boolean
          vulgo: string
        }[]
      }
      search_investigados_v4: {
        Args: { p_campo?: string; p_papel?: string; p_term: string }
        Returns: {
          caso_id: string
          cnpj: string
          codinome_caso: string
          cpf: string
          e_proc: string
          id: string
          integrar_e: string
          nome: string
          papel_organizacao: string
          tem_cautelar: boolean
          vulgo: string
        }[]
      }
      search_investigados_v5: {
        Args: { p_campo?: string; p_papel?: string; p_term: string }
        Returns: {
          caso_id: string
          cnpj: string
          codinome_caso: string
          cpf: string
          e_proc: string
          e_proc_investigacao: string
          id: string
          integrar_e: string
          nome: string
          papel_organizacao: string
          tem_cautelar: boolean
          vulgo: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      natureza_caso:
        | "NOTICIA_DE_FATO"
        | "PROCEDIMENTO_INVESTIGATORIO"
        | "ACAO_PENAL"
      role_usuario: "PROMOTOR" | "AGENTE" | "COORDENADOR" | "ANALISTA"
      status_caso: "ATIVO" | "SUSPENSO" | "ARQUIVADO"
      status_cautelar:
        | "Peticionado"
        | "Em Execução"
        | "Cumprido"
        | "Arquivado"
        | "Baixado"
      tipo_cautelar:
        | "BUSCA_APREENSAO"
        | "PRISAO_CAUTELAR"
        | "SIGILO_BANCARIO"
        | "SIGILO_TELEMATICO"
      tipo_investigado: "PESSOA_FISICA" | "PESSOA_JURIDICA"
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
      natureza_caso: [
        "NOTICIA_DE_FATO",
        "PROCEDIMENTO_INVESTIGATORIO",
        "ACAO_PENAL",
      ],
      role_usuario: ["PROMOTOR", "AGENTE", "COORDENADOR", "ANALISTA"],
      status_caso: ["ATIVO", "SUSPENSO", "ARQUIVADO"],
      status_cautelar: [
        "Peticionado",
        "Em Execução",
        "Cumprido",
        "Arquivado",
        "Baixado",
      ],
      tipo_cautelar: [
        "BUSCA_APREENSAO",
        "PRISAO_CAUTELAR",
        "SIGILO_BANCARIO",
        "SIGILO_TELEMATICO",
      ],
      tipo_investigado: ["PESSOA_FISICA", "PESSOA_JURIDICA"],
    },
  },
} as const
