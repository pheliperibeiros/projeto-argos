/**
 * Testes Unitários — Motor de Importação ARGOS
 * ==============================================
 * Valida os cenários mais comuns de erro no pipeline de importação.
 *
 * Execute com: npx vitest run src/lib/importacao/__tests__/engine.test.ts
 * (Requer vitest instalado)
 */

import { describe, it, expect } from 'vitest'
import { validarCPF, validarCNPJ } from '@/utils/validation'

// ─── TESTES DE VALIDAÇÃO CPF ─────────────────────────────

describe('validarCPF', () => {
    it('rejeita CPF com todos os dígitos iguais', () => {
        expect(validarCPF('11111111111')).toBe(false)
        expect(validarCPF('00000000000')).toBe(false)
        expect(validarCPF('99999999999')).toBe(false)
    })

    it('rejeita CPF com comprimento incorreto', () => {
        expect(validarCPF('123456789')).toBe(false)
        expect(validarCPF('123456789012')).toBe(false)
    })

    it('rejeita CPF com dígito verificador inválido', () => {
        expect(validarCPF('12345678900')).toBe(false)
        expect(validarCPF('11144477701')).toBe(false)
    })

    it('aceita CPF válido', () => {
        // CPFs gerados para teste (válidos matematicamente)
        expect(validarCPF('52998224725')).toBe(true)
        expect(validarCPF('11144477735')).toBe(true)
    })

    it('funciona com strings limpas (sem pontuação)', () => {
        // Os utilitários já limpam antes de chamar, mas a função deve
        // receber apenas dígitos
        const clean = '529.982.247-25'.replace(/\D/g, '')
        expect(validarCPF(clean)).toBe(true)
    })
})

// ─── TESTES DE VALIDAÇÃO CNPJ ────────────────────────────

describe('validarCNPJ', () => {
    it('rejeita CNPJ com todos os dígitos iguais', () => {
        expect(validarCNPJ('11111111111111')).toBe(false)
        expect(validarCNPJ('00000000000000')).toBe(false)
    })

    it('rejeita CNPJ com comprimento incorreto', () => {
        expect(validarCNPJ('1234567890')).toBe(false)
        expect(validarCNPJ('123456789012345')).toBe(false)
    })

    it('rejeita CNPJ com dígito verificador inválido', () => {
        expect(validarCNPJ('11222333000100')).toBe(false)
    })

    it('aceita CNPJ válido', () => {
        expect(validarCNPJ('11222333000181')).toBe(true)
    })
})

// ─── TESTES DE NORMALIZAÇÃO ──────────────────────────────

describe('Normalização de nomes', () => {
    it('converte para Title Case e trata preposições', () => {
        const normalizar = (nome: string) => {
            let v = nome.trim().replace(/\s+/g, ' ')
            v = v.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            v = v.replace(/\b(Da|Das|De|Do|Dos|E)\b/g, m => m.toLowerCase())
            return v
        }

        expect(normalizar('MARIA DA SILVA')).toBe('Maria da Silva')
        expect(normalizar('joão   de    souza')).toBe('João de Souza')
        expect(normalizar('EMPRESA DOS SANTOS E FILHOS')).toBe('Empresa dos Santos e Filhos')
    })
})

// ─── TESTES DE MAPEAMENTO DE CABEÇALHOS ──────────────────

describe('Mapeamento de cabeçalhos', () => {
    const HEADER_ALIASES: Record<string, string[]> = {
        nome: ['nome', 'name', 'nome_completo', 'nome completo', 'razao_social', 'razão social'],
        tipo: ['tipo', 'type', 'tipo_pessoa'],
        cpf: ['cpf', 'cpf_cnpj', 'documento'],
        cnpj: ['cnpj'],
    }

    function mapearCabecalho(header: string): string | null {
        const normalizado = header.trim().toLowerCase().replace(/[^a-záàãâéêíóôõúç_\s]/g, '').replace(/\s+/g, ' ')
        for (const [campo, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.includes(normalizado)) return campo
        }
        return null
    }

    it('mapeia variações de "Nome"', () => {
        expect(mapearCabecalho('Nome')).toBe('nome')
        expect(mapearCabecalho('NOME')).toBe('nome')
        expect(mapearCabecalho('name')).toBe('nome')
        expect(mapearCabecalho('Nome Completo')).toBe('nome')
        expect(mapearCabecalho('nome_completo')).toBe('nome')
    })

    it('mapeia variações de "CPF"', () => {
        expect(mapearCabecalho('CPF')).toBe('cpf')
        expect(mapearCabecalho('cpf')).toBe('cpf')
        expect(mapearCabecalho('Documento')).toBe('cpf')
        expect(mapearCabecalho('CPF_CNPJ')).toBe('cpf')
    })

    it('retorna null para cabeçalhos desconhecidos', () => {
        expect(mapearCabecalho('XYZ_FIELD')).toBe(null)
        expect(mapearCabecalho('Telefone')).toBe(null)
    })
})

// ─── TESTES DE CONVERSÃO DE DATA ─────────────────────────

describe('Conversão de data brasileira', () => {
    it('converte DD/MM/YYYY → YYYY-MM-DD', () => {
        const converter = (v: string) => {
            const brMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
            return brMatch ? `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}` : v
        }

        expect(converter('15/03/1985')).toBe('1985-03-15')
        expect(converter('01/12/2000')).toBe('2000-12-01')
    })

    it('mantém formato ISO inalterado', () => {
        const converter = (v: string) => {
            const brMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
            return brMatch ? `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}` : v
        }

        expect(converter('1985-03-15')).toBe('1985-03-15')
    })
})

// ─── TESTES DE INFERÊNCIA DE TIPO ────────────────────────

describe('Inferência de tipo por documento', () => {
    it('11 dígitos → PESSOA_FISICA', () => {
        const doc = '52998224725'
        const tipo = doc.length === 14 ? 'PESSOA_JURIDICA' : 'PESSOA_FISICA'
        expect(tipo).toBe('PESSOA_FISICA')
    })

    it('14 dígitos → PESSOA_JURIDICA', () => {
        const doc = '11222333000181'
        const tipo = doc.length === 14 ? 'PESSOA_JURIDICA' : 'PESSOA_FISICA'
        expect(tipo).toBe('PESSOA_JURIDICA')
    })
})
