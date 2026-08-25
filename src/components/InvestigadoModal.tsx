import React, { useState } from 'react'
import { X, MapPin, User, Building2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { dbInvestigados } from '@/lib/db/investigados'
import { useDebounce } from '@/hooks/useDebounce'
import { registrarAudit } from '@/lib/audit'
import toast from 'react-hot-toast'
import { Search, Plus } from 'lucide-react'
import { validarCPF, validarCNPJ } from '@/utils/validation'

interface InvestigadoResumo {
    id: string
    nome: string
    cpf?: string | null
    cnpj?: string | null
}

interface Props {
    open: boolean
    onClose: () => void
    onSalvo: (inv: InvestigadoResumo, sociosAdicionados?: InvestigadoResumo[]) => void
}

export function InvestigadoModal({ open, onClose, onSalvo }: Props) {
    const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF')
    const [loading, setLoading] = useState(false)
    const [mapOpen, setMapOpen] = useState(false)
    const [coords, setCoords] = useState<[number, number] | null>(null)
    const [mapSearch, setMapSearch] = useState('')
    const [consultando, setConsultando] = useState(false)


    // Form states
    const [formData, setFormData] = useState({
        nome: '',
        vulgo: '',
        documento: '',
        dataNascimento: '',
        filiacao: '',
        endereco: '',
        razaoSocial: ''
    })

    const [socios, setSocios] = useState<InvestigadoResumo[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebounce(searchTerm, 300)
    const [searchResults, setSearchResults] = useState<InvestigadoResumo[]>([])
    const [subModalOpen, setSubModalOpen] = useState(false)

    // Autocomplete effect
    React.useEffect(() => {
        if (debouncedSearch.length >= 3) {
            const fetchDirect = async () => {
                try {
                    const data = await dbInvestigados.buscarParaAutocomplete(debouncedSearch)
                    setSearchResults(data)
                } catch {
                    setSearchResults([])
                }
            }
            fetchDirect()
        } else {
            setSearchResults([])
        }
    }, [debouncedSearch])

    if (!open) return null

    const handleSave = async () => {
        if (!formData.nome && !formData.razaoSocial) {
            toast.error('Nome/Razão Social é obrigatório')
            return
        }

        const docLimpo = formData.documento.replace(/\D/g, '')
        if (docLimpo) {
            if (tipo === 'PF' && !validarCPF(docLimpo)) {
                toast.error('CPF inválido')
                return
            }
            if (tipo === 'PJ' && !validarCNPJ(docLimpo)) {
                toast.error('CNPJ inválido')
                return
            }
        }

        setLoading(true)
        try {
            const payload: any = {
                tipo: tipo === 'PF' ? 'PESSOA_FISICA' : 'PESSOA_JURIDICA',
                nome: tipo === 'PF' ? formData.nome : formData.razaoSocial,
                vulgo: formData.vulgo || null,
                cpf: tipo === 'PF' ? (docLimpo.length === 11 ? docLimpo : null) : null,
                cnpj: tipo === 'PJ' ? (docLimpo.length === 14 ? docLimpo : null) : null,
                data_nascimento: formData.dataNascimento || null,
                filiacao: formData.filiacao || null,
                enderecos: formData.endereco ? [
                    {
                        logradouro: formData.endereco,
                        lat: coords ? coords[0] : null,
                        lng: coords ? coords[1] : null,
                        origem: 'CADASTRO'
                    }
                ] : []
            }

            const novo = await dbInvestigados.criar(payload)

            // Vincular sócios se for PJ
            if (tipo === 'PJ' && socios.length > 0) {
                try {
                    await Promise.all(socios.map(s => dbInvestigados.vincularSocio(novo.id, s.id)))
                } catch (socioErr) {
                    console.warn('[Cadastro] Erro ao vincular alguns sócios:', socioErr)
                    toast.error('Investigado criado, mas alguns vínculos de sócios falharam.')
                }
            }

            // Registro de auditoria em background (fire-and-forget)
            registrarAudit('CRIAR_INVESTIGADO', 'investigados', novo.id)

            onSalvo({
                id: novo.id,
                nome: novo.nome,
                cpf: novo.cpf,
                cnpj: novo.cnpj
            }, tipo === 'PJ' ? socios : [])
            toast.success('Investigado cadastrado')
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    function MapEvents() {
        useMapEvents({
            click(e) {
                setCoords([e.latlng.lat, e.latlng.lng])
            },
        })
        return coords ? <Marker position={coords} /> : null
    }

    function ChangeMapView({ center }: { center: [number, number] }) {
        const map = useMap()
        map.setView(center, 13)
        return null
    }

    const handleConsultaReceita = async () => {
        const cnpjLimpo = formData.documento.replace(/\D/g, '')
        if (cnpjLimpo.length !== 14) {
            toast.error('CNPJ inválido para consulta. Digite 14 números.')
            return
        }

        setConsultando(true)
        try {
            // Paraleliza a chamada para o proxy da Receita e a chamada direta para o OpenCNPJ
            const [res, resOpenCnpj] = await Promise.all([
                fetch(`/api-receita/v1/cnpj/${cnpjLimpo}`),
                fetch(`https://api.opencnpj.org/${cnpjLimpo}`).catch(() => null) // fail-safe
            ])

            if (res.status === 429) {
                toast.error('Muitas requisições (Rate Limit). Aguarde e tente novamente.')
                return
            }
            if (res.status === 504) {
                toast.error('Timeout na base da ReceitaWS. Tente novamente mais tarde.')
                return
            }
            if (!res.ok) {
                toast.error(`Erro na consulta: ${res.statusText}`)
                return
            }

            const data = await res.json()

            if (data.status === 'ERROR') {
                toast.error(data.message || 'Erro retornado pela ReceitaWS')
                return
            }

            // Tenta decodificar o payload nativo do OpenCNPJ
            let dataOpen: any = null
            if (resOpenCnpj && resOpenCnpj.ok) {
                try { dataOpen = await resOpenCnpj.json() } catch (e) { }
            }

            const enderecoMontado = `${data.logradouro || ''}, ${data.numero || ''} - ${data.cep || ''}, ${data.municipio || ''} - ${data.uf || ''}`.replace(/^[,\s-]+|[,\s-]+$/g, '')

            setFormData(prev => ({
                ...prev,
                razaoSocial: data.nome || prev.razaoSocial,
                endereco: enderecoMontado || prev.endereco
            }))

            toast.success('Dados importados com sucesso')

            if (data.qsa && data.qsa.length > 0) {
                const todosSocios: string[] = []

                for (const socio of data.qsa) {
                    const nomeSocio = socio.nome
                    let docSocio = socio.cnpj_cpf_do_socio || socio.cpf_cnpj_socio || socio.documento || socio.cpf || socio.cnpj

                    if (!docSocio && dataOpen && dataOpen.QSA) {
                        const socioOpen = dataOpen.QSA.find((s: any) => s.nome_socio === nomeSocio)
                        if (socioOpen && socioOpen.cnpj_cpf_socio) {
                            docSocio = socioOpen.cnpj_cpf_socio
                        }
                    }

                    const qualSocio = socio.qual || socio.qualificacao_socio || ''
                    const textoQual = qualSocio ? ` (${qualSocio})` : ''
                    const textoExportacao = docSocio ? `${nomeSocio}${textoQual} - CPF/CNPJ: ${docSocio}` : `${nomeSocio}${textoQual}`

                    todosSocios.push(textoExportacao)
                }

                if (todosSocios.length > 0) {
                    try {
                        let text = `QUADRO SOCIETÁRIO (QSA) - ${cnpjLimpo}\n======================================================\n`
                        text += todosSocios.join('\n')

                        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.style.display = 'none'
                        a.href = url
                        a.download = `qsa_${cnpjLimpo}.txt`
                        document.body.appendChild(a)
                        a.click()
                        setTimeout(() => {
                            document.body.removeChild(a)
                            window.URL.revokeObjectURL(url)
                        }, 200)
                        toast('Relatório do Quadro Societário exportado (.txt).', { icon: '📄' })
                    } catch (err) {
                        console.error('Erro ao gerar TXT:', err)
                        toast.error('Não foi possível gerar o arquivo .txt dos sócios.')
                    }
                }
            }

        } catch (error: any) {
            toast.error('Erro de conexão ou timeout na consulta.')
        } finally {
            setConsultando(false)
        }
    }

    const handleMapSearch = async () => {
        if (!mapSearch) return
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`)
            const data = await res.json()
            if (data && data.length > 0) {
                const { lat, lon } = data[0]
                setCoords([parseFloat(lat), parseFloat(lon)])
                // we'll need to move the map too. MapEvents won't do it easily without access to map instance.
            } else {
                toast.error('Localização não encontrada')
            }
        } catch (error) {
            toast.error('Erro na pesquisa')
        }
    }

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(13, 17, 23, 0.95)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-card" style={{
                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '8px', width: '560px', padding: '24px', position: 'relative'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16, background: 'none',
                    border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                    <X size={20} />
                </button>

                <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Novo Investigado</h3>

                {/* Abas */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
                    <button
                        onClick={() => setTipo('PF')}
                        style={{
                            padding: '12px 24px', background: 'none', border: 'none',
                            color: tipo === 'PF' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            borderBottom: tipo === 'PF' ? '2px solid var(--accent-color)' : 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <User size={16} /> Pessoa Física
                    </button>
                    <button
                        onClick={() => setTipo('PJ')}
                        style={{
                            padding: '12px 24px', background: 'none', border: 'none',
                            color: tipo === 'PJ' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            borderBottom: tipo === 'PJ' ? '2px solid var(--accent-color)' : 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Building2 size={16} /> Pessoa Jurídica
                    </button>
                </div>

                {/* Campos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {tipo === 'PF' ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">Nome Completo*</label>
                                <input
                                    type="text" className="form-input"
                                    value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Vulgo</label>
                                    <input type="text" className="form-input"
                                        value={formData.vulgo} onChange={e => setFormData({ ...formData, vulgo: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CPF</label>
                                    <input type="text" className="form-input"
                                        placeholder="000.000.000-00"
                                        value={formData.documento} onChange={e => setFormData({ ...formData, documento: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Data Nascimento</label>
                                    <input type="date" className="form-input"
                                        value={formData.dataNascimento} onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Filiação</label>
                                    <input type="text" className="form-input"
                                        value={formData.filiacao} onChange={e => setFormData({ ...formData, filiacao: e.target.value })}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Razão Social*</label>
                                <input type="text" className="form-input"
                                    value={formData.razaoSocial} onChange={e => setFormData({ ...formData, razaoSocial: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CNPJ</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-input" style={{ flex: 1 }}
                                        placeholder="00.000.000/0000-00"
                                        value={formData.documento} onChange={e => setFormData({ ...formData, documento: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="chip"
                                        onClick={handleConsultaReceita}
                                        disabled={consultando}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: consultando ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)',
                                            color: consultando ? 'var(--text-secondary)' : 'white',
                                            border: consultando ? '1px solid var(--border-color)' : 'none',
                                            height: '32px', cursor: consultando ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Search size={14} />
                                        {consultando ? 'Consultando...' : 'Consulta'}
                                    </button>
                                </div>
                            </div>

                            {/* Seção de Sócios */}
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sócio(s) / Proprietário(s)</label>
                                    <button
                                        type="button"
                                        className="chip"
                                        style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        onClick={() => setSubModalOpen(true)}
                                    >
                                        <Plus size={12} /> Cadastrar Novo
                                    </button>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: '32px', height: '32px', fontSize: '13px' }}
                                        placeholder="Buscar sócio existente..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="autocomplete-dropdown" style={{ top: '34px' }}>
                                            {searchResults.map(res => (
                                                <div
                                                    key={res.id}
                                                    className="autocomplete-item"
                                                    onClick={() => {
                                                        if (!socios.find(s => s.id === res.id)) {
                                                            setSocios([...socios, res])
                                                        }
                                                        setSearchTerm('')
                                                        setSearchResults([])
                                                    }}
                                                >
                                                    {res.nome} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>— {res.cpf || res.cnpj}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                    {socios.map(s => (
                                        <div key={s.id} className="chip active" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {s.nome}
                                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSocios(socios.filter(x => x.id !== s.id))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-group" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Endereço e Geolocalização</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Endereço Nominal</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Rua das Flores, 123, Centro, Palmas - TO"
                                    value={formData.endereco}
                                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    className="chip"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        backgroundColor: coords ? 'rgba(63, 185, 80, 0.1)' : 'transparent',
                                        borderColor: coords ? '#3FB950' : 'var(--border-color)',
                                        color: coords ? '#3FB950' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setMapOpen(true)}
                                >
                                    <MapPin size={14} />
                                    {coords ? 'Localização Vinculada' : 'Vincular Local no Mapa'}
                                </button>

                                {coords && (
                                    <button
                                        className="chip"
                                        style={{ border: 'none', color: '#F85149', fontSize: '11px' }}
                                        onClick={() => setCoords(null)}
                                    >
                                        Remover PIN
                                    </button>
                                )}
                            </div>
                        </div>
                        {coords && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'IBM Plex Mono' }}>
                                Coordenadas: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            backgroundColor: 'var(--accent-color)', color: 'white', border: 'none',
                            padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        {loading ? 'Salvando...' : 'Salvar e Adicionar'}
                    </button>
                </div>
            </div>

            {/* Sub-modal Mapa */}
            {mapOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 2100
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', width: '600px', padding: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Marcar no Mapa</h4>
                            <div style={{ display: 'flex', gap: '8px', flex: 1, marginLeft: '24px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Buscar cidade, rua, etc..."
                                    style={{ height: '32px', fontSize: '12px' }}
                                    value={mapSearch}
                                    onChange={e => setMapSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleMapSearch()}
                                />
                                <button className="chip" onClick={handleMapSearch} style={{ height: '32px' }}>Buscar</button>
                            </div>
                        </div>
                        <div style={{ height: '300px', borderRadius: '4px', overflow: 'hidden' }}>
                            <MapContainer center={[-10.1843, -48.3336]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {coords && <ChangeMapView center={coords} />}
                                <MapEvents />
                            </MapContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                            <button onClick={() => setMapOpen(false)} style={{
                                backgroundColor: 'var(--accent-color)', color: 'white', border: 'none',
                                padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'
                            }}>
                                Confirmar localização
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Recursão para Novo Sócio */}
            {subModalOpen && (
                <InvestigadoModal
                    open={subModalOpen}
                    onClose={() => setSubModalOpen(false)}
                    onSalvo={(novo) => {
                        setSocios(prev => [...prev, novo])
                        setSubModalOpen(false)
                    }}
                />
            )}
        </div>
    )
}
