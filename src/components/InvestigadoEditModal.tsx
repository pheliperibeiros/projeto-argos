import { useState, useEffect } from 'react'
import { X, MapPin, Plus, Trash2 } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { atualizar } from '@/lib/db/investigados'
import { supabase } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import toast from 'react-hot-toast'
import { validarCPF, validarCNPJ } from '@/utils/validation'

interface Props {
    open: boolean
    onClose: () => void
    data: any
    onSalvo: () => void
}

export function InvestigadoEditModal({ open, onClose, data, onSalvo }: Props) {
    const [loading, setLoading] = useState(false)
    const [mapOpen, setMapOpen] = useState(false)
    const [coords, setCoords] = useState<[number, number] | null>(null)
    const [currentAddressIdx, setCurrentAddressIdx] = useState<number | null>(null)
    const [mapSearch, setMapSearch] = useState('')

    const [formData, setFormData] = useState({
        nome: '',
        vulgo: '',
        cpf: '',
        cnpj: '',
        dataNascimento: '',
        nomePai: '',
        nomeMae: '',
        faccionado: '',
        papel_organizacao: '',
        observacoes: ''
    })

    const [enderecos, setEnderecos] = useState<any[]>([])

    useEffect(() => {
        if (data) {
            setFormData({
                nome: data.nome || '',
                vulgo: data.vulgo || '',
                cpf: data.cpf || '',
                cnpj: data.cnpj || '',
                dataNascimento: data.dataNascimento || '',
                nomePai: data.nomePai || '',
                nomeMae: data.nomeMae || '',
                faccionado: data.faccionado || '',
                papel_organizacao: data.papelOrganizacao || '',
                observacoes: data.observacoes || ''
            })
            setEnderecos(data.enderecos || [])
        }
    }, [data, open])

    if (!open) return null

    const handleSave = async () => {
        // Validação de documento
        if (data.tipo === 'PESSOA_FISICA' && formData.cpf) {
            const clean = formData.cpf.replace(/\D/g, '')
            if (clean && !validarCPF(clean)) {
                toast.error('CPF inválido')
                return
            }
        } else if (data.tipo === 'PESSOA_JURIDICA' && formData.cnpj) {
            const clean = formData.cnpj.replace(/\D/g, '')
            if (clean && !validarCNPJ(clean)) {
                toast.error('CNPJ inválido')
                return
            }
        }

        setLoading(true)
        try {
            // 1. Atualizar dados básicos
            await atualizar(data.id, {
                nome: formData.nome,
                vulgo: formData.vulgo,
                cpf: formData.cpf || null,
                cnpj: formData.cnpj || null,
                data_nascimento: formData.dataNascimento || null,
                nome_pai: formData.nomePai || null,
                nome_mae: formData.nomeMae || null,
                faccionado: formData.faccionado || null,
                papel_organizacao: formData.papel_organizacao || null,
                observacoes: formData.observacoes || null
            })

            // 2. Sincronizar endereços
            // Simplificado: remove todos e reinsere os atuais (ou lógica de delta)
            await supabase.from('enderecos').delete().eq('investigado_id', data.id)
            if (enderecos.length > 0) {
                const rows = enderecos.map(e => ({
                    investigado_id: data.id,
                    logradouro: e.logradouro,
                    lat: e.lat,
                    lng: e.lng,
                    origem: e.origem || 'MANUAL'
                }))
                await supabase.from('enderecos').insert(rows)
            }

            await registrarAudit('EDITAR_INVESTIGADO', 'investigados', data.id)
            toast.success('Dados atualizados com sucesso')
            onSalvo()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    const addEndereco = () => {
        setEnderecos([...enderecos, { logradouro: '', origem: 'MANUAL', lat: null, lng: null }])
    }

    const removeEndereco = (idx: number) => {
        setEnderecos(enderecos.filter((_, i) => i !== idx))
    }

    const updateEndereco = (idx: number, field: string, value: any) => {
        setEnderecos(prev => {
            const newArr = [...prev]
            newArr[idx] = { ...newArr[idx], [field]: value }
            return newArr
        })
    }

    function MapEvents() {
        useMapEvents({
            click(e) {
                if (currentAddressIdx !== null) {
                    updateEndereco(currentAddressIdx, 'lat', e.latlng.lat)
                    updateEndereco(currentAddressIdx, 'lng', e.latlng.lng)
                    setCoords([e.latlng.lat, e.latlng.lng])
                }
            },
        })
        return coords ? <Marker position={coords} /> : null
    }

    function ChangeMapView({ center }: { center: [number, number] }) {
        const map = useMap()
        map.setView(center, 13)
        return null
    }

    const handleMapSearch = async () => {
        if (!mapSearch) return
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`)
            const data = await res.json()
            if (data && data.length > 0) {
                const { lat, lon } = data[0]
                const newCoords: [number, number] = [parseFloat(lat), parseFloat(lon)]
                setCoords(newCoords)
                if (currentAddressIdx !== null) {
                    updateEndereco(currentAddressIdx, 'lat', newCoords[0])
                    updateEndereco(currentAddressIdx, 'lng', newCoords[1])
                }
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
                backgroundColor: '#161B22', border: '1px solid #30363D',
                borderRadius: '8px', width: '700px', maxHeight: '90vh', overflowY: 'auto',
                padding: '32px', position: 'relative'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 20, right: 20, background: 'none',
                    border: 'none', color: '#8B949E', cursor: 'pointer'
                }}>
                    <X size={20} />
                </button>

                <h3 style={{ margin: '0 0 32px 0', color: 'var(--text-primary)', fontSize: '20px' }}>Editar Investigado</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Identificação */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Nome Completo*</label>
                            <input
                                type="text" className="form-input"
                                value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Vulgos (separados por vírgula)</label>
                            <input
                                type="text" className="form-input"
                                value={formData.vulgo} onChange={e => setFormData({ ...formData, vulgo: e.target.value })}
                                placeholder="Vulgo 1, Vulgo 2..."
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">CPF/CNPJ</label>
                            <input
                                type="text" className="form-input"
                                value={formData.cpf || formData.cnpj}
                                onChange={e => data.tipo === 'PESSOA_FISICA' ? setFormData({ ...formData, cpf: e.target.value }) : setFormData({ ...formData, cnpj: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data de Nascimento</label>
                            <input
                                type="date" className="form-input"
                                value={formData.dataNascimento} onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Facção</label>
                            <select className="form-select" value={formData.faccionado} onChange={e => setFormData({ ...formData, faccionado: e.target.value })}>
                                <option value="">Nenhuma</option>
                                <option value="PCC">PCC</option>
                                <option value="CV">CV</option>
                                <option value="TCP">TCP</option>
                                <option value="ADE">ADE</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                    </div>

                    {/* Família */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Nome do Pai</label>
                            <input
                                type="text" className="form-input"
                                value={formData.nomePai} onChange={e => setFormData({ ...formData, nomePai: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome da Mãe</label>
                            <input
                                type="text" className="form-input"
                                value={formData.nomeMae} onChange={e => setFormData({ ...formData, nomeMae: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Papel na Organização</label>
                        <select className="form-select" value={formData.papel_organizacao} onChange={e => setFormData({ ...formData, papel_organizacao: e.target.value })}>
                            <option value="">Indefinido</option>
                            <option value="Liderança">Liderança</option>
                            <option value="Gerência">Gerência</option>
                            <option value="Financiamento">Financiamento</option>
                            <option value="Operacional">Operacional</option>
                            <option value="Laranja">Laranja</option>
                            <option value="Facilitador">Facilitador</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-input"
                            style={{ height: '100px', resize: 'none', width: '100%', boxSizing: 'border-box' }}
                            value={formData.observacoes}
                            onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        />
                    </div>

                    {/* Endereços */}
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px' }}>📍 Endereços</h4>
                            <button className="chip" onClick={addEndereco} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {enderecos.map((end, idx) => (
                                <div key={idx} style={{ padding: '16px', backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label">Endereço Nominal</label>
                                                <input
                                                    type="text" className="form-input"
                                                    placeholder="Logradouro, número, bairro..."
                                                    value={end.logradouro}
                                                    onChange={e => updateEndereco(idx, 'logradouro', e.target.value)}
                                                />
                                            </div>
                                            <button className="chip" onClick={() => removeEndereco(idx)} style={{ borderColor: '#F85149', color: '#F85149', alignSelf: 'flex-end', height: '32px' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button
                                                className="chip"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    backgroundColor: (end.lat && end.lng) ? 'rgba(63, 185, 80, 0.1)' : 'transparent',
                                                    borderColor: (end.lat && end.lng) ? '#3FB950' : '#30363D',
                                                    color: (end.lat && end.lng) ? '#3FB950' : '#8B949E'
                                                }}
                                                onClick={() => {
                                                    setCurrentAddressIdx(idx)
                                                    setCoords(end.lat ? [end.lat, end.lng] : null)
                                                    setMapOpen(true)
                                                }}
                                            >
                                                <MapPin size={14} />
                                                {(end.lat && end.lng) ? 'Localização Vinculada' : 'Vincular Local no Mapa'}
                                            </button>

                                            {(end.lat && end.lng) && (
                                                <button
                                                    className="chip"
                                                    style={{ border: 'none', color: '#F85149', fontSize: '11px' }}
                                                    onClick={() => {
                                                        updateEndereco(idx, 'lat', null)
                                                        updateEndereco(idx, 'lng', null)
                                                    }}
                                                >
                                                    Remover PIN
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {end.lat && (
                                        <div style={{ fontSize: '10px', color: '#8B949E', marginTop: '12px', fontFamily: 'IBM Plex Mono' }}>
                                            Coordenadas: {end.lat.toFixed(6)}, {end.lng.toFixed(6)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}>Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            backgroundColor: '#F78166', color: 'white', border: 'none',
                            padding: '12px 32px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
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
                        backgroundColor: '#161B22', border: '1px solid #30363D',
                        borderRadius: '8px', width: '600px', padding: '24px'
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
                        <div style={{ height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
                            <MapContainer center={[-10.1843, -48.3336]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                {coords && <ChangeMapView center={coords} />}
                                <MapEvents />
                            </MapContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setMapOpen(false)} style={{
                                backgroundColor: '#F78166', color: 'white', border: 'none',
                                padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
                            }}>
                                Confirmar localização
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
