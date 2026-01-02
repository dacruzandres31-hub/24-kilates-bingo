import React, { useState, useEffect } from 'react';
import { Copy, Users, Gift, ChevronRight, Share2, CheckCircle, Trophy, TrendingUp } from 'lucide-react';
import axios from 'axios';

const MyReferralsPanel = ({ userData }) => {
    const [referralCode, setReferralCode] = useState('');
    const [referredUsers, setReferredUsers] = useState([]);
    const [rewardsHistory, setRewardsHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('network'); // 'network' or 'rewards'
    const [stats, setStats] = useState({
        totalEarned: 0,
        pending: 0,
        registered: 0,
        levels: { l1: 0, l2: 0, l3: 0, l4: 0 }
    });
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) {
            setReferralCode(userData.referral_code);
            fetchReferralData();
        }
    }, [userData]);

    const fetchReferralData = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const referralsRes = await axios.get('/api/referrals/my-referrals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setReferredUsers(referralsRes.data.referrals || []);
            setRewardsHistory(referralsRes.data.rewards || []);
            setStats(referralsRes.data.stats || {
                totalEarned: 0,
                pending: 0,
                registered: 0,
                levels: { l1: 0, l2: 0, l3: 0, l4: 0 }
            });
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnWhatsApp = () => {
        const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
        const text = encodeURIComponent(`¡Únete a 24K Bingo y gana conmigo! Regístrate aquí: ${referralLink}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 overflow-hidden">
            {/* Header / Promo Card */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-8 flex items-center justify-between shadow-lg">
                <div className="text-white">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Gift className="text-yellow-400" /> Mis Referidos e Invitaciones
                    </h2>
                    <p className="text-purple-100 mt-2 max-w-lg">
                        Invita amigos directamente a través de tu link personal. Por cada primera compra de un referido directo, recibirás 5 cartones Plata ¡Gratis!
                    </p>
                </div>
                <div className="hidden lg:block">
                    <Trophy size={80} className="text-yellow-400/30 -rotate-12" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm transition-all hover:border-indigo-500/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Users className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Red Total</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{stats.registered}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm transition-all hover:border-emerald-500/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <TrendingUp className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Cartones Ganados</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{stats.totalEarned}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 md:col-span-2">
                    <div className="flex items-center justify-between gap-4 h-full">
                        <div className="flex-1 space-y-2">
                            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Link de Invitación</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={`${window.location.origin}/register?ref=${referralCode}`}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 w-full focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className={`p-2 rounded-lg transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                                <button
                                    onClick={shareOnWhatsApp}
                                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Network Level Summary */}
            <div className="grid grid-cols-4 gap-2 mb-8 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                {[1, 2, 3, 4].map(lvl => (
                    <div key={lvl} className="text-center p-2 border-r last:border-0 border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Nivel {lvl}</p>
                        <p className="text-lg font-bold text-slate-200">{stats.levels?.[`l${lvl}`] || 0}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('network')}
                    className={`px-6 py-3 font-bold text-sm transition-all relative ${activeTab === 'network' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Mi Red Directa
                </button>
                <button
                    onClick={() => setActiveTab('rewards')}
                    className={`px-6 py-3 font-bold text-sm transition-all relative ${activeTab === 'rewards' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Historial de Premios
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500 animate-pulse">
                        Cargando información estratégica...
                    </div>
                ) : activeTab === 'network' ? (
                    <div className="space-y-4">
                        {referredUsers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {referredUsers.map((ref, idx) => (
                                    <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:bg-slate-800/60 transition-all">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold">{ref.username}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ref.level === 1 ? 'bg-indigo-500/20 text-indigo-400' :
                                                        ref.level === 2 ? 'bg-blue-500/20 text-blue-400' :
                                                            ref.level === 3 ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                                    }`}>N{ref.level}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Registrado el {new Date(ref.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700/50">
                                <Users size={40} className="mx-auto text-slate-600 mb-3 opacity-50" />
                                <p className="text-slate-400 font-medium">Aún no tienes referidos personales.</p>
                                <p className="text-slate-600 text-sm mt-1">Comparte tu link para empezar a ganar premios.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rewardsHistory.length > 0 ? (
                            <div className="overflow-hidden rounded-xl border border-slate-800">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Referido</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-right">Premio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {rewardsHistory.map((reward, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-slate-300 text-sm font-medium">{reward.source_username}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {reward.status === 'credited'
                                                        ? new Date(reward.credited_at).toLocaleDateString()
                                                        : new Date(reward.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${reward.status === 'credited' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {reward.status === 'credited' ? 'COBRADO' : 'EN COLA'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-emerald-400 font-bold text-xs">+5 PLATA</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-700/50">
                                <Gift size={40} className="mx-auto text-slate-600 mb-3 opacity-50" />
                                <p className="text-slate-400 font-medium">Ningún premio generado aún.</p>
                                <p className="text-slate-600 text-sm mt-1">Gana 5 cartones Plata cuando tus referidos directos realicen su primer depósito.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyReferralsPanel;
