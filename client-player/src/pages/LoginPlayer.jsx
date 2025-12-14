import React, { useState } from 'react';
import axios from 'axios';

export default function LoginPlayer({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpiar errores al escribir
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        username: formData.username,
        password: formData.password
      });

      const { token, user } = response.data;

      // Verificar que sea jugador
      if (user.role !== 'jugador') {
        setError('Este acceso es solo para jugadores. Admins deben usar el panel de administración.');
        setLoading(false);
        return;
      }

      // Guardar información del usuario
      localStorage.setItem('playerToken', token);
      localStorage.setItem('playerUser', JSON.stringify(user));
      
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.message || 'Error de autenticación');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
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
      // Registrar nuevo jugador
      const response = await axios.post('/api/auth/register', {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        role: 'jugador'
      });

      const { token, user } = response.data;

      // Guardar información del usuario
      localStorage.setItem('playerToken', token);
      localStorage.setItem('playerUser', JSON.stringify(user));
      
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la cuenta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo y Título */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-600 rounded-full blur-2xl opacity-50"></div>
              <img 
                src="/logo.png" 
                alt="Bingo 24K" 
                className="h-32 w-auto object-contain relative z-10"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent mb-2">
            Bingo 24K
          </h1>
          <p className="text-xl text-slate-300">
            {isRegistering ? '¡Únete a la diversión!' : '¡Bienvenido de vuelta!'}
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 animate-shake">
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                placeholder="TuNombreDeUsuario"
                required
                autoComplete="username"
              />
            </div>

            {/* Email (solo en registro) */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gold-400 transition-colors"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (solo en registro) */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-900 font-bold rounded-lg shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRegistering ? 'Creando cuenta...' : 'Iniciando sesión...'}
                </span>
              ) : (
                isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setFormData({
                  username: '',
                  password: '',
                  confirmPassword: '',
                  email: ''
                });
              }}
              className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
            >
              {isRegistering ? (
                <>¿Ya tienes cuenta? Inicia sesión aquí</>
              ) : (
                <>¿No tienes cuenta? Regístrate aquí</>
              )}
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              Al registrarte, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>

        {/* Footer decorativo */}
        <div className="text-center text-slate-500 text-sm">
          <p>© 2025 Bingo 24K - El mejor bingo online</p>
        </div>
      </div>
    </div>
  );
}
