
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

const ARG_BANKS = [
    'Mercado Pago',
    'Ualá',
    'Brubank',
    'Banco Nación',
    'Banco Provincia',
    'Banco Galicia',
    'Banco Santander',
    'Banco BBVA',
    'Banco Macro',
    'Banco Patagonia',
    'Banco Hipotecario',
    'Banco Ciudad',
    'Banco Comafi',
    'Banco Supervielle',
    'Banco Itaú',
    'Lemon Cash',
    'Belo',
    'Otro'
];

export default function PaymentAccountsPanel() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [selectedBank, setSelectedBank] = useState('Mercado Pago');
    const [customBank, setCustomBank] = useState('');
    const [formData, setFormData] = useState({
        alias: '',
        cbu: '',
        bank_name: 'Mercado Pago',
        holder_name: '',
        daily_limit: 500000
    });

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const { data } = await axios.get(`${API_URL}/api/admin/payment-accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(data.data || []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validar CBU si se proporciona
        if (formData.cbu && formData.cbu.length !== 22) {
            alert('❌ El CBU debe tener exactamente 22 dígitos');
            return;
        }
        
        try {
            const token = localStorage.getItem('adminToken');

            const finalBankName = selectedBank === 'Otro' ? customBank : selectedBank;
            const payload = { ...formData, bank_name: finalBankName };

            if (editingAccount) {
                await axios.put(`${API_URL}/api/admin/payment-accounts/${editingAccount.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/api/admin/payment-accounts`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            setEditingAccount(null);
            resetForm();
            fetchAccounts();
        } catch (error) {
            alert('Error guardando cuenta: ' + (error.response?.data?.message || error.message));
        }
    };

    const resetForm = () => {
        setFormData({
            alias: '',
            cbu: '',
            bank_name: 'Mercado Pago',
            holder_name: '',
            daily_limit: 500000
        });
        setSelectedBank('Mercado Pago');
        setCustomBank('');
    };

    const handleEdit = (acc) => {
        setEditingAccount(acc);
        setFormData({
            alias: acc.alias,
            cbu: acc.cbu,
            bank_name: acc.bank_name,
            holder_name: acc.holder_name,
            daily_limit: acc.daily_limit
        });

        if (ARG_BANKS.includes(acc.bank_name)) {
            setSelectedBank(acc.bank_name);
            setCustomBank('');
        } else {
            setSelectedBank('Otro');
            setCustomBank(acc.bank_name);
        }

        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta cuenta?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/api/admin/payment-accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAccounts();
        } catch (error) {
            alert('Error eliminando: ' + (error.response?.data?.message || error.message));
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('adminToken');
            // Nota: El backend usa PUT para actualizar el estado completo por ahora
            await axios.put(`${API_URL}/api/admin/payment-accounts/${id}`, {
                ...accounts.find(a => a.id === id),
                is_active: !currentStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAccounts();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const calculateProgress = (current, limit) => {
        const percent = (current / limit) * 100;
        return Math.min(100, Math.max(0, percent));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div>
                    <h3 className="text-xl font-bold text-white">💳 Cuentas de Cobro</h3>
                    <p className="text-gray-400 text-sm">Gestiona los Alias/CBU para la rotación automática</p>
                </div>
                <button
                    onClick={() => {
                        setEditingAccount(null);
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} />
                    Nueva Cuenta
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando cuentas...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((acc) => {
                        const progress = calculateProgress(acc.current_daily_volume, acc.daily_limit);
                        const isFull = progress >= 100;

                        return (
                            <div key={acc.id} className={`bg-gray-900 border ${acc.is_active ? 'border-gray-700' : 'border-red-900/50 opacity-75'} rounded-lg p-5 relative overflow-hidden`}>

                                {/* Status Badge */}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(acc)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(acc.id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-lg font-bold text-white mb-1">{acc.alias}</h4>
                                    <p className="text-sm text-gray-400 break-words">{acc.bank_name} • {acc.holder_name}</p>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Cupo Diario Usado</span>
                                        <span className={`${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                                            ${Number(acc.current_daily_volume).toLocaleString()} / ${Number(acc.daily_limit).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${acc.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-xs text-gray-400">{acc.is_active ? 'Activa' : 'Inactiva'}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleActive(acc.id, acc.is_active)}
                                        className={`text-xs px-3 py-1 rounded border ${acc.is_active
                                            ? 'border-red-800 text-red-400 hover:bg-red-900/20'
                                            : 'border-emerald-800 text-emerald-400 hover:bg-emerald-900/20'
                                            }`}
                                    >
                                        {acc.is_active ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10001] p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            {editingAccount ? '📝 Editar Cuenta' : '➕ Nueva Cuenta'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Titular (Nombre Completo)</label>
                                <input
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all"
                                    value={formData.holder_name}
                                    onChange={e => setFormData({ ...formData, holder_name: e.target.value })}
                                    required
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Banco / Billetera</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all appearance-none"
                                        value={selectedBank}
                                        onChange={e => setSelectedBank(e.target.value)}
                                    >
                                        {ARG_BANKS.map(bank => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alias</label>
                                    <input
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all"
                                        value={formData.alias}
                                        onChange={e => setFormData({ ...formData, alias: e.target.value })}
                                        required
                                        placeholder="mi.alias.pago"
                                    />
                                </div>
                            </div>

                            {selectedBank === 'Otro' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre de Banco Personalizado</label>
                                    <input
                                        className="w-full bg-gray-900 border border-emerald-600/50 rounded-lg p-3 text-white outline-none"
                                        value={customBank}
                                        onChange={e => setCustomBank(e.target.value)}
                                        required={selectedBank === 'Otro'}
                                        placeholder="Ej: Banco del Sol"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">CBU / CVU (22 dígitos)</label>
                                <input
                                    className={`w-full bg-gray-900 border rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all ${
                                        formData.cbu && formData.cbu.length !== 22 ? 'border-red-500' : 'border-gray-600'
                                    }`}
                                    value={formData.cbu}
                                    onChange={e => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 22);
                                        setFormData({ ...formData, cbu: value });
                                    }}
                                    placeholder="0000000000000000000000"
                                    maxLength={22}
                                    pattern="\d{22}"
                                />
                                {formData.cbu && formData.cbu.length !== 22 && (
                                    <p className="text-xs text-red-400 mt-1">⚠️ El CBU debe tener exactamente 22 dígitos ({formData.cbu.length}/22)</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 text-emerald-400">Límite Diario ($)</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-emerald-600/30 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all"
                                    value={formData.daily_limit}
                                    onChange={e => setFormData({ ...formData, daily_limit: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1 italic">La cuenta se desactivará temporalmente al llegar a este monto acumulado en el día.</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 hover:bg-gray-700 text-gray-300 rounded-lg transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all"
                                >
                                    {editingAccount ? 'Actualizar' : 'Crear Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
