import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertCircle, CheckCircle2, MessageSquare, Phone, Settings } from 'lucide-react';
import WhatsAppHistoryPanel from './WhatsAppHistoryPanel';

const WhatsAppConfigPanel = ({ userData }) => {
    const [config, setConfig] = useState({
        gateway_type: 'evolution_api',
        api_url: '',
        api_key: '',
        instance_name: '',
        is_active: false,
        from_number: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/whatsapp/config', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.config) {
                setConfig(res.data.config);
            }
        } catch (error) {
            console.error('Error fetching WA config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: null, message: '' });

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/api/whatsapp/config', config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ type: 'success', message: 'Configuración guardada correctamente' });
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Error guardando configuración' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando configuración...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                            <MessageSquare className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Configuración de WhatsApp</h2>
                            <p className="text-sm text-slate-400">Conecta tu propio Gateway para enviar comprobantes automáticamente</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-8">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${config.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                            <span className="font-bold text-slate-200">Estado del Gateway</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.is_active}
                                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Gateway Settings */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Configuración de API
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Tipo de Gateway</label>
                                    <select
                                        value={config.gateway_type}
                                        onChange={(e) => setConfig({ ...config, gateway_type: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500/50 outline-none transition-all cursor-not-allowed"
                                        disabled
                                    >
                                        <option value="evolution_api">Evolution API (v2.x)</option>
                                    </select>
                                    <p className="mt-1.5 text-[10px] text-slate-500 italic">Por ahora solo soportamos Evolution API. Próximamente WPPConnect.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">URL de la API (Endpoint)</label>
                                    <input
                                        type="url"
                                        placeholder="https://tu-api.com"
                                        value={config.api_url}
                                        onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                        required={config.is_active}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">API Key (Token de Seguridad)</label>
                                    <input
                                        type="password"
                                        placeholder="Tu Global API Key"
                                        value={config.api_key}
                                        onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                        required={config.is_active}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre de Instancia</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Bingo24K_Andy"
                                        value={config.instance_name}
                                        onChange={(e) => setConfig({ ...config, instance_name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                        required={config.is_active}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Settings */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Detalles del Emisor
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Tu Número de WhatsApp</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 5491112345678"
                                        value={config.from_number}
                                        onChange={(e) => setConfig({ ...config, from_number: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                    />
                                    <p className="mt-1.5 text-[10px] text-slate-500">Número asociado a la instancia para envíos manuales alternativos.</p>
                                </div>

                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                                    <AlertCircle className="w-10 h-10 text-blue-400 shrink-0" />
                                    <div className="text-xs text-blue-300 leading-relaxed">
                                        <p className="font-bold mb-1">¿Cómo configurar?</p>
                                        <p>Para usar este sistema, necesitas tener un servidor con **Evolution API** instalado. Cada comprobante que generes se enviará automáticamente como una imagen desde tu cuenta conectada.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {status.type && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-200 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-sm font-medium">{status.message}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-4 border-t border-slate-700 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all transform active:scale-95"
                        >
                            {saving ? (
                                <>Cargando...</>
                            ) : (
                                <><Save className="w-5 h-5" /> Guardar Configuración</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* History Section */}
            <div className="mt-8">
                <WhatsAppHistoryPanel />
            </div>
        </div>
    );
};

export default WhatsAppConfigPanel;
