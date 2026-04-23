export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
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
            casos: {
                Row: {
                    codinome: string
                    created_at: string | null
                    e_proc: string
                    id: string
                    integrar_e: string
                    tags: string[] | null
                    updated_at: string | null
                    status: Database["public"]["Enums"]["status_caso"] | null
                    natureza: Database["public"]["Enums"]["natureza_caso"] | null
                    e_proc_investigacao: string | null
                }
                Insert: {
                    codinome: string
                    created_at?: string | null
                    e_proc: string
                    id?: string
                    integrar_e: string
                    tags?: string[] | null
                    updated_at?: string | null
                    status?: Database["public"]["Enums"]["status_caso"] | null
                    natureza?: Database["public"]["Enums"]["natureza_caso"] | null
                    e_proc_investigacao?: string | null
                }
                Update: {
                    codinome?: string
                    created_at?: string | null
                    e_proc?: string
                    id?: string
                    integrar_e?: string
                    tags?: string[] | null
                    updated_at?: string | null
                    status?: Database["public"]["Enums"]["status_caso"] | null
                    natureza?: Database["public"]["Enums"]["natureza_caso"] | null
                    e_proc_investigacao?: string | null
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
                        referencedRelation: "casos"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "caso_investigado_investigado_id_fkey"
                        columns: ["investigado_id"]
                        referencedRelation: "investigados"
                        referencedColumns: ["id"]
                    }
                ]
            }
            cautelares: {
                Row: {
                    ativo: boolean | null
                    caso_id: string
                    created_at: string | null
                    id: string
                    investigado_id: string
                    observacao: string | null
                    tipo: Database["public"]["Enums"]["tipo_cautelar"]
                }
                Insert: {
                    ativo?: boolean | null
                    caso_id: string
                    created_at?: string | null
                    id?: string
                    investigado_id: string
                    observacao?: string | null
                    tipo: Database["public"]["Enums"]["tipo_cautelar"]
                }
                Update: {
                    ativo?: boolean | null
                    caso_id?: string
                    created_at?: string | null
                    id?: string
                    investigado_id?: string
                    observacao?: string | null
                    tipo?: Database["public"]["Enums"]["tipo_cautelar"]
                }
                Relationships: []
            }
            investigados: {
                Row: {
                    cnpj: string | null
                    cpf: string | null
                    created_at: string | null
                    data_nascimento: string | null
                    faccionado: string | null
                    filiacao: string | null
                    id: string
                    nome: string
                    papel_organizacao: string | null
                    tipo: Database["public"]["Enums"]["tipo_investigado"]
                    updated_at: string | null
                    vulgo: string | null
                }
                Insert: {
                    cnpj?: string | null
                    cpf?: string | null
                    created_at?: string | null
                    data_nascimento?: string | null
                    faccionado?: string | null
                    filiacao?: string | null
                    id?: string
                    nome: string
                    papel_organizacao?: string | null
                    tipo: Database["public"]["Enums"]["tipo_investigado"]
                    updated_at?: string | null
                    vulgo?: string | null
                }
                Update: {
                    cnpj?: string | null
                    cpf?: string | null
                    created_at?: string | null
                    data_nascimento?: string | null
                    faccionado?: string | null
                    filiacao?: string | null
                    id?: string
                    nome?: string
                    papel_organizacao?: string | null
                    tipo?: Database["public"]["Enums"]["tipo_investigado"]
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
        }
        Enums: {
            role_usuario: "PROMOTOR" | "AGENTE" | "COORDENADOR" | "ANALISTA"
            tipo_cautelar: "BUSCA_APREENSAO" | "PRISAO_CAUTELAR" | "SIGILO_BANCARIO" | "SIGILO_TELEMATICO"
            tipo_investigado: "PESSOA_FISICA" | "PESSOA_JURIDICA"
            natureza_caso: "NOTICIA_DE_FATO" | "PROCEDIMENTO_INVESTIGATORIO" | "ACAO_PENAL"
            status_caso: "ATIVO" | "SUSPENSO" | "ARQUIVADO"
        }
    }
}

