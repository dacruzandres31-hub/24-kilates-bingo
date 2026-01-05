import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaWhatsapp, FaCheck, FaTimes, FaBell, FaBellSlash, FaMoon, FaPaperPlane } from 'react-icons/fa';
import './WhatsAppSettings.css';

const WhatsAppSettings = ({ userRole = 'jugador' }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [step, setStep] = useState('initial'); // initial, verify, verified
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const getToken = () => {
    return localStorage.getItem('playerToken') || localStorage.getItem('token');
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/whatsapp/settings`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (response.data.success && response.data.settings) {
        setSettings(response.data.settings);
        setPhoneInput(response.data.settings.phone_number || '');
        
        if (response.data.settings.phone_verified) {
          setStep('verified');
        } else if (response.data.settings.phone_number) {
          setStep('verify');
        }
      }
    } catch (err) {
      console.error('Error cargando configuración WhatsApp:', err);
      setError('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async () => {
    if (!phoneInput || phoneInput.length < 10) {
      setMessage({ type: 'error', text: 'Ingresa un número válido' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/whatsapp/verify/request`,
        { phoneNumber: phoneInput },
        { headers: { Authorization: `Bearer ${getToken()}` }}
      );

      if (response.data.success) {
        setStep('verify');
        setMessage({ type: 'success', text: '¡Código enviado! Revisa tu WhatsApp 📱' });
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Error enviando código' 
      });
    } finally {
      setSaving(false);
    }
  };

  const verifyCode = async () => {
    if (!codeInput || codeInput.length !== 6) {
      setMessage({ type: 'error', text: 'Ingresa el código de 6 dígitos' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/whatsapp/verify/confirm`,
        { code: codeInput },
        { headers: { Authorization: `Bearer ${getToken()}` }}
      );

      if (response.data.success) {
        setStep('verified');
        setMessage({ type: 'success', text: '¡WhatsApp verificado! 🎉' });
        loadSettings();
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Código inválido' 
      });
    } finally {
      setSaving(false);
    }
  };

  const unlinkWhatsApp = async () => {
    if (!window.confirm('¿Seguro que deseas desvincular tu WhatsApp?')) return;

    setSaving(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/whatsapp/unlink`,
        { headers: { Authorization: `Bearer ${getToken()}` }}
      );
      
      setSettings(null);
      setPhoneInput('');
      setCodeInput('');
      setStep('initial');
      setMessage({ type: 'success', text: 'WhatsApp desvinculado' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al desvincular' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = async (key, value) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/whatsapp/preferences`,
        { [key]: value },
        { headers: { Authorization: `Bearer ${getToken()}` }}
      );
      
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Error actualizando preferencia:', err);
    }
  };

  const sendTestMessage = async () => {
    setSaving(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/whatsapp/test`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` }}
      );
      
      if (response.data.success) {
        setMessage({ type: 'success', text: '¡Mensaje de prueba enviado! 📱' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error enviando mensaje de prueba' });
    } finally {
      setSaving(false);
    }
  };

  // Preferencias según rol
  const getPreferencesForRole = () => {
    const commonPrefs = [
      { key: 'notify_balance_update', label: '💰 Cambios de balance', icon: '💰' },
      { key: 'notify_security_events', label: '🔒 Alertas de seguridad', icon: '🔒' }
    ];

    if (userRole === 'jugador') {
      return [
        { key: 'notify_card_purchase', label: '🎫 Compra de cartones', icon: '🎫' },
        { key: 'notify_almost_win', label: '🔥 Casi-victoria (1-2 números)', icon: '🔥' },
        { key: 'notify_prize_won', label: '🏆 Premios ganados', icon: '🏆' },
        { key: 'notify_game_reminder', label: '⏰ Recordatorio de sorteos', icon: '⏰' },
        { key: 'notify_deposit_received', label: '💵 Depósitos recibidos', icon: '💵' },
        ...commonPrefs
      ];
    }

    if (userRole === 'agente') {
      return [
        { key: 'notify_commission', label: '💵 Comisiones ganadas', icon: '💵' },
        { key: 'notify_new_player', label: '👤 Nuevos jugadores', icon: '👤' },
        { key: 'notify_daily_summary', label: '📊 Resumen diario', icon: '📊' },
        { key: 'notify_withdrawal_request', label: '📤 Solicitudes de retiro', icon: '📤' },
        ...commonPrefs
      ];
    }

    // Superadmin
    return [
      { key: 'notify_system_alerts', label: '⚠️ Alertas del sistema', icon: '⚠️' },
      { key: 'notify_large_withdrawals', label: '💸 Retiros grandes', icon: '💸' },
      { key: 'notify_daily_summary', label: '📊 Resumen diario', icon: '📊' },
      ...commonPrefs
    ];
  };

  if (loading) {
    return (
      <div className="whatsapp-settings loading">
        <div className="loading-spinner"></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="whatsapp-settings">
      <div className="whatsapp-header">
        <FaWhatsapp className="whatsapp-icon" />
        <div>
          <h3>WhatsApp 24K Premium</h3>
          <p>Recibe notificaciones en tiempo real</p>
        </div>
      </div>

      {message.text && (
        <div className={`whatsapp-message ${message.type}`}>
          {message.type === 'success' ? <FaCheck /> : <FaTimes />}
          {message.text}
        </div>
      )}

      {/* PASO 1: Ingresar número */}
      {step === 'initial' && (
        <div className="whatsapp-step">
          <label>Número de WhatsApp</label>
          <div className="phone-input-group">
            <span className="country-code">+54</span>
            <input
              type="tel"
              placeholder="11 1234-5678"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
              maxLength={15}
            />
          </div>
          <button 
            className="btn-whatsapp primary"
            onClick={requestVerification}
            disabled={saving || phoneInput.length < 10}
          >
            {saving ? 'Enviando...' : '📱 Enviar Código de Verificación'}
          </button>
        </div>
      )}

      {/* PASO 2: Verificar código */}
      {step === 'verify' && (
        <div className="whatsapp-step">
          <p className="verification-info">
            Enviamos un código de 6 dígitos a <strong>+54 {phoneInput}</strong>
          </p>
          <input
            type="text"
            placeholder="Código de 6 dígitos"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="code-input"
            maxLength={6}
          />
          <div className="verification-buttons">
            <button 
              className="btn-whatsapp primary"
              onClick={verifyCode}
              disabled={saving || codeInput.length !== 6}
            >
              {saving ? 'Verificando...' : '✓ Verificar'}
            </button>
            <button 
              className="btn-whatsapp secondary"
              onClick={() => { setStep('initial'); setCodeInput(''); }}
            >
              Cambiar número
            </button>
          </div>
          <button 
            className="btn-resend"
            onClick={requestVerification}
            disabled={saving}
          >
            ¿No recibiste el código? Reenviar
          </button>
        </div>
      )}

      {/* PASO 3: Verificado - Mostrar preferencias */}
      {step === 'verified' && settings && (
        <div className="whatsapp-verified">
          <div className="verified-badge">
            <FaCheck className="check-icon" />
            <span>WhatsApp Verificado</span>
            <span className="phone-number">+54 {settings.phone_number}</span>
          </div>

          <div className="preferences-section">
            <h4><FaBell /> Notificaciones</h4>
            <p className="preferences-desc">
              Elige qué notificaciones quieres recibir:
            </p>

            <div className="preferences-list">
              {getPreferencesForRole().map(pref => (
                <label key={pref.key} className="preference-item">
                  <span>{pref.label}</span>
                  <input
                    type="checkbox"
                    checked={settings[pref.key] !== false}
                    onChange={(e) => updatePreference(pref.key, e.target.checked)}
                  />
                  <span className="toggle-switch"></span>
                </label>
              ))}
            </div>
          </div>

          <div className="quiet-hours-section">
            <h4><FaMoon /> Horario Silencioso</h4>
            <p>No recibir notificaciones entre:</p>
            <div className="time-inputs">
              <input
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
              />
              <span>y</span>
              <input
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
              />
            </div>
          </div>

          <div className="whatsapp-actions">
            <button 
              className="btn-whatsapp test"
              onClick={sendTestMessage}
              disabled={saving}
            >
              <FaPaperPlane /> Enviar Mensaje de Prueba
            </button>
            <button 
              className="btn-whatsapp danger"
              onClick={unlinkWhatsApp}
              disabled={saving}
            >
              <FaTimes /> Desvincular WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
