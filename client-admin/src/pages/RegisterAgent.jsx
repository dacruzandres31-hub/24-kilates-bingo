import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, User, Mail, Lock, Shield, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function RegisterAgent() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const referralCode = searchParams.get('ref');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '', // Optional but good for UI
        fullName: ''
    });

    const [referringAgent, setReferringAgent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Check referral code on mount
    useEffect(() => {
        if (referralCode) {
            checkReferralCode(referralCode);
        }
    }, [referralCode]);

    const checkReferralCode = async (code) => {
        try {
            // We don't have a public endpoint to check referral code details specifically,
            // but we can infer it works if the registration succeeds.
            // However, for UX, it would be nice to show "Invited by: Andy".
            // Since we don't have a specific public endpoint for this, we'll skip the name lookup
            // unless we want to add one. For now, we'll just show the code.
            setReferringAgent({ code });
        } catch (err) {
            console.error('Error checking referral:', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            await axios.post('/api/auth/register', {
                username: formData.username,
                password: formData.password,
                role: 'agente',
                ref: referralCode,
                // email and fullName are not in the base schema but good to have if we expand
            });

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.error || 'Error al registrar la cuenta. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">¡Cuenta Creada!</h2>
                    <p className="text-slate-400 mb-8">
                        Tu cuenta de Agente ha sido registrada exitosamente.
                        <br />Redirigiendo al login...
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all"
                    >
                        Iniciar Sesión <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Logo/Brand Area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4 transform rotate-3">
                        <Briefcase size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Portal de Agentes</h1>
                    <p className="text-purple-200/60 mt-2">Únete a la red de 24K Bingo</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">

                    {referralCode && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                            <Shield className="text-indigo-400 shrink-0" size={20} />
                            <div>
                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wide">Invitación Especial</p>
                                <p className="text-slate-300 text-sm">Registrándote con el código: <span className="text-white font-mono font-bold">{referralCode}</span></p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 block">Nombre de Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Elige tu usuario"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 block">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 block">Confirmar</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? 'Creando Cuenta...' : 'Registrar Cuenta de Agente'}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-slate-500 text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                            Iniciar Sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
