'use client'

import { useState } from 'react'
import { Heart, Loader2, CheckCircle2, Gift, Mail, FileText, MessageSquare } from 'lucide-react'
import { submeterDonativo } from '@/actions/donativo-actions'

interface Fundo {
    id: number
    nome: string
}

export default function FormDonativo({ tenantSlug, fundos }: { tenantSlug: string; fundos: Fundo[] }) {
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [referencia, setReferencia] = useState('')
    const [erro, setErro] = useState('')
    const [valorCustom, setValorCustom] = useState('')
    const [valorSelecionado, setValorSelecionado] = useState<number | null>(null)
    const [formaPagamento, setFormaPagamento] = useState('MBWAY')
    const [anonimo, setAnonimo] = useState(false)

    const valoresPreDefinidos = [10, 20, 50, 100]

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErro('')
        setLoading(true)

        const form = e.currentTarget
        const formData = new FormData(form)

        // Set valor
        const valor = valorSelecionado || parseFloat(valorCustom)
        if (!valor || valor <= 0) {
            setErro('Selecione ou insira um valor.')
            setLoading(false)
            return
        }
        formData.set('valor', String(valor))
        formData.set('forma_pagamento', formaPagamento)
        formData.set('anonimo', String(anonimo))

        const res = await submeterDonativo(tenantSlug, formData)

        if (res.error) {
            setErro(res.error)
        } else if (res.success && res.referencia) {
            setReferencia(res.referencia)
            setSucesso(true)
        }

        setLoading(false)
    }

    if (sucesso) {
        return (
            <div className="text-center py-12 px-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Donativo registado!</h2>
                <p className="text-gray-600 mb-6">Obrigado pela sua generosidade.</p>

                <div className="bg-gray-50 rounded-xl p-6 max-w-sm mx-auto mb-8">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Referencia</p>
                    <p className="text-lg font-mono font-bold text-gray-900 break-all">{referencia}</p>
                </div>

                {formaPagamento === 'TRANSFERENCIA' && (
                    <div className="bg-blue-50 rounded-xl p-6 max-w-sm mx-auto mb-8 text-left">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Instrucoes de pagamento:</p>
                        <p className="text-sm text-blue-800">
                            Faca a transferencia bancaria e indique a referencia <strong>{referencia}</strong> no descritivo.
                            O donativo sera confirmado apos verificacao.
                        </p>
                    </div>
                )}

                {formaPagamento === 'MBWAY' && (
                    <div className="bg-blue-50 rounded-xl p-6 max-w-sm mx-auto mb-8 text-left">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Pagamento MBWay:</p>
                        <p className="text-sm text-blue-800">
                            Sera contactado para confirmar o pagamento via MBWay.
                            Use a referencia <strong>{referencia}</strong> para identificacao.
                        </p>
                    </div>
                )}

                <button
                    onClick={() => { setSucesso(false); setReferencia(''); setValorSelecionado(null); setValorCustom('') }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                    Fazer outro donativo
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 px-1">
            {/* Nome */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo *</label>
                <input
                    name="nome_doador"
                    required
                    disabled={anonimo}
                    placeholder="O seu nome"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-100"
                />
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Mail size={14} className="inline mr-1" />Email (opcional)
                </label>
                <input
                    name="email_doador"
                    type="email"
                    disabled={anonimo}
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-100"
                />
            </div>

            {/* NIF */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <FileText size={14} className="inline mr-1" />NIF (opcional, para recibo)
                </label>
                <input
                    name="nif_doador"
                    disabled={anonimo}
                    placeholder="123456789"
                    maxLength={9}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-100"
                />
            </div>

            {/* Valor */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Valor do donativo *</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {valoresPreDefinidos.map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => { setValorSelecionado(v); setValorCustom('') }}
                            className={`py-3 rounded-xl text-sm font-bold transition-all ${
                                valorSelecionado === v
                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {v}&euro;
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Outro valor"
                        value={valorCustom}
                        onChange={e => { setValorCustom(e.target.value); setValorSelecionado(null) }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">&euro;</span>
                </div>
            </div>

            {/* Fundo */}
            {fundos.length > 0 && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Destinar a um fundo (opcional)</label>
                    <select
                        name="fundo_id"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="">Fundo Geral</option>
                        {fundos.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Forma de pagamento */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Forma de pagamento *</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setFormaPagamento('MBWAY')}
                        className={`py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            formaPagamento === 'MBWAY'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        MBWay
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormaPagamento('TRANSFERENCIA')}
                        className={`py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            formaPagamento === 'TRANSFERENCIA'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Transferencia
                    </button>
                </div>
            </div>

            {/* Anonimo */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <input
                    type="checkbox"
                    id="anonimo"
                    checked={anonimo}
                    onChange={e => setAnonimo(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="anonimo" className="text-sm text-gray-700 font-medium cursor-pointer">
                    Donativo anonimo
                </label>
            </div>

            {/* Recorrente */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <input
                    type="checkbox"
                    name="recorrente"
                    id="recorrente"
                    value="true"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="recorrente" className="text-sm text-gray-700 font-medium cursor-pointer">
                    Donativo mensal (recorrente)
                </label>
            </div>

            {/* Mensagem */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <MessageSquare size={14} className="inline mr-1" />Mensagem (opcional)
                </label>
                <textarea
                    name="mensagem"
                    rows={3}
                    placeholder="Uma palavra de encorajamento..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
            </div>

            {/* Erro */}
            {erro && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm font-medium">
                    {erro}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
                {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> A processar...</>
                ) : (
                    <><Heart size={18} /> Fazer donativo</>
                )}
            </button>
        </form>
    )
}
